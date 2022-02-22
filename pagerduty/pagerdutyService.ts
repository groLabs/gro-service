import { getConfig } from '../common/configUtil';
import { PagerdutyError } from '../common/error';
import { PagerdutyIncidentSender } from './pagerdutySender';

const pagerdutyToken = getConfig('pagerduty.token');
const fromAccount = getConfig('pagerduty.from', false) || '';
const senders = getConfig('pagerduty.senders');
const incidentSenders = {};
function getPagerdutyIncidentSender(senderName): PagerdutyIncidentSender {
    if (!senders[senderName]) {
        throw new PagerdutyError(`No named ${senderName} is setted up.`);
    }
    if (!incidentSenders[senderName]) {
        const { service, priority, urgency, policy } = senders[senderName];
        incidentSenders[senderName] = new PagerdutyIncidentSender(
            pagerdutyToken,
            fromAccount,
            'incident',
            { id: priority, type: 'priority_reference' },
            { id: service, type: 'service_reference' },
            { id: policy, type: 'escalation_policy_reference' },
            urgency
        );
    }
    return incidentSenders[senderName];
}

export { getPagerdutyIncidentSender };
