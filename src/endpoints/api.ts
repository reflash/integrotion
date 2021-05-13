import { handlerAdapter, success } from '../utils/azure';
import { container } from '../inversify.config';

exports.handler = handlerAdapter(async context => {
    return success('Message processed');
});
