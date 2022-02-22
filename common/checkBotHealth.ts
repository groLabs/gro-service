import fetch from 'node-fetch';
import { sendAlertMessage } from './alertMessageSender';

async function sendHealthCheckFailedAlert(
    type: string,
    url: string
): Promise<void> {
    let discordDescription: string;
    let pagerdutyDescription: string;
    let pagerdutyTitle: string;
    if (type === 'stats') {
        discordDescription = `[CRIT] B14 - BotLiveCheck | stats bot ${url} is not running`;
        pagerdutyDescription = `[CRIT] B14 - BotLiveCheck | stats bot ${url} is not running`;
        pagerdutyTitle = '[CRIT] B14 - BotLiveCheck | stats bot is not running';
    } else if (type === 'critic') {
        discordDescription = `[CRIT] B12 - BotLiveCheck | critical bot ${url} is not running`;
        pagerdutyDescription = `[CRIT] B12 - BotLiveCheck | critical bot ${url} is not running`;
        pagerdutyTitle =
            '[CRIT] B14 - BotLiveCheck | critical bot is not running';
    } else if (type === 'harvest') {
        discordDescription = `[CRIT] B13 - BotLiveCheck | harvest bot ${url} is not running`;
        pagerdutyDescription = `[CRIT] B13 - BotLiveCheck | harvest bot ${url} is not running`;
        pagerdutyTitle =
            '[CRIT] B14 - BotLiveCheck | harvest bot is not running';
    }
    sendAlertMessage({
        discord: {
            description: discordDescription,
        },
        pagerduty: {
            title: pagerdutyTitle,
            details: pagerdutyDescription,
        },
    });
}

async function checkServerHealth(
    type: string,
    urls: string[],
    logger: { info: (arg0: string) => void }
): Promise<void> {
    for (let i = 0; i < urls.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        if (urls[i] !== undefined && urls[i] !== '') {
            const response = await fetch(urls[i]).catch((e) => {
                logger.info(`fetch botLiveCheck error ${urls[i]} ${e}`);
                sendHealthCheckFailedAlert(type, urls[i]);
            });
            // eslint-disable-next-line no-await-in-loop
            if (response) {
                const data = await response.json();
                if (response.ok && data.status === 'UP') {
                    logger.info(`botLiveCheck pass ${urls[i]}`);
                } else {
                    logger.info(
                        `botLiveCheck response ${JSON.stringify(data)}`
                    );
                    sendHealthCheckFailedAlert(type, urls[i]);
                }
            }
        } else {
            logger.info(`botLiveCheck url is empty ${urls[i]}`);
        }
    }
}

export { checkServerHealth };
