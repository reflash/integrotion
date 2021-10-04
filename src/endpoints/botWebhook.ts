import { handlerAdapter, notFound, success } from '../utils/azure';
import { bot } from '../service/bot';

exports.handler = handlerAdapter(async ({ req }) => {
    if (!req) return notFound('No request object');
    try {
        await bot.init();
        const update = req.body;
        await bot.handleUpdate(update);
    } catch(e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`;
        var s = new Readable()
        s.push(message);
        s.push(null);
        await bot.api.sendDocument(process.env.USER_ID!, message);
    }
    

    return success('Message processed');
});
