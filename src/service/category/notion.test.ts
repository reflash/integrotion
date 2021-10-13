import { Client } from '@notionhq/client/build/src';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { CategoryNotionService, ICategoryNotionService } from './notion';

describe('CategoryNotionService', () => {
    const client = mockDeep<Client>();

    let service: ICategoryNotionService;

    beforeEach(() => {
        mockReset(client);

        service = new CategoryNotionService(client);
    });

    test('getCategoryById | category => parsed', async () => {
        const mockName = 'name';
        const mockId = 'category-id';
        const mockPage = {
            id: mockId,
            icon: { type: 'file', file: { url: 'https://example.com' } },
            properties: {
                Name: { title: [{ plain_text: mockName }] },
            },
        } as any;
        client.pages.retrieve.mockResolvedValue(mockPage);

        const category = await service.getCategoryById(mockId);

        expect(category.id).toBe(mockId);
        expect(category.name).toBe(mockName);
        expect(category.pictureUrl).toBe('https://example.com');
    });
});
