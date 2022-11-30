import { InputFile } from 'grammy';
import { bot, questNotionService, questTodoistService, todoist } from '../container';
import { getPageName, goalCompletePicture, goalIncompletePicture } from '../service/common';
import { Quest } from '../service/quests/types';
import { addTime, randomN, stringToReadable, todayDate } from '../utils';
import { handlerAdapter, success } from '../utils/azure';
import { Page } from '../utils/types';

const questIsPlannedForToday = async (pages: Page[]) => {
    const allTasks = await todoist.getTasks();
    const today = todayDate();
    const todayTasks = allTasks.filter(t => t.due && t.due.date === today);
    const plannedPages = pages
        .map(page => ({ page, task: todayTasks.find(t => t.content.includes(getPageName(page))) }))
        .filter(({ task }) => task !== undefined)
        .filter(({ task }) => !allTasks.some(t => t.parentId === task!.id))
        .map(({ page }) => page);
    return plannedPages;
};

const getQuestTask = async (name: string) => {
    const allTasks = await todoist.getTasks();
    return allTasks.find(t => t.content.includes(name))!;
};

const createRandomQuests = async (quests: Quest[]) => {
    for (const { random, emoji, name } of quests) {
        const { id } = await getQuestTask(name);

        const { group1Ids, group2Ids, group1Amount, group2Amount, startTime, group1Length, group2Length } = random!;
        const selectedGroup1 = randomN(group1Ids, group1Amount);
        const selectedGroup2 = randomN(group2Ids, group2Amount);

        const group1Quests = await Promise.all(selectedGroup1.map(questNotionService.getQuestById));
        const group2Quests = await Promise.all(selectedGroup2.map(questNotionService.getQuestById));

        const group1Names = await Promise.all(
            group1Quests.map((quest, i) => questTodoistService.createQuestTask(quest, undefined, group1Length, id)),
        );
        const group2Names = await Promise.all(
            group2Quests.map((quest, i) => questTodoistService.createQuestTask(quest, undefined, group2Length, id)),
        );

        await bot.api.sendMessage(
            process.env.USER_ID!,
            `Random quests for today\'s ${emoji} ${name} are:\n${[...group1Names, ...group2Names].join('\n')}`,
        );
    }
};

const updateGoalProgress = async () => {
    const goalsWithSubgoals = await questNotionService.getVaultGoals();
    const goals = goalsWithSubgoals.filter(g => g.isGoal && g.active);
    const subgoals = goalsWithSubgoals.filter(g => !g.isGoal && g.active);

    for (const goal of goals) {
        const newName = `* ${goal.emoji} ${goal.progress} | **[Goal]** [${goal.name}](${goal.url})`;
        const taskId = await questTodoistService.getTaskIdByName(goal.name);
        await questTodoistService.updateTaskName(taskId, newName);
    }

    for (const subgoal of subgoals) {
        const goal = goals.find(g => g.id === subgoal.goalId)!;
        const completed = subgoal.required <= goal.actual;
        const coverUrl = completed ? goalCompletePicture : goalIncompletePicture;
        await questNotionService.updatePage(subgoal.id, {}, coverUrl);
    }
};

exports.handler = handlerAdapter(async ({ req }) => {
    try {
        const quests = await questNotionService.getQuestsByTag('random', questIsPlannedForToday);
        await createRandomQuests(quests);
        await updateGoalProgress();
    } catch (e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`;
        const stream = stringToReadable(message);
        await bot.api.sendDocument(process.env.USER_ID!, new InputFile(stream, `morningJob-error-${Date.now().toLocaleString()}`));
    }

    return success('Message processed');
});
