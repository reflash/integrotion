import { Context, NextFunction } from 'grammy';
import { IQuestNotionService } from '../../quests/notion';
import { IQuestTodoistService } from '../../quests/todoist';
import { ICommand } from '../common';

export class AddTaskCommand implements ICommand {
    constructor(private readonly questNotionService: IQuestNotionService, private readonly questTodoistService: IQuestTodoistService) {}

    public handle = async (ctx: Context, next: NextFunction) => {
        const taskName = ctx.match as string;
        const quest = await this.questNotionService.getQuestByName(taskName);
        const name = await this.questTodoistService.createQuestTask(quest, 'today 21:00');
        await ctx.reply(`Task added: ${name}`);
    };
}
