import moment from 'moment';
import { ICall } from '../interfaces/ICall';
import { showError, } from '../handler/logHandler';
import { ContractNames as CN } from '../../registry/registry';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import {
    Base,
    TokenId,
    NetworkId,
    EventName as EV,
} from '../types';
import {
    errorObj,
    parseAmount
} from '../common/globalUtil';


const eventParser = (
    networkId: NetworkId,
    logs: any,
    eventName: string,
    contractName: string
): ICall => {
    try {
        let payload = {};
        const events = [];
        const transactions = [];

        for (const log of logs) {

            // Deposits from Handler in ETH
            if (eventName === EV.LogNewDeposit && contractName === CN.depositHandler) {
                payload = {
                    from: log.args.user,
                    referral: log.args.referral,
                    pid: null,
                    token_id: log.args.pwrd ? TokenId.PWRD : TokenId.GVT,
                    allowance: null,
                    amount1: parseAmount(log.args.tokens[0], Base.D6),
                    amount2: parseAmount(log.args.tokens[1], Base.D18),
                    amount3: parseAmount(log.args.tokens[2], Base.D6),
                    value: parseAmount(log.args[3], Base.D18),
                }
                // Deposits from LPTokenStaker in ETH
            } else if (eventName === EV.LogDeposit && contractName === CN.LPTokenStakerV2) {
                payload = {
                    from: log.args.user,
                    referral: '',
                    pid: parseInt(log.args.pid.toString()),
                    token_id: TokenId.GRO,
                    allowance: null,
                    amount1: parseAmount(log.args.amount, Base.D18),
                    amount2: 0,
                    amount3: 0,
                    value: 0,   //TODO
                }
                // Deposits from Vaults in AVAX
            } else if (eventName === EV.LogDeposit && contractName.includes('Vault_v1_7')) { //TODO: other vaults?
                payload = {
                    from: log.args.from,
                    referral: '',
                    pid: null,
                    token_id: 6, // TODO
                    allowance: parseAmount(log.args.allowance, Base.D18),
                    amount1: parseAmount(log.args.shares, Base.D18),
                    amount2: 0,
                    amount3: 0,
                    value: parseAmount(log.args._amount, Base.D18),
                }
                // Withdrawals from Handler in ETH
            } else if (eventName === EV.LogNewWithdrawal && contractName === CN.withdrawHandler) {
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
                // Withdrawals from Vaults in AVAX
            } else if (eventName === EV.LogWithdrawal && contractName.includes('Vault_v1_7')) {
                payload = {
                    from: log.args.from,
                    pid: null,
                    amount1: parseAmount(log.args.shares, Base.D18),
                    amount2: 0,
                    amount3: 0,
                    value: parseAmount(log.args.value, Base.D18),
                    referral: '',
                    balanced: false,
                    all: false,
                    deductUsd: 0,
                    lpAmount: 0,
                    allowance: parseAmount(log.args.allowance, Base.D18),
                    totalLoss: parseAmount(log.args.totalLoss, Base.D18),
                    token_id: 6, // TODO
                }
                // Transfers in ETH
            } else if (eventName === EV.Transfer) {
                payload = {
                    from: log.args.from,
                    to: log.args.to,
                    token_id: 3, // TODO: based on contract name
                    value: parseAmount(log.args.value, Base.D18),
                }
                // Approvals in ETH
            } else if (eventName === EV.Approval) {
                payload = {
                    owner: log.args.owner,
                    spender: log.args.spender,
                    value: parseAmount(log.args.value, Base.D18), // TODO: if above MAX, set -1
                    token_id: 3, // TODO: based on contract name
                }
                // Claims from Hodler in ETH
            } else if (eventName === EV.LogBonusClaimed && contractName === CN.GroHodler) {
                payload = {
                    from: log.args.user,
                    pid: null,
                    vest: log.args.vest,
                    tranche_id: null,
                    amount: parseAmount(log.args.amount, Base.D18),
                }
                // Claims from LPTokenStakerV2 in ETH
            } else if ((eventName === EV.LogClaim || eventName === EV.LogMultiClaim)
                && contractName === CN.LPTokenStakerV2) {
                const pids = (eventName === EV.LogClaim)
                    ? [parseInt(log.args.pid.toString())]
                    : log.args.pids.map((pid: number) => parseInt(pid.toString()));
                payload = {
                    from: log.args.user,
                    pids: pids,
                    vest: log.args.vest,
                    tranche_id: null,
                    amount: parseAmount(log.args.amount, Base.D18),
                }
            } else {
                showError(
                    'statefulParser.ts->eventParser()',
                    `No parsing match for event <${eventName}> on contract <${contractName}>`
                );
                return {
                    status: QUERY_ERROR,
                    data: null
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
                network_id: networkId,
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
