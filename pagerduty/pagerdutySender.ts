import { api as pagerdutyAPI } from '@pagerduty/pdjs';
import { PagerdutyError } from '../common/error';

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

export type NormalFieldObject = {
    id: string;
    type: string;
};

export type UrgencyType = 'high' | 'low';

export class PagerdutyIncidentSender {
    readonly type: string;
    readonly service: NormalFieldObject;
    readonly priority: NormalFieldObject;
    readonly urgency: UrgencyType;
    readonly escalationPolicy: NormalFieldObject;

    readonly fromAccount: string;
    readonly pagerdutyInstance: any;

    constructor(
        _apiToken: string,
        _fromAccount: string,
        _type: string,
        _priority: NormalFieldObject,
        _service: NormalFieldObject,
        _escalationPolicy: NormalFieldObject,
        _urgency: UrgencyType
    ) {
        this.type = _type;
        this.service = _service;
        this.priority = _priority;
        this.urgency = _urgency;
        this.escalationPolicy = _escalationPolicy;
        //@ts-ignore
        this.pagerdutyInstance = new pagerdutyAPI({ token: _apiToken });
        this.fromAccount = _fromAccount;
    }

    async sendIncident(title: string, bodyDetail: string) {
        if (process.env.NODE_ENV !== 'mainnet') return;
        const requestBody = this.getRequestBody(title, bodyDetail);
        const result = await this.pagerdutyInstance.post('/incidents', {
            data: requestBody,
            headers: { from: this.fromAccount },
        });
        const { data } = result;
        if (data.error) {
            throw new PagerdutyError(data.error.message);
        } else {
            logger.info(
                `trigger new incident ${title} : ${data.incident.incident_number}`
            );
        }
        return data;
    }

    private getRequestBody(title: string, bodyDetail: string) {
        return {
            incident: {
                title,
                body: {
                    type: 'incident_body',
                    details: bodyDetail,
                },
                type: this.type,
                service: this.service,
                priority: this.priority,
                urgency: this.urgency,
                escalation_policy: this.escalationPolicy,
            },
        };
    }
}
