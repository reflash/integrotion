import { Bot, Context, NextFunction } from "grammy";
import { notion } from "./notion";
import { createQuest, todoist } from "./todoist";

export const bot = new Bot(process.env.BOT_TOKEN!);

// only specific user allowed
bot.use(async (ctx: Context, next: NextFunction): Promise<void> => {
    if (ctx.from?.id !== +process.env.USER_ID!)
        return;
    
    return next();
});

bot.command("addTask", async (ctx: Context) => {
    const taskName = ctx.match as string;
    const quests = await notion.databases.query({ database_id: process.env.QUEST_NOTION_DATABASE!, 
        filter: { property: 'Name', text: { contains: taskName }} 
    });
    const quest = quests.results[0];
    const name = await createQuest(quest, 'today 21:00');
    await ctx.reply(`Task added: ${name}`);
});