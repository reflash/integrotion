import { Page, TitlePropertyValue } from "@notionhq/client/build/src/api-types";
import TodoistApiREST from "todoist-api-ts";

const defaultAchievementPicture = 'https://tagn.files.wordpress.com/2016/06/rtdachi.jpg';

export const getPageName = (page: Page): string => {
    return (page.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text;
}

export const getPagePicture = (page: Page) => {
    return page.icon?.type === 'file' 
        ? page.icon.file.url 
        : page.icon?.type === 'external'
          ? page.icon?.external.url
          : defaultAchievementPicture;
}

export type TodoistClientFactory = () => TodoistApiREST;
