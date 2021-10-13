// tslint:disable: no-magic-numbers
import { achievementNotionService, bot } from '../container';
import { handleTask } from '../service/quests';
import { parseTask } from '../service/quests/todoist';
import { sleep } from '../utils';
import { handlerAdapter, success } from '../utils/azure';

exports.handler = handlerAdapter(async ({ req }, itemAdded: any) => {
    try {
        if (itemAdded && itemAdded.event_data && itemAdded.event_name === 'item:completed') {
            const params = { id: itemAdded.event_data.id, ...parseTask(itemAdded.event_data.content) };
            await handleTask(params);
            await sleep(1100);

            const achievements = await achievementNotionService.getNewAchievements();
            for (const achievement of achievements) {
                await achievementNotionService.finalizeAchievement(achievement);
                await sleep(1100);
            }
        }
    } catch (e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e)}`;
        await bot.api.sendMessage(process.env.USER_ID!, message);
    }

    return success('Message processed');
});
