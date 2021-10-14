// tslint:disable: no-magic-numbers
import { Client } from '@notionhq/client/build/src';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { IQuestNotionService, QuestNotionService } from './notion';

describe('QuestNotionService', () => {
    const client = mockDeep<Client>();

    let service: IQuestNotionService;

    beforeEach(() => {
        mockReset(client);

        service = new QuestNotionService(client);
    });

    test('getQuestByName | quest => parsed', async () => {
        const mockName = 'name';
        const mockDescription = 'description';
        const mockEmoji = '🧠';
        const mockCategoryId = 'category-id';
        const mockRewardId = 'reward-id';
        const mockPage = {
            url: 'https://example.com',
            icon: { type: 'file', file: { url: 'https://example.com' } },
            properties: {
                Name: { title: [{ plain_text: mockName }] },
                Description: { rich_text: [{ plain_text: mockDescription }] },
                Emoji: { rich_text: [{ plain_text: mockEmoji }] },
                Tags: { multi_select: [{ name: 'quest' }] },
                Category: { relation: [{ id: mockCategoryId }] },
                Rewards: { relation: [{ id: mockRewardId }] },
            },
        } as any;
        const mockResponse = { results: [mockPage] } as any;
        client.databases.query.mockResolvedValue(mockResponse);

        const quest = await service.getQuestByName(mockName);

        expect(quest.name).toBe(mockName);
        expect(quest.description).toBe(mockDescription);
        expect(quest.emoji).toBe(mockEmoji);
        expect(quest.pictureUrl).toBe('https://example.com');
        expect(quest.priority).toBe(3);
        expect(quest.type).toBe('Quest');
        expect(quest.url).toBe('notion://example.com');
        expect(quest.categoryId).toBe(mockCategoryId);
        expect(quest.rewardIds.length).toBe(1);
        expect(quest.rewardIds[0]).toBe(mockRewardId);
    });

    test('getQuestByName | daily => parsed', async () => {
        const mockName = 'name';
        const mockDescription = 'description';
        const mockEmoji = '🧠';
        const mockCategoryId = 'category-id';
        const mockRewardId = 'reward-id';
        const mockPage = {
            url: 'https://example.com',
            icon: { type: 'file', file: { url: 'https://example.com' } },
            properties: {
                Name: { title: [{ plain_text: mockName }] },
                Description: { rich_text: [{ plain_text: mockDescription }] },
                Emoji: { rich_text: [{ plain_text: mockEmoji }] },
                Tags: { multi_select: [{ name: 'repeating' }, { name: 'daily' }] },
                Category: { relation: [{ id: mockCategoryId }] },
                Rewards: { relation: [{ id: mockRewardId }] },
                'Max times completed in a row': { number: 1 },
                'Times completed': { number: 1 },
                'Times completed in a row': { number: 1 },
            },
        } as any;
        const mockResponse = { results: [mockPage] } as any;
        client.databases.query.mockResolvedValue(mockResponse);

        const quest = await service.getQuestByName(mockName);

        expect(quest.name).toBe(mockName);
        expect(quest.description).toBe(mockDescription);
        expect(quest.emoji).toBe(mockEmoji);
        expect(quest.pictureUrl).toBe('https://example.com');
        expect(quest.priority).toBe(2);
        expect(quest.type).toBe('Daily');
        expect(quest.url).toBe('notion://example.com');
        expect(quest.categoryId).toBe(mockCategoryId);
        expect(quest.rewardIds.length).toBe(1);
        expect(quest.rewardIds[0]).toBe(mockRewardId);
        expect(quest.repeating).not.toBeUndefined();
        expect(quest.repeating?.maxInARow).toBe(1);
        expect(quest.repeating?.timesCompleted).toBe(1);
        expect(quest.repeating?.timesCompletedInARow).toBe(1);
    });

    test('getQuestByName | random => parsed', async () => {
        const mockName = 'name';
        const mockDescription = 'description';
        const mockEmoji = '🧠';
        const mockCategoryId = 'category-id';
        const mockRewardId = 'reward-id';
        const mockStartTime = 'start-time';
        const mockQuestId = 'quest-id';
        const mockPage = {
            url: 'https://example.com',
            icon: { type: 'file', file: { url: 'https://example.com' } },
            properties: {
                Name: { title: [{ plain_text: mockName }] },
                Description: { rich_text: [{ plain_text: mockDescription }] },
                Emoji: { rich_text: [{ plain_text: mockEmoji }] },
                Tags: { multi_select: [{ name: 'repeating' }, { name: 'random' }] },
                Category: { relation: [{ id: mockCategoryId }] },
                Rewards: { relation: [{ id: mockRewardId }] },
                'Max times completed in a row': { number: 1 },
                'Times completed': { number: 1 },
                'Times completed in a row': { number: 1 },
                'Start time': { rich_text: [{ plain_text: mockStartTime }] },
                'Group 1 selection amount': { number: 1 },
                'Group 2 selection amount': { number: 2 },
                'Group 1 length (minutes)': { number: 30 },
                'Group 2 length (minutes)': { number: 15 },
                'Children (Random - Group 1)': { relation: [{ id: mockQuestId }] },
                'Children (Random - Group 2)': { relation: [{ id: mockQuestId }] },
            },
        } as any;
        const mockResponse = { results: [mockPage] } as any;
        client.databases.query.mockResolvedValue(mockResponse);

        const quest = await service.getQuestByName(mockName);

        expect(quest.name).toBe(mockName);
        expect(quest.description).toBe(mockDescription);
        expect(quest.emoji).toBe(mockEmoji);
        expect(quest.pictureUrl).toBe('https://example.com');
        expect(quest.priority).toBe(2);
        expect(quest.type).toBe('Repeating');
        expect(quest.url).toBe('notion://example.com');
        expect(quest.categoryId).toBe(mockCategoryId);
        expect(quest.rewardIds.length).toBe(1);
        expect(quest.rewardIds[0]).toBe(mockRewardId);
        expect(quest.repeating).not.toBeUndefined();
        expect(quest.repeating?.maxInARow).toBe(1);
        expect(quest.repeating?.timesCompleted).toBe(1);
        expect(quest.repeating?.timesCompletedInARow).toBe(1);
        expect(quest.random).not.toBeUndefined();
        expect(quest.random?.startTime).toBe(mockStartTime);
        expect(quest.random?.group1Amount).toBe(1);
        expect(quest.random?.group2Amount).toBe(2);
        expect(quest.random?.group1Length).toBe(30);
        expect(quest.random?.group2Length).toBe(15);
        expect(quest.random?.group1Ids).toStrictEqual([mockQuestId]);
        expect(quest.random?.group2Ids).toStrictEqual([mockQuestId]);
    });
});
