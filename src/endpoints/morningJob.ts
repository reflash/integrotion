import { handlerAdapter, success } from '../utils/azure';
import { bot } from '../service/bot';
import { InputFile } from 'grammy';
import { stringToReadable } from '../utils';
import { createRandomQuests } from '../service/quests';
import { Page } from '@notionhq/client/build/src/api-types';
import { notionApi, todoist } from '../container';
import { getPageName } from '../service/notion';

const questIsPlannedForToday = async (pages: Page[]) => {
    const allTasks = await todoist.getAllTasks();
    const today = new Date().toISOString().substr(0,10);
    const todayTasks = allTasks.filter(t => t.due.date === today);
    const plannedPages = pages.filter(page => 
        todayTasks.some(t => t.content.includes(getPageName(page)))
    );

    return plannedPages;
}

exports.handler = handlerAdapter(async ({ req }) => {
    try {
        const quests = await notionApi.getQuestsByTag('random', questIsPlannedForToday);
        await Promise.all(notionApi.createQuestTask())
        await createRandomQuests();
    }
    catch(e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`;
        const stream = stringToReadable(message);
        await bot.api.sendDocument(process.env.USER_ID!, new InputFile(stream));
    }
    
    return success('Message processed');
});

