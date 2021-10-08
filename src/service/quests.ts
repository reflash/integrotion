import { PagesRetrieveResponse } from "@notionhq/client/build/src/api-endpoints";
import { NumberPropertyValue, SelectPropertyValue, DatePropertyValue, TitlePropertyValue, RichTextPropertyValue, RelationPropertyValue } from "@notionhq/client/build/src/api-types";
import { TaskParams, defaultAchievementPicture, sleep, randomN, addTime } from "../utils";
import { bot } from "./bot";
import { notion } from "./notion";
import { createQuest, questIsPlannedForToday } from "./todoist";

const isRepeating = (type: string) => 
    type === 'Daily' || type === 'Every two days' || type === 'Weekday' || type === 'Weekend' ||
    type === 'Weekly' || type === 'Biweekly' || type === 'Monthly' || type === 'Yearly' || type === 'Repeating';

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
    await addToHistory(page, name, `Old to New values (MTCR-TC-TCR): ${maxInARow} => ${newMaxInARow}; ${timesCompleted} => ${newTimesCompleted}; ${timesCompletedInARow} => ${newTimesCompletedInARow}`);
    await sendQuestMessage(page, params);
}

const handleQuest = async (params: TaskParams) => {
    const page = await notion.pages.retrieve({ page_id: params.nid });
    const now = new Date();
    await notion.pages.update({ page_id: page.id, properties: {
        "Status": { select: { name: "COMPLETED" } } as SelectPropertyValue,
        "Completed on": { date: { start: now.toISOString() } } as DatePropertyValue,
    }, archived: false });
    
    const name = `Task completed ${params.id}`;
    await addToHistory(page, name, `Quest completed on ${now}`);
    await sendQuestMessage(page, params);
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

export const handleTask = async (params: TaskParams) => {
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

const sendQuestMessage = async (page: PagesRetrieveResponse, params: TaskParams) => {
    const name = `Task completed ${params.id}`;
    const title = (page.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text;
    const description = (page.properties['Description'] as RichTextPropertyValue).rich_text?.[0]?.plain_text ?? 'no description';
    const emoji = (page.properties['Emoji'] as RichTextPropertyValue).rich_text?.[0]?.plain_text ?? '';
    
    const message = `${name}\n${emoji} ${title}\n- ${description}`;
    const categoryId = (page.properties['Category'] as RelationPropertyValue).relation?.[0]?.id;
    
    if (categoryId) {
        const categoryPage = await notion.pages.retrieve({ page_id: categoryId });
        const categoryImgUrl = categoryPage.icon?.type === 'file' 
            ? categoryPage.icon.file.url 
            : categoryPage.icon?.type === 'external'
              ? categoryPage.icon?.external.url
              : defaultAchievementPicture;
        await bot.api.sendPhoto(process.env.USER_ID!, categoryImgUrl!, { caption: message});
    } else {
        await bot.api.sendMessage(process.env.USER_ID!, message);
    }
}

export const createRandomQuests = async () => {
    const quests = await notion.databases.query({ database_id: process.env.QUEST_NOTION_DATABASE!, 
        filter: { property: 'Tags', multi_select: { contains: 'random' } }
    });

    for (const quest of quests.results.filter(questIsPlannedForToday)) {
        const emoji = (quest.properties['Emoji'] as RichTextPropertyValue).rich_text?.[0]?.plain_text;
        const name = (quest.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text;
        const group1Amount = (quest.properties["Group 1 selection amount"] as NumberPropertyValue).number!;
        const group2Amount = (quest.properties["Group 2 selection amount"] as NumberPropertyValue).number!;
        const group1Length = (quest.properties["Group 1 length (minutes)"] as NumberPropertyValue).number!;
        const group2Length = (quest.properties["Group 2 length (minutes)"] as NumberPropertyValue).number!;
        const startTime = (quest.properties["Start time"] as RichTextPropertyValue).rich_text?.[0]?.plain_text!;
        const randomGroup1 = (quest.properties["Children (Random - Group 1)"] as RelationPropertyValue).relation?.map(q => q?.id);
        const randomGroup2 = (quest.properties["Children (Random - Group 2)"] as RelationPropertyValue).relation?.map(q => q?.id);

        const selectedGroup1 = randomN(randomGroup1, group1Amount);
        const selectedGroup2 = randomN(randomGroup2, group2Amount);

        const group1Quests = await Promise.all(selectedGroup1.map(rid => notion.pages.retrieve({ page_id: rid })));
        const group2Quests = await Promise.all(selectedGroup2.map(rid => notion.pages.retrieve({ page_id: rid })));

        const group1Names = await Promise.all(group1Quests.map((quest, i) => createQuest(quest, `today ${addTime(startTime, i * group1Length)}`, group1Length)));
        const group2Names = await Promise.all(group2Quests.map((quest, i) => createQuest(quest, `today ${addTime(startTime, group1Length * group1Amount + i * group2Length)}`, group2Length)));
        
        await bot.api.sendMessage(process.env.USER_ID!, 
            `Random quests for today\'s ${emoji} ${name} are:\n${[...group1Names, ...group2Names].join('\n')}`
        );
    }
}