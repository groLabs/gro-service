import { getConfig } from '../common/configUtil';

const SERVICE_ID = getConfig('pagerduty.service');

function parsePolicyTypeFromDescription(description) {
    let policyType = 'warn';
    const re = /\[([A-Z]+)\]/;
    const result = re.exec(description);
    if (result && result[1]) {
        policyType = result[1].toLowerCase();
    }
    return policyType;
}

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
                id: '',
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
    //full up policy
    const policy = incidentBody.escalation_policy;
    const policyType = parsePolicyTypeFromDescription(bodyParams.description);
    const policyInfo = getConfig(`pagerduty.policies.${policyType}`);
    policy.id = policyInfo.id;
    policy.type = policyInfo.type;
    policy.summary = policyInfo.summary;

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

export { getIncidentBody };
