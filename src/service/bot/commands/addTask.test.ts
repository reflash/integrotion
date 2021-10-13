import { Context } from 'grammy';
import { mock, mockDeep, mockReset } from 'jest-mock-extended';
import { IQuestNotionService } from '../../quests/notion';
import { IQuestTodoistService } from '../../quests/todoist';
import { ICommand } from '../common';
import { AddTaskCommand } from './addTask';

describe('AddTaskCommand', () => {
    const ctx = mockDeep<Context>();
    const questNotionService = mock<IQuestNotionService>();
    const questTodoistService = mock<IQuestTodoistService>();
    const taskName = 'task';

    let command: ICommand;

    beforeEach(() => {
        mockReset(ctx);
        mockReset(questNotionService);
        mockReset(questTodoistService);

        // @ts-ignore
        ctx.match = taskName;
        command = new AddTaskCommand(questNotionService, questTodoistService);
    });

    test('handle | correct id => next', async () => {
        questNotionService.getQuestByName.mockResolvedValue({} as any);
        questTodoistService.createQuestTask.mockResolvedValue(taskName);
        await command.handle(ctx);

        expect(ctx.reply).toBeCalledWith(`Task added: ${taskName}`);
    });
});
