import { TodoistApi } from '@doist/todoist-api-typescript';
import { Page, TitlePropertyValue } from '../utils/types';

const defaultAchievementPicture = 'https://tagn.files.wordpress.com/2016/06/rtdachi.jpg';
export const goalIncompletePicture =
    'https://i.postimg.cc/kGgnqbYm/21503-1.png';
export const goalCompletePicture =
    'https://i.postimg.cc/YC9mb4tT/7431unfl5yq61-1.png';

export const getPageName = (page: Page): string => {
    return (page.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text;
};

export const getPagePicture = (page: Page) => {
    const coverUrl =
        page.cover?.type === 'file' ? page.cover.file.url : page.cover?.type === 'external' ? page.cover?.external.url : undefined;
    return (
        coverUrl ??
        (page.icon?.type === 'file'
            ? page.icon?.file.url
            : page.icon?.type === 'external'
            ? page.icon?.external.url
            : defaultAchievementPicture)
    );
};

export type TodoistClientFactory = () => TodoistApi;
