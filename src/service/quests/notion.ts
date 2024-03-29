import { Client, isFullPage } from '@notionhq/client/build/src';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { Page, PropertyValueMap, RichTextPropertyValue, TitlePropertyValue } from '../../utils/types';
import { mapPageToChest, mapPageToQuest, mapPageToVaultGoal } from './mappers';
import { Chest, Quest, VaultGoal } from './types';

export interface IQuestNotionService {
    getQuestById(id: string): Promise<Quest>;
    getQuestByName(name: string): Promise<Quest>;
    getQuestsByTag(tag: string, pageFilter: (pages: Page[]) => Promise<Page[]>): Promise<Quest[]>;
    getChestById(id: string): Promise<Chest>;
    getVaultGoals(): Promise<VaultGoal[]>;
    updatePage(id: string, properties: PropertyValueMap, coverUrl?: string): Promise<any>;
    addToHistory(questId: string, name: string, eventDescription: string): Promise<any>;
}
export class QuestNotionService implements IQuestNotionService {
    constructor(private readonly client: Client) {}

    public getQuestById = async (id: string) => {
        const page = await this.getPage(id);
        return mapPageToQuest(page as Page);
    };

    public getQuestByName = async (name: string) => {
        const pages = await this.client.databases.query({
            database_id: process.env.QUEST_NOTION_DATABASE!,
            filter: { property: 'Name', title: { contains: name } },
        });
        const page = pages.results[0];

        return mapPageToQuest(page as Page);
    };

    public getQuestsByTag = async (tag: string, pageFilter: (pages: Page[]) => Promise<Page[]>) => {
        const pages = await this.client.databases.query({
            database_id: process.env.QUEST_NOTION_DATABASE!,
            filter: { property: 'Tags', multi_select: { contains: tag } },
        });
        const filteredPages = await pageFilter(pages.results.filter(isFullPage));
        return filteredPages.map(mapPageToQuest);
    };

    public getChestById = async (id: string) => {
        const page = await this.getPage(id);
        return mapPageToChest(page as Page);
    };
    
    public getVaultGoals = async () => {
        const { results: pages } = await this.client.databases.query({
            database_id: process.env.VAULT_NOTION_DATABASE!,
            filter: { or: [{ property: 'Active', checkbox: { equals: true } }, { property: 'Active (Goal - 2)', formula: { checkbox: { equals: true } } }] },
        });
        return Promise.all(
            pages
                .filter(isFullPage)
                .map(mapPageToVaultGoal),
        );
    };

    public updatePage = async (id: string, properties: PropertyValueMap, coverUrl?: string) => {
        const page = await this.client.pages.update({
            page_id: id,
            properties,
            cover: coverUrl ? { external: { url: coverUrl } } : undefined,
            archived: false,
        });
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
