import { handlerAdapter, success } from '../utils/azure';
import { bot } from '../service/bot';
import { InputFile } from 'grammy';
import { stringToReadable } from '../utils';
import { createRandomQuests } from '../service/quests';

exports.handler = handlerAdapter(async ({ req }) => {
    try {
        await createRandomQuests();
    }
    catch(e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`;
        const stream = stringToReadable(message);
        await bot.api.sendDocument(process.env.USER_ID!, new InputFile(stream));
    }
    
    return success('Message processed');
});
