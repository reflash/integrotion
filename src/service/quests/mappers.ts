// tslint:disable: no-magic-numbers
import {
    BooleanPropertyValue,
    FormulaPropertyValue,
    MultiSelectPropertyValue,
    NumberPropertyValue,
    Page,
    RelationPropertyValue,
    RichTextPropertyValue,
    RollupPropertyValue,
    SelectPropertyValue,
} from '../../utils/types';
import { getPageName, getPagePicture } from '../common';
import { Quest } from './types';

export const isRepeating = (type: string) =>
    type === 'Daily' ||
    type === 'Every two days' ||
    type === 'Weekday' ||
    type === 'Weekend' ||
    type === 'Weekly' ||
    type === 'Biweekly' ||
    type === 'Monthly' ||
    type === 'Yearly' ||
    type === 'Repeating';

export const isQuest = (type: string) => type === 'Quest';

export const isChest = (type: string) => type === 'Chest';

export const mapTagsToPrefix = (tags: string[]) => {
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

export const mapRandomProps = (page: Page, tags: string[]) => {
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

export const mapRepeatingProps = (page: Page, isRepeating: boolean) => {
    return isRepeating
        ? {
              maxInARow: (page.properties['Max times completed in a row'] as NumberPropertyValue).number!,
              timesCompleted: (page.properties['Times completed'] as NumberPropertyValue).number!,
              timesCompletedInARow: (page.properties['Times completed in a row'] as NumberPropertyValue).number!,
          }
        : undefined;
};

export const mapPageToChest = (page: Page) => {
    return {
        id: page.id,
        actual: (page.properties['Actual'] as NumberPropertyValue).number!,
        required: (page.properties['Required'] as NumberPropertyValue).number!,
        pictureUrl: getPagePicture(page),
    };
};

export const mapPageToVaultGoal = (page: Page/*, progress: string, actual: number*/) => {
    const name = getPageName(page);
    const active = (page.properties['Active'] as BooleanPropertyValue).checkbox || ((page.properties['Active (Goal - 2)'] as FormulaPropertyValue).formula as any).boolean;
    const actualG = ((page.properties['Actual (Goal)'] as RollupPropertyValue)?.rollup as any).number;
    const required = (page.properties['Required'] as NumberPropertyValue).number!;
    const actual = actualG <= required ? actualG : required;
    const progressPercent = actual / required;
    const progress = "▓▓▓▓▓▓▓▓▓▓".slice(0, Math.round(progressPercent*10)) + "░░░░░░░░░░".slice(0, Math.round((1 - progressPercent)* 10)) + " " + actual + "/" + required;
    const progressDecorated = progress.slice(0, 3) + '|' + progress.slice(3, 5) + '|' + progress.slice(5);
    const status = (page.properties['Status'] as SelectPropertyValue).select?.name;
    const isGoal = status === 'Goal';
    const url = page.url.replace('https', 'notion');
    const emoji = page.icon?.type === 'emoji' ? page.icon.emoji : '🎖';
    const completed = actualG >= required;
    const lastWeekBase = (page.properties['Last week base'] as NumberPropertyValue).number!;
    const goalsRelation = ((page.properties['Goal'] as RelationPropertyValue)?.relation);
    const goalId = goalsRelation.length > 0 ? goalsRelation[0].id : null;

    return {
        id: page.id,
        name,
        active,
        isGoal,
        url,
        emoji,
        progress: progressDecorated,
        completed,
        lastWeekBase,
        actual,
        required,
        goalId
    };
};

export const mapPageToQuest = (page: Page): Quest => {
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
    const goalId = (page.properties['Relation (Great Vault)'] as RelationPropertyValue).relation?.[0]?.id;

    const random = mapRandomProps(page, tags);
    const repeating = mapRepeatingProps(page, isRepeating);
    const pictureUrl = getPagePicture(page);

    return { id, name, description, emoji, pictureUrl, priority, type, url, goalId, categoryId, rewardIds, random, repeating };
};
