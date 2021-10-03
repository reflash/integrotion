import { MultiSelectPropertyValue, RelationPropertyValue, RichTextPropertyValue, TitlePropertyValue } from "@notionhq/client/build/src/api-types";
import { Bot, Context, NextFunction } from "grammy";
import { sleep } from "../utils";
import { notion } from "./notion";
import { todoist } from "./todoist";

export const bot = new Bot(process.env.BOT_TOKEN!);

// only specific user allowed
bot.use(async (ctx: Context, next: NextFunction): Promise<void> => {
    if (ctx.from?.id !== +process.env.USER_ID!)
        return;
    
    return next();
});

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
    return 'Unknown';
}

bot.command("addTask", async (ctx: Context) => {
    const taskName = ctx.match as string;
    const quests = await notion.databases.query({ database_id: process.env.QUEST_NOTION_DATABASE!, 
        filter: { property: 'Name', text: { contains: taskName }} 
    });
    const quest = quests.results[0];
    const id = quest.id;
    const emoji = (quest.properties['Emoji'] as RichTextPropertyValue).rich_text?.[0]?.plain_text;
    const name = (quest.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text;
    const description = (quest.properties['Description'] as RichTextPropertyValue).rich_text?.[0]?.plain_text;
    const tags = (quest.properties['Tags'] as MultiSelectPropertyValue).multi_select.map(ms => ms.name!);
    const isRepeating = tags.includes('repeating')
    const priority = isRepeating ? 2 : 3;
    const prefix = mapTagsToPrefix(tags);
    const url = quest.url.replace('https', 'notion');
    const content = `**[${prefix}]** ${emoji} [${name}](${url}) | [NID](${id})`;
  
    const categoryId = (quest.properties['Category'] as RelationPropertyValue).relation?.[0]?.id!;
    const category = await notion.pages.retrieve({ page_id: categoryId });
    const categoryName = (category.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text;
    const projects = await todoist.getAllProjects();
    const project = projects.find(p => p.name.includes(categoryName))!;
    await sleep(500);
    
    const rewardIds = (quest.properties['Rewards'] as RelationPropertyValue).relation?.map(r => r?.id!);
    const rewards = await Promise.all(rewardIds.map(rid => notion.pages.retrieve({ page_id: rid })))
    const labels = await todoist.getAllLabels();
    const labelIds = rewards.map(r => 
        labels.find(l => 
            l.name.includes(
                (r.properties['Name'] as TitlePropertyValue).title?.[0]?.plain_text.replace(' ', '_')
            )
        )?.id!
    );
    await todoist.createNewTask({ content, description, priority, project_id: project.id, label_ids: labelIds, due_string: 'today 21:00' });
    await ctx.reply(`Task added: ${name}`);
});