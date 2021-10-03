import { Bot, Context, NextFunction } from "grammy";
import { todoist } from "./todoist";

export const bot = new Bot(process.env.BOT_TOKEN!);

// only specific user allowed
bot.use(async (ctx: Context, next: NextFunction): Promise<void> => {
    if (ctx.from?.id !== +process.env.USER_ID!)
        return;
    
    return next();
});

bot.command("addTask", async (ctx: Context) => {
    const taskName = ctx.match as string;
    await todoist.createNewTask({ content: taskName });
});