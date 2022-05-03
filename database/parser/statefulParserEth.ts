import { ICall } from '../interfaces/ICall';
import { showError } from '../handler/logHandler';
import { getTokenIdByContractName } from '../common/statefulUtil';
import {
    MAX_NUMBER,
    QUERY_ERROR,
    QUERY_SUCCESS,
} from '../constants';
import {
    Base,
    TokenId,
    EventName as EV,
} from '../types';
import {
    errorObj,
    parseAmount
} from '../common/globalUtil';


const eventParserEth = async (
    logs: any,
    eventName: string,
    contractName: string
): Promise<ICall> => {
    try {
        let payload = {};
        const events = [];
        const transactions = [];

        for (const log of logs) {

            // Deposits in Handler
            if (eventName === EV.LogNewDeposit) {
                payload = {
                    from: log.args.user,
                    referral: log.args.referral,
                    pid: null,
                    token_id: log.args.pwrd ? TokenId.PWRD : TokenId.GVT,
                    allowance: null,
                    amount1: parseAmount(log.args.tokens[0], Base.D18), // DAI
                    amount2: parseAmount(log.args.tokens[1], Base.D6),  // USDC
                    amount3: parseAmount(log.args.tokens[2], Base.D6),  // USDT
                    value: parseAmount(log.args[3], Base.D18),
                }
                // TODO: what about LPTokenStakerV1 for IDL?
                // Deposits in LPTokenStaker
            } else if (eventName === EV.LogDeposit) {
                payload = {
                    from: log.args.user,
                    referral: null,
                    pid: parseInt(log.args.pid.toString()),
                    token_id: TokenId.GRO,
                    allowance: null,
                    amount1: parseAmount(log.args.amount, Base.D18),
                    amount2: null,
                    amount3: null,
                    value: null,   //TODO
                }
                // Multi-withdrawals from LPTokenStakerV2 in ETH
            } else if (eventName === EV.LogMultiWithdraw) {
                const pids = log.args.pids.map((pid: number) => parseInt(pid.toString()));
                const amounts = log.args.amounts.map((amount: number) => parseAmount(amount, Base.D18));
                payload = {
                    from: log.args.user,
                    pids: pids,
                    amounts: amounts,
                }
                // Withdrawals from Handler
            } else if (eventName === EV.LogNewWithdrawal) {
                payload = {
                    from: log.args.user,
                    pid: null,
                    amount1: parseAmount(log.args.tokenAmounts[0], Base.D18),
                    amount2: parseAmount(log.args.tokenAmounts[1], Base.D6),
                    amount3: parseAmount(log.args.tokenAmounts[2], Base.D6),
                    value: parseAmount(log.args.returnUsd, Base.D18),
                    referral: log.args.referral,
                    balanced: log.args.balanced,
                    all: log.args.all,
                    deductUsd: parseAmount(log.args.deductUsd, Base.D18),
                    lpAmount: parseAmount(log.args.lpAmount, Base.D18), // TODO: depends on stable?
                    allowance: null,
                    totalLoss: null,
                    token_id: log.args.pwrd ? TokenId.PWRD : TokenId.GVT,
                }
                // Transfers
            } else if (eventName === EV.Transfer) {
                payload = {
                    token_id: getTokenIdByContractName(contractName),
                    from: log.args.from,
                    to: log.args.to,
                    value: parseAmount(log.args.value, Base.D18),
                }
                // Approvals
            } else if (eventName === EV.Approval) {
                const value = parseAmount(log.args.value, Base.D18);
                payload = {
                    token_id: getTokenIdByContractName(contractName),
                    owner: log.args.owner,
                    spender: log.args.spender,
                    value: (value < MAX_NUMBER) ? value : -1,
                }
                // Claims from Hodler
            } else if (eventName === EV.LogBonusClaimed) {
                payload = {
                    from: log.args.user,
                    token_id: TokenId.GRO,
                    pid: null,
                    vest: log.args.vest,
                    tranche_id: null,
                    amount: parseAmount(log.args.amount, Base.D18),
                }
                // Claims from LPTokenStakerV2
            } else if (
                eventName === EV.LogClaim
                || eventName === EV.LogMultiClaim
            ) {
                const pids = (eventName === EV.LogClaim)
                    ? [parseInt(log.args.pid.toString())]
                    : log.args.pids.map((pid: number) => parseInt(pid.toString()));
                payload = {
                    from: log.args.user,
                    token_id: TokenId.GRO,
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

            events.push({
                transaction_id: log.transactionId,
                log_index: log.logIndex,
                contract_address: log.address,
                block_timestamp: log.blockTimestamp,
                log_name: log.name,
                ...payload,
            });

            transactions.push({
                transaction_id: log.transactionId,
                block_number: log.blockNumber,
                block_timestamp: log.blockTimestamp,
                block_date: log.blockDate,
                network_id: log.networkId,
                tx_hash: log.transactionHash,
                block_hash: log.blockHash,
                uncled: false,
            });
        }

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
    eventParserEth,
}
