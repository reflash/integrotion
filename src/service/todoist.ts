import { RichTextPropertyValue, TitlePropertyValue, MultiSelectPropertyValue, RelationPropertyValue, Page } from "@notionhq/client/build/src/api-types";
import TodoistApiREST from "todoist-api-ts";
import { sleep } from "../utils";
import { notion } from "./notion";

export const parseTask = (content: string) => {
    const text = content;
    const match = /^\*\*\[(?<type>.+)\]\*\*(?<task>[^|]+)(\|\s\[NID\]\((?<nid>.+)\))?/.exec(text);
    
    if (!match || !match.groups)
        throw new Error("No matches in item");

    const type = match.groups['type'];
    const task = match.groups['task'].trim();
    const nid = match.groups['nid'];

    return { type, task, nid };
}

export const todoist = new TodoistApiREST(process.env.TODOIST_TOKEN!); 

const mapTagsToPrefix = (tags: string[]) => {
    if (tags.includes('quest'))
        return 'Quest';
    else if (tags.includes('daily'))
        return 'Daily';
    else if (tags.includes('every two days'))
        return 'Every two days';
    else if (tags.includes('weekly'))
        return 'Weekly';
    else if (tags.includes('weekday'))
        return 'Weekday';
    else if (tags.includes('weekend'))
        return 'Weekend';
    else if (tags.includes('biweekly'))
        return 'Biweekly';
    else if (tags.includes('monthly'))
        return 'Monthly';
    else if (tags.includes('yearly'))
        return 'Yearly';
    else if (tags.includes('repeating'))
        return 'Repeating';
    return 'Unknown';
}

export const createQuest = async (quest: Page, due: string, length?: number) => {
    const todoist = new TodoistApiREST(process.env.TODOIST_TOKEN!);

    const id = quest.id;
    const emoji = (quest.properties['Emoji'] as RichTextPropertyValue).rich_text?.[0]?.plain_text;
    const name = (quest.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text;
    const description = (quest.properties['Description'] as RichTextPropertyValue).rich_text?.[0]?.plain_text;
    const tags = (quest.properties['Tags'] as MultiSelectPropertyValue).multi_select.map(ms => ms.name!);
    const isRepeating = tags.includes('repeating')
    const priority = isRepeating ? 2 : 3;
    const prefix = mapTagsToPrefix(tags);
    const url = quest.url.replace('https', 'notion');
    const lengthContent = length ? ` (${length}m)` : '';
    const content = `**[${prefix}]** ${emoji} [${name}](${url})${lengthContent} | [NID](${id})`;
  
    const categoryId = (quest.properties['Category'] as RelationPropertyValue).relation?.[0]?.id!;
    const category = await notion.pages.retrieve({ page_id: categoryId });
    const categoryName = (category.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text;
    const projects = await todoist.getAllProjects();
    const project = projects.find(p => p.name.includes(categoryName))!;
    await sleep(500);
    
    const rewardIds = (quest.properties['Rewards'] as RelationPropertyValue).relation?.map(r => r?.id!);
    const rewards = await Promise.all(rewardIds.map(rid => notion.pages.retrieve({ page_id: rid })));
    const labels = await todoist.getAllLabels();
    const labelIds = rewards.map(r => 
        labels.find(l => 
            l.name.includes(
                (r.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text.replace(/ /g, '_')
            )
        )?.id!
    );
    await todoist.createNewTask({ content, description, priority, project_id: project.id, label_ids: labelIds, due_string: due });

    return `${emoji} ${name}${lengthContent}`;
}

export const questIsPlannedForToday = async (quest: Page) => {
    const name = (quest.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text;
    const allTasks = await todoist.getAllTasks();
    const questTasks = allTasks.filter(t => t.content.includes(name));
    const today = new Date().toISOString().substr(0,10);

    return questTasks.length === 0 || questTasks[0].due.date === today;
}