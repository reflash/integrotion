import { DatePropertyValue, NumberPropertyValue, TitlePropertyValue } from "@notionhq/client/build/src/api-types";
import { defaultAchievementPicture, sleep } from "../utils";
import { bot } from "./bot";
import { notion } from "./notion";

export const verifyAchievements = async () => {
    const achievements = await notion.databases.query({ database_id: process.env.ACHIEVEMENTS_NOTION_DATABASE!, 
        filter: { and: [ 
            { property: 'Completed', formula: { checkbox: { equals: true } as any} },
            { property: 'Achieved on', date: { is_empty: true }},
        ]} 
    });
    const now = new Date().toISOString().substr(0,10);

    for (const achievement of achievements.results) {
        await notion.pages.update({ page_id: achievement.id, properties: {
            "Achieved on": { date: { start: now } } as DatePropertyValue,
        }, archived: false });

        const name = (achievement.properties['Name'] as TitlePropertyValue).title[0].plain_text;
        const achievementPoints = (achievement.properties['Achievement points (AP)'] as NumberPropertyValue).number!;
        const achievementText = `Yay 👏 🚀 You've received an achievement\n\n${name} 🔰 ${achievementPoints}`
        if (achievement.icon?.type === 'file')
            await bot.api.sendPhoto(process.env.USER_ID!, achievement.icon.file.url!, { caption: achievementText });
        else if (achievement.icon?.type === 'external')
            await bot.api.sendPhoto(process.env.USER_ID!, achievement.icon.external.url!, { caption: achievementText });
        else if (achievement.icon?.type === 'emoji')
            await bot.api.sendPhoto(process.env.USER_ID!, defaultAchievementPicture, { caption: achievementText });

        await bot.api.sendMessage(process.env.USER_ID!, '🎉');
        await sleep(1100);
    }
}