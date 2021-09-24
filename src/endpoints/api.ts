import { handlerAdapter, success } from '../utils/azure';
import { Bot } from "grammy";
import { Client } from "@notionhq/client";
import { NumberPropertyValue, SelectPropertyValue, DatePropertyValue, FormulaPropertyValue, TitlePropertyValue, RichTextPropertyValue } from '@notionhq/client/build/src/api-types';
import { PagesRetrieveResponse } from '@notionhq/client/build/src/api-endpoints';

type TaskParams = {
    id: string;
    task: string;
    type: string;
    nid: string;
};

const defaultAchievementPicture = 'https://tagn.files.wordpress.com/2016/06/rtdachi.jpg';

const bot = new Bot(process.env.BOT_TOKEN!);
const notion = new Client({
    auth: process.env.NOTION_TOKEN,
});

const parseTask = (content: string) => {
    const text = content;
    const match = /^\*\*\[(?<type>.+)\]\*\*(?<task>[^|]+)(\|\s\[NID\]\((?<nid>.+)\))?/.exec(text);
    
    if (!match || !match.groups)
        throw new Error("No matches in item");

    const type = match.groups['type'];
    const task = match.groups['task'].trim();
    const nid = match.groups['nid'];

    return { type, task, nid };
}

const isRepeating = (type: string) => 
    type === 'Daily' || type === 'Every two days' || type === 'Weekday' || type === 'Weekend' ||
    type === 'Weekly' || type === 'Biweekly' || type === 'Monthly' || type === 'Yearly';

const isQuest = (type: string) => 
    type === 'Quest';

const isChest = (type: string) => 
    type === 'Chest';

const handleRepeating = async (params: TaskParams) => {
    const page = await notion.pages.retrieve({ page_id: params.nid });
    const maxInARow = (page.properties['Max times completed in a row'] as NumberPropertyValue).number!;
    const timesCompleted = (page.properties['Times completed'] as NumberPropertyValue).number!;
    const timesCompletedInARow = (page.properties['Times completed in a row'] as NumberPropertyValue).number!;

    const newTimesCompleted = timesCompleted + 1;
    const newTimesCompletedInARow = timesCompletedInARow + 1;
    const newMaxInARow = maxInARow > newTimesCompletedInARow ? maxInARow : newTimesCompletedInARow;

    await notion.pages.update({ page_id: page.id, properties: {
        "Times completed": { number: newTimesCompleted } as NumberPropertyValue,
        "Times completed in a row": { number: newTimesCompletedInARow } as NumberPropertyValue,
        "Max times completed in a row": { number: newMaxInARow } as NumberPropertyValue,
    }, archived: false });

    const name = `Task completed ${params.id}`;
    const message = `${name}\n${params.task}`;
    await addToHistory(page, name, `Old to New values (MTCR-TC-TCR): ${maxInARow} => ${newMaxInARow}; ${timesCompleted} => ${newTimesCompleted}; ${timesCompletedInARow} => ${newTimesCompletedInARow}`);
    await bot.api.sendMessage(process.env.USER_ID!, message); 
}

const handleQuest = async (params: TaskParams) => {
    const page = await notion.pages.retrieve({ page_id: params.nid });
    const now = new Date();
    await notion.pages.update({ page_id: page.id, properties: {
        "Status": { select: { name: "COMPLETED" } } as SelectPropertyValue,
        "Completed on": { date: { start: now.toISOString() } } as DatePropertyValue,
    }, archived: false });
    
    const name = `Task completed ${params.id}`;
    const message = `${name}\n${params.task}`;
    await addToHistory(page, name, `Quest completed on ${now}`);
    await bot.api.sendMessage(process.env.USER_ID!, message);
}

