import { QueueServiceClient } from '@azure/storage-queue';
import { InputFile } from 'grammy';
import { bot } from '../container';
import { stringToReadable } from '../utils';
import { handlerAdapter, success } from '../utils/azure';

exports.handler = handlerAdapter(async ({ req }) => {
    try {
        if (req && req.body && req.body.event_data && req.body.event_name === 'item:completed') {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
            const queueName = 'todoist';
            const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
            const queueClient = queueServiceClient.getQueueClient(queueName);
            await queueClient.createIfNotExists();

            const message = Buffer.from(JSON.stringify(req.body)).toString('base64');
            await queueClient.sendMessage(message);
        }
    } catch (e) {
        const message = `Request: ${JSON.stringify(req)}\nError: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`;
        const stream = stringToReadable(message);
        await bot.api.sendDocument(process.env.USER_ID!, new InputFile(stream, `todoistWebhook-error-${Date.now().toLocaleString()}`));
    }

    return success('Message processed');
});
