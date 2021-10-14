import { Client } from '@notionhq/client/build/src';
import { InputPropertyValueMap, PagesRetrieveResponse } from '@notionhq/client/build/src/api-endpoints';
import { Page, RichTextPropertyValue, TitlePropertyValue } from '@notionhq/client/build/src/api-types';
import { Bot } from 'grammy';
import { ICategoryNotionService } from '../category/notion';
import { mapPageToChest, mapPageToQuest } from './mappers';
import { TaskParams } from './todoist';
import { Chest, Quest } from './types';

export interface IQuestNotionService {
    getQuestById(id: string): Promise<Quest>;
    getQuestByName(name: string): Promise<Quest>;
    getQuestsByTag(tag: string, pageFilter: (pages: Page[]) => Promise<Page[]>): Promise<Quest[]>;
    getChestById(id: string): Promise<Chest>;
    updateQuestPage(id: string, properties: InputPropertyValueMap): Promise<Quest>;
    addToHistory(questId: string, name: string, eventDescription: string): Promise<any>;
}
export class QuestNotionService implements IQuestNotionService {
    constructor(private readonly client: Client) {}

    public getQuestById = async (id: string) => {
        const page = await this.getPage(id);
        return mapPageToQuest(page);
    };

    public getQuestByName = async (name: string) => {
        const pages = await this.client.databases.query({
            database_id: process.env.QUEST_NOTION_DATABASE!,
            filter: { property: 'Name', text: { contains: name } },
        });
        const page = pages.results[0];

        return mapPageToQuest(page);
    };

    public getQuestsByTag = async (tag: string, pageFilter: (pages: Page[]) => Promise<Page[]>) => {
        const pages = await this.client.databases.query({
            database_id: process.env.QUEST_NOTION_DATABASE!,
            filter: { property: 'Tags', multi_select: { contains: tag } },
        });
        const filteredPages = await pageFilter(pages.results);
        return filteredPages.map(mapPageToQuest);
    };

    public getChestById = async (id: string) => {
        const page = await this.getPage(id);
        return mapPageToChest(page);
    };

    public updateQuestPage = async (id: string, properties: InputPropertyValueMap) => {
        const page = await this.client.pages.update({
            page_id: id,
            properties,
            archived: false,
        });
        return mapPageToQuest(page);
    };

    public addToHistory = async (questId: string, name: string, eventDescription: string) => {
        await this.client.pages.create({
            parent: { database_id: process.env.HISTORY_NOTION_DATABASE! },
            properties: {
                Name: { title: [{ text: { content: name } }] } as TitlePropertyValue,
                Quest: { relation: [{ id: questId }] } as any,
                'Event description': { rich_text: [{ text: { content: eventDescription } }] } as RichTextPropertyValue,
            },
        });
    };

    private readonly getPage = (id: string) => {
        return this.client.pages.retrieve({ page_id: id });
    };
}
