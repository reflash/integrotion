import { handlerAdapter, success } from '../utils/azure';
import { sleep } from '../utils';
import { verifyAchievements } from '../service/achievement';
import { bot } from '../service/bot';
import { handleTask } from '../service/quests';
import { parseTask } from '../service/todoist';

exports.handler = handlerAdapter(async ({ req }) => {
    try {
        if (req && req.body && req.body.event_data && req.body.event_name === 'item:completed') {
            const params = { id: req.body.event_data.id, ...parseTask(req.body.event_data.content)};
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
