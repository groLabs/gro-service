import { ICall } from '../interfaces/ICall';
import { errorObj } from '../common/globalUtil';
import { showError } from '../handler/logHandler';
import { QUERY_SUCCESS } from '../constants';
import { eventParserEth } from './statefulParserEth';
import { eventParserAvax } from './statefulParserAvax';
import {
    EventName as EV,
    NetworkId,
} from '../types';


/// @notice Parse transactions and events according to the DB model
/// @param  logs An array of raw events data
/// @param  eventName The event name
/// @param  contractName The contract name
/// @return An object with two arrays: parsed transactions and parsed events
///         ready to be inserted into the DB
const eventParser = async (
    networkId: NetworkId,
    logs: any,
    eventName: string,
    contractName: string
): Promise<ICall> => {
    try {
        let res;

        switch (networkId) {
            case NetworkId.MAINNET:
            case NetworkId.ROPSTEN:
                res = await eventParserEth(
                    logs,
                    eventName,
                    contractName
                );
                break;
            case NetworkId.AVALANCHE:
                res = await eventParserAvax(
                    logs,
                    eventName,
                    contractName
                );
                break;
            default:
                const msg = 'Network not found in eventParser()';
                showError('statefulParser.ts->eventParser()', msg);
                return errorObj(msg);
        }

        if (res.status === QUERY_SUCCESS) {
            return {
                status: QUERY_SUCCESS,
                data: {
                    events: res.data.events,
                    transactions: res.data.transactions,
                },
            };
        } else {
            return errorObj('Error after parsing in statfulParser.ts->eventParser()');
        }

    } catch (err) {
        showError('statefulParser.ts->eventParser()', err);
        return errorObj(err);
    }
}

export {
    eventParser,
}
