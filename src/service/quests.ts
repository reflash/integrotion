import { Client } from "@notionhq/client/build/src";
import { PagesRetrieveResponse } from "@notionhq/client/build/src/api-endpoints";
import { DatePropertyValue, MultiSelectPropertyValue, NumberPropertyValue, Page, RelationPropertyValue, RichTextPropertyValue, SelectPropertyValue, TitlePropertyValue } from "@notionhq/client/build/src/api-types";
import TodoistApiREST, { CreateTaskParameters } from "todoist-api-ts";
import { addTime, defaultAchievementPicture, randomN, sleep, TaskParams } from "../utils";
import { bot } from "./bot";
import { getPageName, getPagePicture, INotionProductivityApi, notion } from "./notion";
import { createQuest, questIsPlannedForToday, TodoistClientFactory } from "./todoist";

const isRepeating = (type: string) =>
    type === 'Daily' ||
    type === 'Every two days' ||
    type === 'Weekday' ||
    type === 'Weekend' ||
    type === 'Weekly' ||
    type === 'Biweekly' ||
    type === 'Monthly' ||
    type === 'Yearly' ||
    type === 'Repeating';

const isQuest = (type: string) => type === 'Quest';

const isChest = (type: string) => type === 'Chest';

const handleRepeating = async (params: TaskParams) => {
    const page = await notion.pages.retrieve({ page_id: params.nid });
    const maxInARow = (page.properties['Max times completed in a row'] as NumberPropertyValue).number!;
    const timesCompleted = (page.properties['Times completed'] as NumberPropertyValue).number!;
    const timesCompletedInARow = (page.properties['Times completed in a row'] as NumberPropertyValue).number!;

    const newTimesCompleted = timesCompleted + 1;
    const newTimesCompletedInARow = timesCompletedInARow + 1;
    const newMaxInARow = maxInARow > newTimesCompletedInARow ? maxInARow : newTimesCompletedInARow;

    await notion.pages.update({
        page_id: page.id,
        properties: {
            'Times completed': { number: newTimesCompleted } as NumberPropertyValue,
            'Times completed in a row': { number: newTimesCompletedInARow } as NumberPropertyValue,
            'Max times completed in a row': { number: newMaxInARow } as NumberPropertyValue,
        },
        archived: false,
    });

    const name = `Task completed ${params.id}`;
    await addToHistory(
        page,
        name,
        `Old to New values (MTCR-TC-TCR): ${maxInARow} => ${newMaxInARow}; ${timesCompleted} => ${newTimesCompleted}; ${timesCompletedInARow} => ${newTimesCompletedInARow}`,
    );
    await sendQuestMessage(page, params);
};

const handleQuest = async (params: TaskParams) => {
    const page = await notion.pages.retrieve({ page_id: params.nid });
    const now = new Date();
    await notion.pages.update({
        page_id: page.id,
        properties: {
            Status: { select: { name: 'COMPLETED' } } as SelectPropertyValue,
            'Completed on': { date: { start: now.toISOString() } } as DatePropertyValue,
        },
        archived: false,
    });

    const name = `Task completed ${params.id}`;
    await addToHistory(page, name, `Quest completed on ${now}`);
    await sendQuestMessage(page, params);
};

