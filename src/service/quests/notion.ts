// tslint:disable: no-magic-numbers
import { Client } from '@notionhq/client/build/src';
import {
    MultiSelectPropertyValue,
    NumberPropertyValue,
    Page,
    RelationPropertyValue,
    RichTextPropertyValue,
} from '@notionhq/client/build/src/api-types';
import { getPageName, getPagePicture } from '../common';

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

export interface IQuestNotionService {
    getQuestByName(name: string): Promise<Quest>;
    getQuestsByTag(tag: string, pageFilter: (pages: Page[]) => Promise<Page[]>): Promise<Quest[]>;
}
export class QuestNotionService implements IQuestNotionService {
    constructor(private readonly client: Client) {}

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

    private readonly getPage = (id: string) => {
        return this.client.pages.retrieve({ page_id: id });
    };
}
