function getIncidentBody(bodyParams) {
    const botTemplate = {
        incident: {
            title: 'TODO', // The incident's title
            service: {
                id: 'PCYAPT2', // Gro service
                type: 'service_reference',
            },
            body: {
                details: 'TODO', // The incident's summary
            },
            urgency: 'low',
            escalation_policy: {
                id: 'PSWO8ON', // policy's id, here is test policy - many responders
                onCall: [],
                escalationRules: [
                    // responders list
                    {
                        id: 'PNJ22ZM',
                        escalation_delay_in_minutes: 30,
                        targets: [
                            {
                                id: 'P4J0RBD',
                                type: 'user_reference',
                                summary: 'Wei',
                            },
                            {
                                id: 'PPGE4VZ',
                                type: 'user_reference',
                                summary: 'lily hu',
                            },
                        ],
                    },
                ],
                type: 'escalation_policy',
                summary: 'test policy - many responders',
            },
            priority: {
                id: 'PEF4PTB', // P3's id
                type: 'priority',
            },
        },
    };
    const incidentBody = botTemplate.incident;
    incidentBody.title = bodyParams.title;
    incidentBody.body.details = bodyParams.description;
    return botTemplate;
}

module.exports = {
    getIncidentBody,
};
