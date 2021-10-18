import { Client } from '@notionhq/client/build/src';
import { Page } from '@notionhq/client/build/src/api-types';
import { getPageName } from '../common';

const mapPageToReward = (page: Page): Reward => {
    const id = page.id;
    const name = getPageName(page);

    return { id, name };
};

export type Reward = {
    id: string;
    name: string;
};

export interface IRewardNotionService {
    getRewardById(id: string): Promise<Reward>;
}
export class RewardNotionService implements IRewardNotionService {
    constructor(private readonly client: Client) {}

    public getRewardById = async (id: string) => {
        const page = await this.getPage(id);

        return mapPageToReward(page);
    };

    private readonly getPage = (id: string) => {
        return this.client.pages.retrieve({ page_id: id });
    };
}
