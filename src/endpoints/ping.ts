import { handlerAdapter, success } from '../utils/azure';

exports.handler = handlerAdapter(async ({ req }) => {
    return success('Message processed');
});
