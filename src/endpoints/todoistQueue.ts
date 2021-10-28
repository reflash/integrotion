// tslint:disable: no-magic-numbers
import { DatePropertyValue, NumberPropertyValue, SelectPropertyValue } from '@notionhq/client/build/src/api-types';
import { achievementNotionService, bot, categoryNotionService, questNotionService, questTodoistService } from '../container';
import { isChest, isQuest, isRepeating } from '../service/quests/mappers';
import { parseTask, TaskParams } from '../service/quests/todoist';
import { Quest } from '../service/quests/types';
import { isGifImage, sleep } from '../utils';
import { handlerAdapter, success } from '../utils/azure';

const sendQuestMessage = async (quest: Quest, params: TaskParams) => {
    let message = `Task completed ${params.id}\n${quest.emoji} ${quest.name}\n${quest.description}`;
    if (quest.categoryId) {
        const category = await categoryNotionService.getCategoryById(quest.categoryId);
        message += `\nCategory: ${category.name}`;
    }

    // NOTE: use sendAnimation to send gifs (telegram doesn't process gifs via sendPhoto api)
    if (isGifImage(quest.pictureUrl)) return bot.api.sendAnimation(process.env.USER_ID!, quest.pictureUrl, { caption: message });
    return bot.api.sendPhoto(process.env.USER_ID!, quest.pictureUrl, { caption: message });
};

const handleRepeating = async (params: TaskParams) => {
    const quest = await questNotionService.getQuestById(params.nid);
    const { maxInARow, timesCompleted, timesCompletedInARow } = quest.repeating!;

    await questTodoistService.deleteTaskSubtasks(params.id);

    const newTimesCompleted = timesCompleted + 1;
    const newTimesCompletedInARow = timesCompletedInARow + 1;
    const newMaxInARow = maxInARow > newTimesCompletedInARow ? maxInARow : newTimesCompletedInARow;

    await questNotionService.updatePage(quest.id, {
        'Times completed': { number: newTimesCompleted } as NumberPropertyValue,
        'Times completed in a row': { number: newTimesCompletedInARow } as NumberPropertyValue,
        'Max times completed in a row': { number: newMaxInARow } as NumberPropertyValue,
    });

    const name = `Task completed ${params.id}`;
    await questNotionService.addToHistory(
        quest.id,
        name,
        `Old to New values (MTCR-TC-TCR): ${maxInARow} => ${newMaxInARow}; ${timesCompleted} => ${newTimesCompleted}; ${timesCompletedInARow} => ${newTimesCompletedInARow}`,
    );
    await sendQuestMessage(quest, params);
};

const handleQuest = async (params: TaskParams) => {
    const quest = await questNotionService.getQuestById(params.nid);
    const now = new Date();
    await questNotionService.updatePage(quest.id, {
        Status: { select: { name: 'COMPLETED' } } as SelectPropertyValue,
        'Completed on': { date: { start: now.toISOString() } } as DatePropertyValue,
    });

    const name = `Task completed ${params.id}`;
    await questNotionService.addToHistory(quest.id, name, `Quest completed on ${now}`);
    await sendQuestMessage(quest, params);
};

const handleChest = async (params: TaskParams) => {
    const chest = await questNotionService.getChestById(params.nid);
    const { actual, required, pictureUrl } = chest;
    const newActual = actual + 1;
    await questNotionService.updatePage(chest.id, {
        Actual: { number: newActual } as NumberPropertyValue,
    });

    if (newActual === required) {
        await bot.api.sendPhoto(process.env.USER_ID!, pictureUrl, {
            caption: "Hooray 🎉\n\nYou've received your weekly chest\nYou can open it tomorrow morning!",
        });
        await bot.api.sendMessage(process.env.USER_ID!, '🎉');
    } else {
        const percent = newActual / required;
        const progress = '▓'.repeat(Math.round(percent * 10)) + '░'.repeat(Math.round((1 - percent) * 10)) + ` ${newActual}/${required}`;
        await bot.api.sendMessage(process.env.USER_ID!, `You're one step closer to your weekly supply chest\n\n${progress}`);
        await bot.api.sendMessage(process.env.USER_ID!, '👏');
    }
};

const handleOther = async (params: TaskParams) => {
    const message = `Task completed ${params.id}\n${params.task}`;
    await bot.api.sendMessage(process.env.USER_ID!, message);
};

const handleTask = async (params: TaskParams) => {
    if (isRepeating(params.type)) return handleRepeating(params);
    else if (isQuest(params.type)) return handleQuest(params);
    else if (isChest(params.type)) return handleChest(params);

    return handleOther(params);
};

exports.handler = handlerAdapter(async ({ req }, itemAdded: any) => {
    try {
        if (itemAdded && itemAdded.event_data && itemAdded.event_name === 'item:completed') {
            const params = { id: itemAdded.event_data.id, ...parseTask(itemAdded.event_data.content) };
            await handleTask(params);
            await sleep(1100);

            const achievements = await achievementNotionService.getNewAchievements();
            for (const achievement of achievements) {
                await achievementNotionService.finalizeAchievement(achievement);
                await sleep(1100);
            }
        }
    } catch (e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e)}`;
        await bot.api.sendMessage(process.env.USER_ID!, message);
    }

    return success('Message processed');
});
