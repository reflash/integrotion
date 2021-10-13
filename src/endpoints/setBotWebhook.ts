import { Bot } from 'grammy';
import { handlerAdapter, notFound, success } from '../utils/azure';

exports.handler = handlerAdapter(async ({ req }) => {
    if (!req) return notFound('No request object');

    const { url } = req.body;
    const bot = new Bot(process.env.BOT_TOKEN!);
    await bot.api.setWebhook(url);

    return success(`Webhook is set to ${url}`);
});
