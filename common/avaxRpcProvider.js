const { UrlJsonRpcProvider } = require('@ethersproject/providers');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

const defaultApiKey = 'urlPrcProvider';

class AvaxPrcProvider extends UrlJsonRpcProvider {
    static getWebSocketProvider(network, apiKey) {
        throw new Error('Not implemented');
    }

    static getApiKey(apiKey) {
        return defaultApiKey;
    }

    static getUrl(network, apiKey) {
        let host = null;
        switch (network.name) {
            case 'homestead':
                host = 'api.avax.network/ext/bc/C/rpc';
                break;
            default:
                logger.throwArgumentError(
                    'unsupported network',
                    'network',
                    network
                );
        }

        return {
            allowGzip: true,
            url: `https://${host}`,
            throttleCallback: (attempt, url) => Promise.resolve(true),
        };
    }

    isCommunityResource() {
        return this.apiKey === defaultApiKey;
    }
}

module.exports = {
    AvaxPrcProvider,
};
