import { Client } from '@notionhq/client/build/src';
import { Bot } from 'grammy';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { AchievementNotionService, IAchievementNotionService } from './notion';

describe('AchievementNotionService', () => {
    const client = mockDeep<Client>();
    const bot = mockDeep<Bot>();

    let service: IAchievementNotionService;

    beforeEach(() => {
        mockReset(client);
        mockReset(bot);

        service = new AchievementNotionService(client, bot);
    });

    test('getNewAchievements | achievements => parsed', async () => {
        const mockName = 'name';
        const mockPoints = 10;
        const mockPage = {
            url: 'to-indicate-full-page',
            icon: { type: 'file', file: { url: 'https://example.com' } },
            properties: {
                Name: { title: [{ plain_text: mockName }] },
                'Achievement points (AP)': { number: mockPoints },
            },
        } as any;
        const mockResponse = { results: [mockPage] } as any;
        client.databases.query.mockResolvedValue(mockResponse);

        const achievements = await service.getNewAchievements();

        expect(achievements).not.toBeUndefined();
        expect(achievements.length).toBe(1);
        expect(achievements[0].name).toBe(mockName);
        expect(achievements[0].pictureUrl).toBe('https://example.com');
    });

    test('finalizeAchievement | achievements => parsed', async () => {
        const achievement = {
            id: 'id',
            name: 'name',
            pictureUrl: 'https://example.com',
            points: 10,
        };

        await service.finalizeAchievement(achievement);

        expect(client.pages.update).toBeCalledTimes(1);
        expect(bot.api.sendPhoto).toBeCalledTimes(1);
        expect(bot.api.sendMessage).toBeCalledTimes(1);
    });
});
