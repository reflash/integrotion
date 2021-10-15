import { Context, NextFunction } from 'grammy';
import { IMiddleware } from '../common';

export class UserIdCheckMiddleware implements IMiddleware {
    public async handle(ctx: Context, next: NextFunction) {
        if (ctx.from?.id !== +process.env.USER_ID!) return;

        return next();
    }
}