const handleChest = async (params: TaskParams) => {
    const page = await notion.pages.retrieve({ page_id: params.nid });
    const coverUrl = page.cover?.type === 'file' ? page.cover.file.url : page.cover?.external.url;
    const actual = (page.properties['Actual'] as NumberPropertyValue).number!;
    const newActual = actual + 1;
    const required = (page.properties['Required'] as NumberPropertyValue).number!;
    await notion.pages.update({ page_id: page.id, properties: {
        "Actual": { number: newActual } as NumberPropertyValue
    }, archived: false });
    

    if (newActual === required) {
        await bot.api.sendPhoto(process.env.USER_ID!, coverUrl!, { caption: "Hooray 🎉\n\nYou've received your weekly chest\nYou can open it tomorrow morning!"});
        await bot.api.sendMessage(process.env.USER_ID!, '🎉');
    } else {
        const percent = (newActual) / required;
        const progress = '▓'.repeat(Math.round(percent * 10)) + '░'.repeat(Math.round((1 - percent) * 10)) + ` ${newActual}/${required}`;
        await bot.api.sendMessage(process.env.USER_ID!, `You're one step closer to your weekly supply chest\n\n${progress}`);
        await bot.api.sendMessage(process.env.USER_ID!, '👏');
    }
}

const handleOther = async (params: TaskParams) => {
    const message = `Task completed ${params.id}\n${params.task}`;
    await bot.api.sendMessage(process.env.USER_ID!, message);
}

const handleTask = async (params: TaskParams) => {
    if (isRepeating(params.type))
        return handleRepeating(params);
    else if (isQuest(params.type))
        return handleQuest(params);
    else if (isChest(params.type))
        return handleChest(params)
    
    return handleOther(params);
}

const addToHistory = async (page: PagesRetrieveResponse, name: string, eventDescription: string) => {
    await notion.pages.create({ parent: { database_id: process.env.HISTORY_NOTION_DATABASE! }, properties: {
        "Name": { title: [ { text: { content: name}}] } as TitlePropertyValue,
        "Quest": { relation: [ { id: page.id } ] } as any,
        "Event description": { rich_text: [ { text: { content: eventDescription } } ] } as RichTextPropertyValue,
    }});
}

const verifyAchievements = async () => {
    const achievements = await notion.databases.query({ database_id: process.env.ACHIEVEMENTS_NOTION_DATABASE!, 
        filter: { and: [ 
            { property: 'Completed', formula: { checkbox: { equals: true } as any} },
            { property: 'Achieved on', date: { is_empty: true }},
        ]} 
    });
    const now = new Date().toISOString().substr(0,10);

    for (const achievement of achievements.results) {
        await notion.pages.update({ page_id: achievement.id, properties: {
            "Achieved on": { date: { start: now } } as DatePropertyValue,
        }, archived: false });

        const achievementPoints = (achievement.properties['Achievement points (AP)'] as NumberPropertyValue).number!;
        const achievementText = `Yay 👏 🚀 You've received an achievement\n\nPoints earned: 🔰 ${achievementPoints}`
        if (achievement.icon?.type === 'file')
            await bot.api.sendPhoto(process.env.USER_ID!, achievement.icon.file.url!, { caption: achievementText });
        else if (achievement.icon?.type === 'external')
            await bot.api.sendPhoto(process.env.USER_ID!, achievement.icon.external.url!, { caption: achievementText });
        else if (achievement.icon?.type === 'emoji')
            await bot.api.sendPhoto(process.env.USER_ID!, defaultAchievementPicture, { caption: achievementText });

        await bot.api.sendMessage(process.env.USER_ID!, '🎉');
    }
}

exports.handler = handlerAdapter(async ({ req }) => {
    try {
        if (req && req.body && req.body.event_data && req.body.event_name === 'item:completed') {
            const params = { id: req.body.event_data.id, ...parseTask(req.body.event_data.content)};
            await handleTask(params);
            await verifyAchievements();
        }
    }
    catch(e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e)}`;
        await bot.api.sendMessage(process.env.USER_ID!, message);
    }
    
    return success('Message processed');
});
