import { handlerAdapter, success } from '../utils/azure';
import { Bot } from "grammy";
import { Client } from "@notionhq/client";
import { NumberPropertyValue, SelectPropertyValue, DatePropertyValue, TitlePropertyValue, RichTextPropertyValue } from '@notionhq/client/build/src/api-types';
import { PagesRetrieveResponse } from '@notionhq/client/build/src/api-endpoints';

const bot = new Bot(process.env.BOT_TOKEN!);
const notion = new Client({
    auth: process.env.NOTION_TOKEN,
});

const parseTask = (content: string) => {
    const text = content;
    const match = /^\*\*\[(?<type>.+)\]\*\*(?<task>.*)\/\s\[NID\]\((?<nid>.+)\)/.exec(text);
    
    if (!match || !match.groups)
        throw new Error("No matches in item");

    const type = match.groups['type'];
    const task = match.groups['task'];
    const nid = match.groups['nid'];

    return { type, task, nid };
}

const isRepeating = (type: string) => 
    type === 'Daily' || type === 'Every two days' || type === 'Weekday' || type === 'Weekend' ||
    type === 'Weekly' || type === 'Biweekly' || type === 'Monthly' || type === 'Yearly';

const isQuest = (type: string) => 
    type === 'Quest';

const handleRepeating = async (page: PagesRetrieveResponse) => {
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

    return `Old to New values (MTCR-TC-TCR): ${maxInARow} => ${newMaxInARow}; ${timesCompleted} => ${newTimesCompleted}; ${timesCompletedInARow} => ${newTimesCompletedInARow}`
}

const handleQuest = async (page: PagesRetrieveResponse) => {
    const now = new Date();
    await notion.pages.update({ page_id: page.id, properties: {
        "Status": { select: { name: "COMPLETED" } } as SelectPropertyValue,
        "Completed on": { date: { start: now.toISOString() } } as DatePropertyValue,
    }, archived: false });

    return `Quest completed on ${now}`;
}

const handleTask = async (type: string, page: PagesRetrieveResponse) => {
    if (isRepeating(type))
        return handleRepeating(page);
    else if (isQuest(type))
        return handleQuest(page);
    return null;
}

const addToHistory = async (page: PagesRetrieveResponse, name: string, eventDescription: string) => {
    await notion.pages.create({ parent: { database_id: process.env.NOTION_DATABASE! }, properties: {
        "Name": { title: [ { text: { content: name}}] } as TitlePropertyValue,
        "Quest": { relation: [ { id: page.id } ] } as any,
        "Event description": { rich_text: [ { text: { content: eventDescription } } ] } as RichTextPropertyValue,
    }});
}

exports.handler = handlerAdapter(async ({ req }) => {
    try {
        if (req && req.body && req.body.event_data && req.body.event_name === 'item:completed') {
            const { type, task, nid } = parseTask(req.body.event_data.content);
            const questPage = await notion.pages.retrieve({ page_id: nid });
            
            const name = `Task completed ${req.body.event_data.id}`;
            const eventDescription = await handleTask(type, questPage);
            if (eventDescription) await addToHistory(questPage, name, eventDescription);

            const successMessage = `${name}:\n${task}`;
            await bot.api.sendMessage(process.env.USER_ID!, successMessage, { parse_mode: 'MarkdownV2'});
        }
    }
    catch(e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e)}`;
        await bot.api.sendMessage(process.env.USER_ID!, message);
    }
    
    return success('Message processed');
});
