import { Client } from '@notionhq/client/build/src';
import { Page, PropertyValueMap, RichTextPropertyValue, TitlePropertyValue } from '../../utils/types';
import { mapPageToChest, mapPageToQuest, mapPageToVaultGoal } from './mappers';
import { Chest, Quest, VaultGoal } from './types';

export interface IQuestNotionService {
    getQuestById(id: string): Promise<Quest>;
    getQuestByName(name: string): Promise<Quest>;
    getQuestsByTag(tag: string, pageFilter: (pages: Page[]) => Promise<Page[]>): Promise<Quest[]>;
    getChestById(id: string): Promise<Chest>;
    getVaultGoals(): Promise<VaultGoal[]>;
    updatePage(id: string, properties: PropertyValueMap): Promise<any>;
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

    public getVaultGoals = async () => {
        const { results: pages } = await this.client.databases.query({
            database_id: process.env.VAULT_NOTION_DATABASE!,
        });
        return Promise.all(
            pages.map(async p => {
                const progressPropId = p.properties['Progress'].id;
                const progressProp = await this.client.pages.properties.retrieve({ page_id: p.id, property_id: progressPropId });
                const progress = (progressProp as any)?.formula?.string ?? '';

                const actualPropId = p.properties['Actual'].id;
                const actualProp = await this.client.pages.properties.retrieve({ page_id: p.id, property_id: actualPropId });
                const actual = (actualProp as any)?.formula?.number ?? 0;
                return mapPageToVaultGoal(p, progress, actual);
            }),
        );
    };

    public updatePage = async (id: string, properties: PropertyValueMap) => {
        const page = await this.client.pages.update({
            page_id: id,
            properties,
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
