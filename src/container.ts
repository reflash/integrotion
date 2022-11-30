import { Client } from '@notionhq/client/build/src';
import { Bot } from 'grammy';
import { TodoistApi } from '@doist/todoist-api-typescript';
import { AchievementNotionService } from './service/achievement/notion';
import { AddTaskCommand } from './service/bot/commands/addTask';
import { UserIdCheckMiddleware } from './service/bot/middlewares/userIdCheck';
import { CategoryNotionService } from './service/category/notion';
import { TodoistClientFactory } from './service/common';
import { QuestNotionService } from './service/quests/notion';
import { QuestTodoistService } from './service/quests/todoist';
import { RewardNotionService } from './service/reward/notion';

const client = new Client({
    auth: process.env.NOTION_TOKEN,
});

const todoistFactory: TodoistClientFactory = () => new TodoistApi(process.env.TODOIST_TOKEN!);
export const todoist = todoistFactory();
export const bot = new Bot(process.env.BOT_TOKEN!);
export const questNotionService = new QuestNotionService(client);
export const categoryNotionService = new CategoryNotionService(client);
export const rewardNotionService = new RewardNotionService(client);
export const achievementNotionService = new AchievementNotionService(client, bot);
export const questTodoistService = new QuestTodoistService(categoryNotionService, rewardNotionService, todoistFactory);
export const userIdCheckMiddleware = new UserIdCheckMiddleware();
export const addTaskCommand = new AddTaskCommand(questNotionService, questTodoistService);

bot.use(userIdCheckMiddleware.handle);
bot.command('addTask', addTaskCommand.handle);
