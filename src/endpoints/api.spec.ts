// tslint:disable: no-magic-numbers
import { interfaces } from 'inversify';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { container } from '../inversify.config';
import * as apiModule from './api';

describe('api function', () => {

    beforeAll(() => {
    });

    beforeEach(() => {
    });

    test('message processed', async () => {
        expect.assertions(1);

        const context = {
            req: {
                body: {},
            },
            res: undefined as any,
        };

        const api = (apiModule as any).handler;
        await api(context);

        // tslint:disable-next-line: no-magic-numbers
        expect(context.res.statusCode).toBe(200);
    });
});
