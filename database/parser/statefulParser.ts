import moment from 'moment';
import { ICall } from '../interfaces/ICall';
import { QUERY_SUCCESS } from '../constants';
import { showError, } from '../handler/logHandler';
import { ContractNames as CN} from '../../registry/registry';
import {
    Base,
    TokenId,
    EventName as EV,
    GlobalNetwork as GN,
} from '../types';
import {
    errorObj,
    getNetwork,
    parseAmount
} from '../common/globalUtil';


const eventParser = (
    logs: any,
    eventName: string,
    contractName: string
): ICall => {
    try {
        let payload = {};
        const events = [];
        const transactions = [];

        for (const log of logs) {

            if (eventName === EV.DEPOSIT_HANDLER && contractName === CN.depositHandler) {
                payload = {
                    from: log.args.user,
                    referral: log.args.referral,
                    pid: null,
                    token_id: log.args.pwrd ? 2 : 1,
                    allowance: null,
                    amount1: parseAmount(log.args.tokens[0], Base.D6),
                    amount2: parseAmount(log.args.tokens[1], Base.D18),
                    amount3: parseAmount(log.args.tokens[2], Base.D6),
                    value: parseAmount(log.args[3], Base.D18),
                }
            } else if (eventName === EV.DEPOSIT_STAKER && contractName === CN.LPTokenStakerV2) {
                payload = {
                    from: log.args.user,
                    referral: '',
                    pid: parseInt(log.args.pid.toString()),
                    token_id: 3,
                    allowance: null,
                    amount1: parseAmount(log.args.amount, Base.D18),
                    amount2: 0,
                    amount3: 0,
                    value: 0,   //TODO
                }
            } else if (eventName === EV.WITHDRAWAL_HANDLER && contractName === CN.withdrawHandler) {
                payload = {
                    from: log.args.user,
                    pid: null,
                    amount1: parseAmount(log.args.tokenAmounts[0], Base.D6),
                    amount2: parseAmount(log.args.tokenAmounts[1], Base.D18),
                    amount3: parseAmount(log.args.tokenAmounts[2], Base.D6),
                    value: parseAmount(log.args.returnUsd, Base.D18),
                    referral: log.args.referral,
                    balanced: log.args.balanced,
                    all: log.args.all,
                    deductUsd: parseAmount(log.args.deductUsd, Base.D18),
                    lpAmount: parseAmount(log.args.lpAmount, Base.D18),
                    allowance: null,
                    totalLoss: null,
                    token_id: log.args.pwrd ? 2 : 1,
                }
            } else if (eventName === EV.TRANSFER) {
                payload = {
                    from: log.args.from,
                    to: log.args.to,
                    token_id: 3, // TODO: based on contract name
                    value: parseAmount(log.args.value, Base.D18),
                }
            }

            const timestamp = moment.utc();

            events.push({
                log_index: log.logIndex,
                transaction_id: log.transactionId,
                contract_address: log.address,
                log_name: log.name,
                ...payload,
                creation_date: timestamp,
            });

            transactions.push({
                transaction_id: log.transactionId,
                block_number: log.blockNumber,
                block_timestamp: log.blockTimestamp,
                block_date: log.blockDate,
                network_id: 1,  //TODO
                tx_hash: log.transactionHash,
                block_hash: log.blockHash,
                uncled: false,  //TODO
                creation_date: timestamp,
            });
        }

        // console.log(`parsed events:`, events);

        return {
            status: QUERY_SUCCESS,
            data: {
                events: events,
                transactions: transactions,
            },
        };
    } catch (err) {
        showError('statefulParser.ts->eventParser()', err);
        return errorObj(err);
    }
}

export {
    eventParser,
}
