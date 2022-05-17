import { ICall } from '../interfaces/ICall';
import { showError } from '../handler/logHandler';
import { ContractNames as CN } from '../../registry/registry';
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

            // Deposits into Handler
            if (eventName === EV.LogNewDeposit) {
                payload = {
                    token_id: log.args.pwrd ? TokenId.PWRD : TokenId.GVT,
                    user: log.args.user,
                    referral: log.args.referral,
                    usdAmount: parseAmount(log.args.usdAmount, Base.D18, 8),
                    amount1: parseAmount(log.args.tokens[0], Base.D18, 8), // DAI
                    amount2: parseAmount(log.args.tokens[1], Base.D6, 8),  // USDC
                    amount3: parseAmount(log.args.tokens[2], Base.D6, 8),  // USDT
                    //pwrd: log.args.pwrd,
                }
                // Withdrawals from Handler
            } else if (eventName === EV.LogNewWithdrawal) {
                payload = {
                    token_id: log.args.pwrd ? TokenId.PWRD : TokenId.GVT,
                    user: log.args.user,
                    referral: log.args.referral,
                    balanced: log.args.balanced,
                    all: log.args.all,
                    deductUsd: parseAmount(log.args.deductUsd, Base.D18, 8),
                    returnUsd: parseAmount(log.args.returnUsd, Base.D18, 8),
                    lpAmount: parseAmount(log.args.lpAmount, Base.D18, 8),
                    amount1: parseAmount(log.args.tokenAmounts[0], Base.D18, 8),
                    amount2: parseAmount(log.args.tokenAmounts[1], Base.D6, 8),
                    amount3: parseAmount(log.args.tokenAmounts[2], Base.D6, 8),
                }
                // Transfers
            } else if (eventName === EV.Transfer) {
                payload = {
                    token_id: getTokenIdByContractName(contractName),
                    from: log.args.from,
                    to: log.args.to,
                    value: parseAmount(log.args.value, Base.D18, 8), // TODO: depends on stable?
                }
                // Approvals
            } else if (eventName === EV.Approval) {
                const valueTemp = (contractName === CN.DAI)
                    ? log.args.wad
                    : log.args.value;
                const value = parseAmount(valueTemp, Base.D18, 8);
                payload = {
                    token_id: getTokenIdByContractName(contractName),
                    owner: (contractName === CN.DAI)
                        ? log.args.src
                        : log.args.owner,
                    spender: (contractName === CN.DAI)
                        ? log.args.guy
                        : log.args.spender,
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
                    amount: parseAmount(log.args.amount, Base.D18, 8),
                }
                // TODO: what about LPTokenStakerV1 for IDL?
                // Deposits in LPTokenStaker
            } else if (eventName === EV.LogDeposit) {
                payload = {
                    user: log.args.user,
                    pid: parseInt(log.args.pid.toString()),
                    amount: parseAmount(log.args.amount, Base.D18, 12),
                }
                // Withdrawals from LPTokenStakerV2 in ETH
            } else if (eventName === EV.LogWithdraw ||
                eventName === EV.LogMultiWithdraw
            ) {
                let pids = [];
                let amounts = [];
                const multiple = (eventName === EV.LogMultiWithdraw) ? true : false;

                if (multiple) {
                    pids = log.args.pids.map((pid: number) => parseInt(pid.toString()));
                    amounts = log.args.amounts.map((amount: number) => parseAmount(amount, Base.D18, 12));
                } else {
                    pids = [parseInt(log.args.pid.toString())];
                    amounts = [parseAmount(log.args.amount, Base.D18, 12)];
                }

                payload = {
                    user: log.args.user,
                    pids: pids,
                    amounts: amounts,
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
                    user: log.args.user,
                    vest: log.args.vest,
                    pids: pids,
                    amount: parseAmount(log.args.amount, Base.D18, 12),
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
