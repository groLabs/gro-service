const { api: pagerdutyAPI } = require('@pagerduty/pdjs');
const { getIncidentBody } = require('./incidentBody');
const { getConfig } = require('../common/configUtil');

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
        throw new Error(data.error.message);
    } else {
        console.log(`incident: ${data.incident.incident_number}`);
    }
}

module.exports = {
    createIncident,
};
