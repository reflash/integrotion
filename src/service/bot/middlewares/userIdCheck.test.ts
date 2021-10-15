import { Context } from 'grammy';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { IMiddleware } from '../common';
import { UserIdCheckMiddleware } from './userIdCheck';

describe('UserIdCheckMiddleware', () => {
    const ctx = mockDeep<Context>();
    const adminUserId = '123';

    let middleware: IMiddleware;

    beforeEach(() => {
        mockReset(ctx);
        jest.resetModules();
        process.env = { USER_ID: adminUserId };

        middleware = new UserIdCheckMiddleware();
    });

    test('handle | correct id => next', async () => {
        // @ts-ignore
        ctx.from = { id: +adminUserId } as any;
        const mockNextRet = 'ret';
        const mockNext: any = () => mockNextRet;

        const ret = await middleware.handle(ctx, mockNext);

        expect(ret).toBe(mockNextRet);
    });

    test('handle | incorrect id => next', async () => {
        // @ts-ignore
        ctx.from = { id: 124 } as any;
        const mockNextRet = 'ret';
        const mockNext: any = () => mockNextRet;

        const ret = await middleware.handle(ctx, mockNext);

        expect(ret).toBeUndefined();
    });
});
