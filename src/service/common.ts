import TodoistApiREST from 'todoist-api-ts';
import { Page, TitlePropertyValue } from '../utils/types';

const defaultAchievementPicture = 'https://tagn.files.wordpress.com/2016/06/rtdachi.jpg';
export const goalUncompletePicture =
    'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/e8ff019e-6591-474a-9ee0-75a03e380a65/21503_%281%29.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAT73L2G45O3KS52Y5%2F20211108%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20211108T102206Z&X-Amz-Expires=3600&X-Amz-Signature=7cb95f07c822f545456ef8a08450015ca77e9a0a738159a462e20ffaaa67ac3d&X-Amz-SignedHeaders=host';
export const goalCompletePicture =
    'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/2378f159-f885-45b6-968d-28cb0e204d59/7431unfl5yq61_%281%29.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAT73L2G45O3KS52Y5%2F20211108%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20211108T102206Z&X-Amz-Expires=3600&X-Amz-Signature=5899f3db933c1ef4dfb18d2d7c5c7ceafbf99b497eac3e78fac77268c7f3a7ed&X-Amz-SignedHeaders=host';

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

export type TodoistClientFactory = () => TodoistApiREST;
