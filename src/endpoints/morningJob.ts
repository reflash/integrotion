import { Page } from '@notionhq/client/build/src/api-types';
import { InputFile } from 'grammy';
import { bot, questNotionService, questTodoistService, todoist } from '../container';
import { getPageName } from '../service/common';
import { Quest } from '../service/quests/types';
import { addTime, randomN, stringToReadable, todayDate } from '../utils';
import { handlerAdapter, success } from '../utils/azure';

const questIsPlannedForToday = async (pages: Page[]) => {
    const allTasks = await todoist.getAllTasks();
    const today = todayDate();
    const todayTasks = allTasks.filter(t => t.due.date === today);
    const plannedPages = pages.filter(page => todayTasks.some(t => t.content.includes(getPageName(page))));

    return plannedPages;
};

const createRandomQuests = async (quests: Quest[]) => {
    for (const { random, emoji, name } of quests) {
        const { group1Ids, group2Ids, group1Amount, group2Amount, startTime, group1Length, group2Length } = random!;
        const selectedGroup1 = randomN(group1Ids, group1Amount);
        const selectedGroup2 = randomN(group2Ids, group2Amount);

        const group1Quests = await Promise.all(selectedGroup1.map(questNotionService.getQuestById));
        const group2Quests = await Promise.all(selectedGroup2.map(questNotionService.getQuestById));

        const group1Names = await Promise.all(
            group1Quests.map((quest, i) =>
                questTodoistService.createQuestTask(quest, `today ${addTime(startTime, i * group1Length)}`, group1Length),
            ),
        );
        const group2Names = await Promise.all(
            group2Quests.map((quest, i) =>
                questTodoistService.createQuestTask(
                    quest,
                    `today ${addTime(startTime, group1Length * group1Amount + i * group2Length)}`,
                    group2Length,
                ),
            ),
        );

        await bot.api.sendMessage(
            process.env.USER_ID!,
            `Random quests for today\'s ${emoji} ${name} are:\n${[...group1Names, ...group2Names].join('\n')}`,
        );
    }
};

exports.handler = handlerAdapter(async ({ req }) => {
    try {
        const quests = await questNotionService.getQuestsByTag('random', questIsPlannedForToday);
        await createRandomQuests(quests);
    } catch (e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`;
        const stream = stringToReadable(message);
        await bot.api.sendDocument(process.env.USER_ID!, new InputFile(stream));
    }

    return success('Message processed');
});
