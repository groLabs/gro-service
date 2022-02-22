require('dotenv').config();
import { getPagerdutyIncidentSender } from './pagerdutyService';

getPagerdutyIncidentSender('default_sender')
    .sendIncident('2-test', '3-test')
    .then((result) => {
        const incidentNumber = result.incident?.incident_number;
        if (incidentNumber) {
            console.log('Create incident success.');
        } else {
            console.log('Create incident failed.');
        }
    });
