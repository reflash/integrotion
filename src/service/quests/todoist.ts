import TodoistApiREST, { CreateTaskParameters } from 'todoist-api-ts';
import { todoist } from '../../container';
import { sleep } from '../../utils';
import { ICategoryNotionService } from '../category/notion';
import { TodoistClientFactory } from '../common';
import { IRewardNotionService } from '../reward/notion';
import { Quest } from './types';

export type TaskParams = {
    id: number;
    task: string;
    type: string;
    nid: string;
};

export const parseTask = (content: string) => {
    const text = content;
    const match = /^\*\*[\\]?\[(?<type>[^\]\\]+)[\\]?\]\*\*(?<task>[^|]+)(\|\s\[NID\]\((?<nid>.+)\))?/.exec(text);

    if (!match || !match.groups) throw new Error('No matches in item');

    const type = match.groups['type'];
    const task = match.groups['task'].trim();
    const nid = match.groups['nid'];

    return { type, task, nid };
};

export interface IQuestTodoistService {
    createQuestTask(quest: Quest, due: string, length?: number): Promise<string>;
    getTaskIdByName(name: string): Promise<number>;
    updateTaskName(taskId: number, newName: string): Promise<any>;
    deleteTaskSubtasks(taskId: number): Promise<any>;
}
export class QuestTodoistService implements IQuestTodoistService {
    constructor(
        private readonly categoryService: ICategoryNotionService,
        private readonly rewardService: IRewardNotionService,
        private readonly todoistFactory: TodoistClientFactory,
    ) {}

    public createQuestTask = async (quest: Quest, due?: string, length?: number, parentId?: number) => {
        const todoist = this.todoistFactory();
        const lengthContent = length ? ` (${length}m)` : '';
        const createParams = await this.mapQuestToTask(todoist, quest, due, lengthContent, parentId);
        await todoist.createNewTask(createParams);

        return `${quest.emoji} ${quest.name}${lengthContent}`;
    };

    public getTaskIdByName = async (name: string) => {
        const todoist = this.todoistFactory();
        const allTasks = await todoist.getAllTasks();
        const tasks = allTasks.filter(t => t.content.includes(name));
        const task = tasks[0];
        return task.id;
    };

    public updateTaskName = async (taskId: number, newName: string) => {
        const todoist = this.todoistFactory();
        await todoist.updateTaskById(taskId, { content: newName } as any);
    };

    public deleteTaskSubtasks = async (taskId: number) => {
        const todoist = this.todoistFactory();
        const allTasks = await todoist.getAllTasks();
        const subtasks = allTasks.filter(t => t.parent_id === taskId);

        await Promise.all(subtasks.map(st => this.deleteTask(st.id)));
    };

    private readonly deleteTask = async (taskId: number) => {
        const todoist = this.todoistFactory();
        await todoist.deleteTaskById(taskId);
    };

    private readonly mapQuestToTask = async (
        todoist: TodoistApiREST,
        quest: Quest,
        due?: string,
        lengthContent?: string,
        parentId?: number,
    ): Promise<CreateTaskParameters> => {
        const content = `**[${quest.type}]** ${quest.emoji} [${quest.name}](${quest.url})${lengthContent} | [NID](${quest.id})`;
        const project = await this.getQuestProject(todoist, quest);
        // tslint:disable-next-line: no-magic-numbers
        await sleep(500);
        const labelIds = await this.getQuestLabels(todoist, quest);

        return {
            content,
            description: quest.description,
            parent_id: parentId,
            priority: quest.priority,
            project_id: project.id,
            label_ids: labelIds,
            due_string: due,
        };
    };

    private readonly getQuestProject = async (todoist: TodoistApiREST, quest: Quest) => {
        const category = await this.categoryService.getCategoryById(quest.categoryId);
        const projects = await todoist.getAllProjects();
        return projects.find(p => p.name.includes(category.name))!;
    };

    private readonly getQuestLabels = async (todoist: TodoistApiREST, quest: Quest) => {
        const rewards = await Promise.all(quest.rewardIds.map(this.rewardService.getRewardById));
        const labels = await todoist.getAllLabels();
        const filteredLabels = rewards.map(r =>
            labels.find(l =>
                l.name.includes(
                    // NOTE: labels in todoist have not spaces (substituted with underscore symbol)
                    r.name.replace(/ /g, '_'),
                ),
            ),
        );

        return filteredLabels.map(l => l?.id!);
    };
}
