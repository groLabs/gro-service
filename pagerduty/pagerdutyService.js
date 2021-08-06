const { api: pagerdutyAPI } = require('@pagerduty/pdjs');
const { getIncidentBody } = require('./incidentBody');
const { getConfig } = require('../common/configUtil');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

const pagerdutyToken = getConfig('pagerduty.token');
const fromAccount = getConfig('pagerduty.from', false) || '';

const pagerduty = new pagerdutyAPI({ token: pagerdutyToken });

async function createIncident(bodyParams) {
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

module.exports = {
    createIncident,
};
