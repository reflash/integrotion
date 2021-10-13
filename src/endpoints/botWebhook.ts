import { InputFile } from 'grammy';
import { bot } from '../container';
import { stringToReadable } from '../utils';
import { handlerAdapter, notFound, success } from '../utils/azure';

exports.handler = handlerAdapter(async ({ req }) => {
    if (!req) return notFound('No request object');
    try {
        await bot.init();
        const update = req.body;
        await bot.handleUpdate(update);
    } catch (e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`;
        const stream = stringToReadable(message);
        await bot.api.sendDocument(process.env.USER_ID!, new InputFile(stream));
    }

    return success('Message processed');
});
