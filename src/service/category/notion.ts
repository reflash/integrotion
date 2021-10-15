import { Client } from '@notionhq/client/build/src';
import { Page } from '@notionhq/client/build/src/api-types';
import { getPageName, getPagePicture } from '../common';

const mapPageToCategory = (page: Page): Category => {
    const id = page.id;
    const name = getPageName(page);
    const pictureUrl = getPagePicture(page);

    return { id, name, pictureUrl };
};

export type Category = {
    id: string;
    name: string;
    pictureUrl: string;
};

export interface ICategoryNotionService {
    getCategoryById(id: string): Promise<Category>;
}
export class CategoryNotionService implements ICategoryNotionService {
    constructor(private readonly client: Client) {}

    public async getCategoryById(id: string) {
        const page = await this.getPage(id);

        return mapPageToCategory(page);
    }

    private readonly getPage = (id: string) => {
        return this.client.pages.retrieve({ page_id: id });
    };
}
