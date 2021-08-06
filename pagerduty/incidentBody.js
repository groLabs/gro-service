function getIncidentBody(bodyParams) {
    const botTemplate = {
        incident: {
            title: 'incident integration test',
            service: {
                id: 'PCYAPT2',
                type: 'service_reference',
            },
            body: {
                details: 'for test',
            },
            urgency: 'high',
            escalation_policy: {
                id: 'P48J3J5',
                type: 'escalation_policy_reference',
                summary: 'test policy',
            },
            priority: {
                id: 'PIRSQ61',
                type: 'priority',
            },
        },
    };
    const incidentBody = botTemplate.incident;
    incidentBody.title = bodyParams.title;
    incidentBody.body.details = bodyParams.description;
    if (bodyParams.urgency) {
        incidentBody.urgency = bodyParams.urgency;
    }
    if (bodyParams.priority) {
        incidentBody.priority.id = bodyParams.priority;
    }

    return botTemplate;
}

module.exports = {
    getIncidentBody,
};
