import { api as pagerdutyAPI } from '@pagerduty/pdjs';
import { getIncidentBody } from './incidentBody';
import { getConfig } from '../common/configUtil';

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

const pagerdutyToken = getConfig('pagerduty.token');
const fromAccount = getConfig('pagerduty.from', false) || '';
//@ts-ignore
const pagerduty = new pagerdutyAPI({ token: pagerdutyToken });

const nodeEnv = process.env.NODE_ENV;

async function createIncident(bodyParams) {
    if (nodeEnv !== 'mainnet') return; // only create pagerduty's incident on mainnet
    const incidentBody = getIncidentBody(bodyParams);
    const result = await pagerduty.post('/incidents', {
        data: incidentBody,
        headers: { from: fromAccount },
    });
    const { data } = result;
    if (data.error) {
        logger.error(data.error.errors);
        throw new Error(data.error.message);
    } else {
        logger.info(
            `trigger new incident ${bodyParams.title} : ${data.incident.incident_number}`
        );
    }
}

export {
    createIncident,
};
