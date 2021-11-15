"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIncidentBody = void 0;
const configUtil_1 = require("../common/configUtil");
const SERVICE_ID = (0, configUtil_1.getConfig)('pagerduty.service');
const ESCALATION_POLICY_ID = (0, configUtil_1.getConfig)('pagerduty.policy');
function getIncidentBody(bodyParams) {
    const botTemplate = {
        incident: {
            title: 'incident integration test',
            service: {
                id: SERVICE_ID,
                type: 'service_reference',
            },
            body: {
                details: 'for test',
            },
            urgency: 'high',
            escalation_policy: {
                id: ESCALATION_POLICY_ID,
                type: 'escalation_policy_reference',
                summary: 'test policy',
            },
            // priority: {
            //     id: 'PIRSQ61',
            //     type: 'priority',
            // },
        },
    };
    const incidentBody = botTemplate.incident;
    incidentBody.title = bodyParams.title;
    incidentBody.body.details = bodyParams.description;
    if (bodyParams.urgency) {
        incidentBody.urgency = bodyParams.urgency;
    }
    // if (bodyParams.priority) {
    //     incidentBody.priority.id = bodyParams.priority;
    // }
    return botTemplate;
}
exports.getIncidentBody = getIncidentBody;
