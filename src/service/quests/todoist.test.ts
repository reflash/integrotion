// tslint:disable: no-magic-numbers
import { mock, mockReset } from 'jest-mock-extended';
import { TodoistApi } from '@doist/todoist-api-typescript';
import { ICategoryNotionService } from '../category/notion';
import { IRewardNotionService } from '../reward/notion';
import { IQuestTodoistService, QuestTodoistService } from './todoist';
import { Quest } from './types';

describe('QuestTodoistService', () => {
    const todoist = mock<TodoistApi>();
    const categoryService = mock<ICategoryNotionService>();
    const rewardService = mock<IRewardNotionService>();

    let service: IQuestTodoistService;

    beforeEach(() => {
        mockReset(todoist);
        mockReset(categoryService);
        mockReset(rewardService);

        service = new QuestTodoistService(categoryService, rewardService, () => todoist);
    });

    test('createQuestTask | quest => createds', async () => {
        const quest = {
            id: 'id',
            name: 'name',
            description: 'description',
            type: 'Daily',
            url: 'notion://example.com',
            priority: 2,
            emoji: '🧠',
            rewardIds: ['reward-id'],
            categoryId: 'category-id',
        } as Quest;
        const mockDue = 'today 21:00';
        const mockLength = 30;
        const mockLabelId = 'label-id';
        const mockProjectId = 'project-id';
        const lengthContent = ` (${mockLength}m)`;
        categoryService.getCategoryById.mockResolvedValue({ name: 'category-name' } as any);
        rewardService.getRewardById.mockResolvedValue({ name: '3 gold' } as any);
        todoist.getProjects.mockResolvedValue([{ id: mockProjectId, name: 'category-name' } as any]);
        todoist.getLabels.mockResolvedValue([{ id: mockLabelId, name: '🏅3_gold' } as any]);

        const text = await service.createQuestTask(quest, mockDue, mockLength);

        expect(text).toBe(`${quest.emoji} ${quest.name}${lengthContent}`);
        expect(todoist.addTask).toBeCalledWith({
            content: `**[${quest.type}]** ${quest.emoji} [${quest.name}](${quest.url})${lengthContent} | [NID](${quest.id})`,
            description: quest.description,
            priority: quest.priority,
            project_id: mockProjectId,
            label_ids: [mockLabelId],
            due_string: mockDue,
        });
    });
});
