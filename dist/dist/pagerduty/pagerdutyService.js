"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIncident = void 0;
const pdjs_1 = require("@pagerduty/pdjs");
const incidentBody_1 = require("./incidentBody");
const configUtil_1 = require("../common/configUtil");
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
const pagerdutyToken = (0, configUtil_1.getConfig)('pagerduty.token');
const fromAccount = (0, configUtil_1.getConfig)('pagerduty.from', false) || '';
//@ts-ignore
const pagerduty = new pdjs_1.api({ token: pagerdutyToken });
const nodeEnv = process.env.NODE_ENV;
async function createIncident(bodyParams) {
    if (nodeEnv !== 'mainnet')
        return; // only create pagerduty's incident on mainnet
    const incidentBody = (0, incidentBody_1.getIncidentBody)(bodyParams);
    const result = await pagerduty.post('/incidents', {
        data: incidentBody,
        headers: { from: fromAccount },
    });
    const { data } = result;
    if (data.error) {
        logger.error(data.error.errors);
        throw new Error(data.error.message);
    }
    else {
        logger.info(`trigger new incident ${bodyParams.title} : ${data.incident.incident_number}`);
    }
}
exports.createIncident = createIncident;