const handleChest = async (params: TaskParams) => {
    const page = await notion.pages.retrieve({ page_id: params.nid });
    const coverUrl = page.cover?.type === 'file' ? page.cover.file.url : page.cover?.external.url;
    const actual = (page.properties['Actual'] as NumberPropertyValue).number!;
    const newActual = actual + 1;
    const required = (page.properties['Required'] as NumberPropertyValue).number!;
    await notion.pages.update({
        page_id: page.id,
        properties: {
            Actual: { number: newActual } as NumberPropertyValue,
        },
        archived: false,
    });

    if (newActual === required) {
        await bot.api.sendPhoto(process.env.USER_ID!, coverUrl!, {
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

export const handleTask = async (params: TaskParams) => {
    if (isRepeating(params.type)) return handleRepeating(params);
    else if (isQuest(params.type)) return handleQuest(params);
    else if (isChest(params.type)) return handleChest(params);

    return handleOther(params);
};

const addToHistory = async (page: PagesRetrieveResponse, name: string, eventDescription: string) => {
    await notion.pages.create({
        parent: { database_id: process.env.HISTORY_NOTION_DATABASE! },
        properties: {
            Name: { title: [{ text: { content: name } }] } as TitlePropertyValue,
            Quest: { relation: [{ id: page.id }] } as any,
            'Event description': { rich_text: [{ text: { content: eventDescription } }] } as RichTextPropertyValue,
        },
    });
};

const sendQuestMessage = async (page: PagesRetrieveResponse, params: TaskParams) => {
    const name = `Task completed ${params.id}`;
    const title = (page.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text;
    const description = (page.properties['Description'] as RichTextPropertyValue).rich_text?.[0]?.plain_text ?? 'no description';
    const emoji = (page.properties['Emoji'] as RichTextPropertyValue).rich_text?.[0]?.plain_text ?? '';

    const message = `${name}\n${emoji} ${title}\n- ${description}`;
    const categoryId = (page.properties['Category'] as RelationPropertyValue).relation?.[0]?.id;

    if (categoryId) {
        const categoryPage = await notion.pages.retrieve({ page_id: categoryId });
        const categoryImgUrl =
            categoryPage.icon?.type === 'file'
                ? categoryPage.icon.file.url
                : categoryPage.icon?.type === 'external'
                ? categoryPage.icon?.external.url
                : defaultAchievementPicture;
        await bot.api.sendPhoto(process.env.USER_ID!, categoryImgUrl!, { caption: message });
    } else {
        await bot.api.sendMessage(process.env.USER_ID!, message);
    }
};

export const createRandomQuests = async () => {
    const quests = await notion.databases.query({
        database_id: process.env.QUEST_NOTION_DATABASE!,
        filter: { property: 'Tags', multi_select: { contains: 'random' } },
    });

    for (const quest of quests.results.filter(questIsPlannedForToday)) {
        const emoji = (quest.properties['Emoji'] as RichTextPropertyValue).rich_text?.[0]?.plain_text;
        const name = (quest.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text;
        const group1Amount = (quest.properties['Group 1 selection amount'] as NumberPropertyValue).number!;
        const group2Amount = (quest.properties['Group 2 selection amount'] as NumberPropertyValue).number!;
        const group1Length = (quest.properties['Group 1 length (minutes)'] as NumberPropertyValue).number!;
        const group2Length = (quest.properties['Group 2 length (minutes)'] as NumberPropertyValue).number!;
        const startTime = (quest.properties['Start time'] as RichTextPropertyValue).rich_text?.[0]?.plain_text!;
        const randomGroup1 = (quest.properties['Children (Random - Group 1)'] as RelationPropertyValue).relation?.map(q => q?.id);
        const randomGroup2 = (quest.properties['Children (Random - Group 2)'] as RelationPropertyValue).relation?.map(q => q?.id);

        const selectedGroup1 = randomN(randomGroup1, group1Amount);
        const selectedGroup2 = randomN(randomGroup2, group2Amount);

        const group1Quests = await Promise.all(selectedGroup1.map(rid => notion.pages.retrieve({ page_id: rid })));
        const group2Quests = await Promise.all(selectedGroup2.map(rid => notion.pages.retrieve({ page_id: rid })));

        const group1Names = await Promise.all(
            group1Quests.map((quest, i) => createQuest(quest, `today ${addTime(startTime, i * group1Length)}`, group1Length)),
        );
        const group2Names = await Promise.all(
            group2Quests.map((quest, i) =>
                createQuest(quest, `today ${addTime(startTime, group1Length * group1Amount + i * group2Length)}`, group2Length),
            ),
        );

        await bot.api.sendMessage(
            process.env.USER_ID!,
            `Random quests for today\'s ${emoji} ${name} are:\n${[...group1Names, ...group2Names].join('\n')}`,
        );
    }
};

const mapTagsToPrefix = (tags: string[]) => {
    if (tags.includes('quest')) return 'Quest';
    else if (tags.includes('daily')) return 'Daily';
    else if (tags.includes('every two days')) return 'Every two days';
    else if (tags.includes('weekly')) return 'Weekly';
    else if (tags.includes('weekday')) return 'Weekday';
    else if (tags.includes('weekend')) return 'Weekend';
    else if (tags.includes('biweekly')) return 'Biweekly';
    else if (tags.includes('monthly')) return 'Monthly';
    else if (tags.includes('yearly')) return 'Yearly';
    else if (tags.includes('repeating')) return 'Repeating';
    return 'Unknown';
};

const getRandomProps = (page: Page, tags: string[]) => {
    const isRandom = tags.includes('random');
    return isRandom
        ? {
              startTime: (page.properties['Start time'] as RichTextPropertyValue).rich_text?.[0]?.plain_text!,
              group1Amount: (page.properties['Group 1 selection amount'] as NumberPropertyValue).number!,
              group2Amount: (page.properties['Group 2 selection amount'] as NumberPropertyValue).number!,
              group1Length: (page.properties['Group 1 length (minutes)'] as NumberPropertyValue).number!,
              group2Length: (page.properties['Group 2 length (minutes)'] as NumberPropertyValue).number!,
              group1Ids: (page.properties['Children (Random - Group 1)'] as RelationPropertyValue).relation?.map(q => q?.id),
              group2Ids: (page.properties['Children (Random - Group 2)'] as RelationPropertyValue).relation?.map(q => q?.id),
          }
        : undefined;
};

const mapPageToQuest = (page: Page): Quest => {
    const id = page.id;
    const name = getPageName(page);
    const description = (page.properties['Description'] as RichTextPropertyValue).rich_text?.[0]?.plain_text ?? 'no description';
    const emoji = (page.properties['Emoji'] as RichTextPropertyValue).rich_text?.[0]?.plain_text ?? '';
    const tags = (page.properties['Tags'] as MultiSelectPropertyValue).multi_select.map(ms => ms.name!);
    const isRepeating = tags.includes('repeating');
    const priority = isRepeating ? 2 : 3;
    const type = mapTagsToPrefix(tags);
    const url = page.url.replace('https', 'notion');
    const categoryId = (page.properties['Category'] as RelationPropertyValue).relation?.[0]?.id;
    const rewardIds = (page.properties['Rewards'] as RelationPropertyValue).relation?.map(r => r?.id!);

    const random = getRandomProps(page, tags);
    const pictureUrl = getPagePicture(page);

    return { id, name, description, emoji, pictureUrl, priority, type, url, categoryId, rewardIds, random };
};

export type Random = {
    startTime: string;
    group1Amount: number;
    group2Amount: number;
    group1Length: number;
    group2Length: number;

    group1Ids: string[];
    group2Ids: string[];
};

export type Quest = {
    id: string;
    name: string;
    description: string;
    emoji: string;
    pictureUrl: string;
    // repeating = 2; else = 3
    priority: 2 | 3;
    type: string;
    url: string;

    categoryId: string;
    rewardIds: string[];

    random?: Random;
};

export interface IQuestService {
    getQuestByName(name: string): Promise<Quest>;
    getQuestsByTag(tag: string, pageFilter: (pages: Page[]) => Promise<Page[]>): Promise<Quest[]>;
    createQuestTask(quest: Quest, due: string, length?: number): Promise<string>;
}
export class QuestService implements IQuestService {
    constructor(private readonly client: Client, private readonly todoistFactory: TodoistClientFactory) {}

    public async getQuestByName(name: string) {
        const pages = await this.client.databases.query({
            database_id: process.env.QUEST_NOTION_DATABASE!,
            filter: { property: 'Name', text: { contains: name } },
        });
        const page = pages.results[0];

        return mapPageToQuest(page);
    }

    public async getQuestsByTag(tag: string, pageFilter: (pages: Page[]) => Promise<Page[]>) {
        const pages = await this.client.databases.query({
            database_id: process.env.QUEST_NOTION_DATABASE!,
            filter: { property: 'Tags', multi_select: { contains: tag } },
        });
        const filteredPages = await pageFilter(pages.results);
        return filteredPages.map(mapPageToQuest);
    }

    public createQuestTask = async (quest: Quest, due: string, length?: number) => {
        const todoist = this.todoistFactory();
        const lengthContent = length ? ` (${length}m)` : '';
        const createParams = await this.mapQuestToTask(todoist, quest, due, lengthContent);
        await todoist.createNewTask(createParams);

        return `${quest.emoji} ${quest.name}${lengthContent}`;
    };

    private readonly mapQuestToTask = async (
        todoist: TodoistApiREST,
        quest: Quest,
        due: string,
        lengthContent: string,
    ): Promise<CreateTaskParameters> => {
        const content = `**[${quest.type}]** ${quest.emoji} [${quest.name}](${quest.url})${lengthContent} | [NID](${quest.id})`;
        const project = await this.getQuestProject(todoist, quest);
        await sleep(500);
        const labelIds = await this.getQuestLabels(todoist, quest);

        return {
            content,
            description: quest.description,
            priority: quest.priority,
            project_id: project.id,
            label_ids: labelIds,
            due_string: due,
        };
    };

    private readonly getQuestProject = async (todoist: TodoistApiREST, quest: Quest) => {
        const category = await this.getPage(quest.categoryId);
        const categoryName = getPageName(category);
        const projects = await todoist.getAllProjects();
        return projects.find(p => p.name.includes(categoryName))!;
    };

    private readonly getQuestLabels = async (todoist: TodoistApiREST, quest: Quest) => {
        const rewards = await Promise.all(quest.rewardIds.map(this.getPage));
        const labels = await todoist.getAllLabels();
        const filteredLabels = rewards.map(r =>
            labels.find(l =>
                l.name.includes(
                    // NOTE: labels in todoist have not spaces (substituted with underscore symbol)
                    getPageName(r).replace(/ /g, '_'),
                ),
            ),
        );

        return filteredLabels.map(l => l?.id!);
    };

    private readonly getPage = (id: string) => {
        return this.client.pages.retrieve({ page_id: id });
    };
}
