import { handlerAdapter, success } from '../utils/azure';
import { sleep } from '../utils';
import { verifyAchievements } from '../service/achievement';
import { bot } from '../service/bot';
import { handleTask } from '../service/quests';
import { parseTask } from '../service/todoist';

exports.handler = handlerAdapter(async ({ req }, itemAdded: any) => {
    try {
        if (itemAdded && itemAdded.event_data && itemAdded.event_name === 'item:completed') {
            const params = { id: itemAdded.event_data.id, ...parseTask(itemAdded.event_data.content)};
            await handleTask(params);
            await sleep(1100);
            await verifyAchievements();
        }
    }
    catch(e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e)}`;
        await bot.api.sendMessage(process.env.USER_ID!, message);
    }
    
    return success('Message processed');
});
