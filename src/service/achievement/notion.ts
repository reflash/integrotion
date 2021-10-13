import { Client } from "@notionhq/client/build/src";
import { DatePropertyValue, NumberPropertyValue, Page, TitlePropertyValue } from "@notionhq/client/build/src/api-types";
import { Bot } from "grammy";
import { getPageName, getPagePicture } from "../common";

const mapPageToAchievement = (page: Page): Achievement => {
    const id = page.id;
    const name = getPageName(page);
    const pictureUrl = getPagePicture(page);
    const points = (page.properties['Achievement points (AP)'] as NumberPropertyValue).number!;

    return { id, name, pictureUrl, points };
}

export type Achievement = {
    id: string;
    name: string;
    pictureUrl: string;
    points: number;
}

export interface IAchievementNotionService {
    getNewAchievements(): Promise<Achievement[]>;
    finalizeAchievement(achievement: Achievement): Promise<any>;
}
export class AchievementNotionService implements IAchievementNotionService {
    constructor(
        private readonly client: Client,
        private readonly bot: Bot,
    ) {}

    public async getNewAchievements() {
        const achievements = await this.client.databases.query({ database_id: process.env.ACHIEVEMENTS_NOTION_DATABASE!, 
            filter: { and: [ 
                { property: 'Completed', formula: { checkbox: { equals: true } as any} },
                { property: 'Achieved on', date: { is_empty: true }},
            ]} 
        });

        return achievements.results.map(mapPageToAchievement);
    }

    public async finalizeAchievement(achievement: Achievement) {
        const now = new Date().toISOString().substr(0,10);

        await this.client.pages.update({ page_id: achievement.id, properties: {
            "Achieved on": { date: { start: now } } as DatePropertyValue,
        }, archived: false });

        const achievementText = `Yay 👏 🚀 You've received an achievement\n\n${achievement.name} 🔰 ${achievement.points}`
        await this.bot.api.sendPhoto(process.env.USER_ID!, achievement.pictureUrl, { caption: achievementText });
        await this.bot.api.sendMessage(process.env.USER_ID!, '🎉');
    }

    private getPage = (id: string) => {
        return this.client.pages.retrieve({ page_id: id });
    }
}