import { handlerAdapter, notFound, success } from '../utils/azure';
import { bot } from '../service/bot';

exports.handler = handlerAdapter(async ({ req }) => {
    if (!req) return notFound('No request object');
    
    await bot.init();
    const update = req.body;
    await bot.handleUpdate(update);

    return success('Message processed');
});
