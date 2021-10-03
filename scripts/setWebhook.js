const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;
const exec = require('child_process').exec;

require('dotenv').config();

let webhookPort;

if (argv.port == null) {
    console.log('Local webhook port is not specified, will use 7071. Use --port to specify the local webhook port');
    argv.port = 7071;
}

webhookPort = argv.port;

const getNgrokTunnels = async () => {
    const ngrokTunnelsCmd = 'curl -s http://127.0.0.1:4040/api/tunnels';

    try {
        const result = await execLocal(ngrokTunnelsCmd);
        return result;
    } catch (e) {
        console.log('ERROR getting ngrok tunnels:', e);
    }
};

const setWebhook = async (targetUrl, webhook, token) => {
    const command = `curl -X POST ${targetUrl} -d '{"url": "${webhook}"}'`;

    try {
        const result = await execLocal(command);
        console.log('setWebhook finished successfully.');
        return result;
    } catch (e) {
        console.log('ERROR setting webhook:', e);
    }
};

const execLocal = command => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve(stdout);
        });
    });
};

const run = async () => {
    const tunnels = await getNgrokTunnels();
    const ngrokUrl = JSON.parse(tunnels).tunnels.filter(t => t.proto === 'https')[0].public_url;
    const publicUrl = `${ngrokUrl}/api/botWebhook`;
    console.log(publicUrl);

    const setWebhookUrl = `http://localhost:${webhookPort}/api/setBotWebhook`;

    const res = await setWebhook(setWebhookUrl, publicUrl);
    console.log(res);
};

run();
