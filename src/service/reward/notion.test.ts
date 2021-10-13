import { Client } from '@notionhq/client/build/src';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { IRewardNotionService, RewardNotionService } from './notion';

describe('RewardNotionService', () => {
    const client = mockDeep<Client>();

    let service: IRewardNotionService;

    beforeEach(() => {
        mockReset(client);

        service = new RewardNotionService(client);
    });

    test('getRewardById | reward => parsed', async () => {
        const mockName = 'name';
        const mockRewardId = 'reward-id';
        const mockPage = {
            id: mockRewardId,
            properties: {
                Name: { title: [{ plain_text: mockName }] },
            },
        } as any;
        client.pages.retrieve.mockResolvedValue(mockPage);

        const reward = await service.getRewardById(mockRewardId);

        expect(reward.id).toBe(mockRewardId);
        expect(reward.name).toBe(mockName);
    });
});
