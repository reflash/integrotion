import { Context, NextFunction } from 'grammy';

export interface IMiddleware {
    handle(ctx: Context, next?: NextFunction): Promise<void>;
}

export interface ICommand extends IMiddleware {}
