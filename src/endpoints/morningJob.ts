import { Page } from '@notionhq/client/build/src/api-types';
import { InputFile } from 'grammy';
import { bot, questNotionService, questTodoistService, todoist } from '../container';
import { getPageName } from '../service/common';
import { createRandomQuests } from '../service/quests';
import { stringToReadable, todayDate } from '../utils';
import { handlerAdapter, success } from '../utils/azure';

const questIsPlannedForToday = async (pages: Page[]) => {
    const allTasks = await todoist.getAllTasks();
    const today = todayDate();
    const todayTasks = allTasks.filter(t => t.due.date === today);
    const plannedPages = pages.filter(page => todayTasks.some(t => t.content.includes(getPageName(page))));

    return plannedPages;
};

exports.handler = handlerAdapter(async ({ req }) => {
    try {
        const quests = await questNotionService.getQuestsByTag('random', questIsPlannedForToday);
        await Promise.all(questTodoistService.createQuestTask());
        await createRandomQuests();
    } catch (e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`;
        const stream = stringToReadable(message);
        await bot.api.sendDocument(process.env.USER_ID!, new InputFile(stream));
    }

    return success('Message processed');
});

