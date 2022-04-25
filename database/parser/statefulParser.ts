import { ICall } from '../interfaces/ICall';
import { showError, } from '../handler/logHandler';
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
import { getVaultFromContractName } from '../common/contractUtil';


/// @notice Parse transactions and events according to the DB model
/// @param  logs An array of raw events data
/// @param  eventName The event name
/// @param  contractName The contract name
/// @return An object with two arrays: parsed transactions and parsed events
///         ready to be inserted into the DB
const eventParser = async (
    logs: any,
    eventName: string,
    contractName: string
): Promise<ICall> => {
    try {
        let payload = {};
        const events = [];
        const transactions = [];

        for (const log of logs) {

            // Deposits from Handler in ETH
            if (
                eventName === EV.LogNewDeposit
                && contractName === CN.depositHandler
            ) {
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
                // Deposits from LPTokenStaker in ETH
            } else if (
                eventName === EV.LogDeposit
                && contractName === CN.LPTokenStakerV2
            ) {
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
                // Deposits from Vaults in AVAX
            } else if (
                eventName === EV.LogDeposit
                && contractName.includes('AVAX')
                && contractName.includes('Vault')
            ) {
                const base = contractName.includes('DAI')
                    ? Base.D18
                    : Base.D6;

                payload = {
                    from: log.args.from,
                    referral: null,
                    pid: null,
                    token_id: getTokenIdByContractName(contractName),
                    allowance: parseAmount(log.args.allowance, base),
                    amount1: parseAmount(log.args.shares, base),
                    amount2: null,
                    amount3: null,
                    value: parseAmount(log.args._amount, base),
                }
                // Multi-withdrawals from LPTokenStakerV2 in ETH
            } else if (
                eventName === EV.LogMultiWithdraw
                && contractName === CN.LPTokenStakerV2
            ) {
                const pids = log.args.pids.map((pid: number) => parseInt(pid.toString()));
                const amounts = log.args.amounts.map((amount: number) => parseAmount(amount, Base.D18));

                payload = {
                    from: log.args.user,
                    pids: pids,
                    amounts: amounts,
                }
                // Withdrawals from Handler in ETH
            } else if (
                eventName === EV.LogNewWithdrawal
                && contractName === CN.withdrawHandler
            ) {
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
                // Withdrawals from Vaults in AVAX
            } else if (
                eventName === EV.LogWithdrawal
                && contractName.includes('AVAX')
                && contractName.includes('Vault')
            ) {
                const base = contractName.includes('DAI')
                    ? Base.D18
                    : Base.D6;

                payload = {
                    from: log.args.from,
                    pid: null,
                    amount1: parseAmount(log.args.shares, base),
                    amount2: null,
                    amount3: null,
                    value: parseAmount(log.args.value, base),
                    referral: null,
                    balanced: null,
                    all: null,
                    deductUsd: null,
                    lpAmount: null,
                    allowance: parseAmount(log.args.allowance, base),
                    totalLoss: parseAmount(log.args.totalLoss, base),
                    token_id: getTokenIdByContractName(contractName),
                }
                // Transfers in ETH
            } else if (eventName === EV.Transfer) {

                const base = contractName.includes('USD')
                    ? Base.D6
                    : Base.D18;

                payload = {
                    from: log.args.from,
                    to: log.args.to,
                    token_id: getTokenIdByContractName(contractName),
                    value: parseAmount(log.args.value, base),
                }
                // Approvals in ETH
            } else if (eventName === EV.Approval) {

                const base = contractName.includes('USD')
                    ? Base.D6
                    : Base.D18;

                const value = parseAmount(log.args.value, base);

                payload = {
                    owner: log.args.owner,
                    spender: log.args.spender,
                    value: (value < MAX_NUMBER) ? value : -1,
                    token_id: getTokenIdByContractName(contractName),
                }
                // Claims from Hodler in ETH
            } else if (
                eventName === EV.LogBonusClaimed
                && contractName === CN.GroHodler
            ) {
                payload = {
                    from: log.args.user,
                    token_id: TokenId.GRO,
                    pid: null,
                    vest: log.args.vest,
                    tranche_id: null,
                    amount: parseAmount(log.args.amount, Base.D18),
                }
                // Claims from LPTokenStakerV2 in ETH
            } else if (
                (eventName === EV.LogClaim || eventName === EV.LogMultiClaim)
                && contractName === CN.LPTokenStakerV2
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
                // Strategy reported in AVAX
            } else if (
                eventName === EV.LogStrategyReported
                && contractName.includes('AVAX')
                && contractName.includes('Vault')
            ) {
                const base = contractName.includes('DAI')
                    ? Base.D18
                    : Base.D6;

                const [
                    lockedProfit,
                    totalAssets,
                ] = await getExtraDataFromVaults(
                    log.blockNumber,
                    base,
                    contractName,
                );

                payload = {
                    strategy: log.args.strategy,
                    gain: parseAmount(log.args.gain, base),
                    loss: parseAmount(log.args.loss, base),
                    debtPaid: parseAmount(log.args.debtPaid, base),
                    totalGain: parseAmount(log.args.totalGain, base),
                    totalLoss: parseAmount(log.args.totalLoss, base),
                    totalDebt: parseAmount(log.args.totalDebt, base),
                    debtAdded: parseAmount(log.args.debtAdded, base),
                    debtRatio: parseAmount(log.args.debtRatio, base) * 100, //TBC
                    lockedProfit: lockedProfit,
                    totalAssets: totalAssets,
                }
                // Release factor in AVAX
            } else if (
                eventName === EV.LogNewReleaseFactor
                && contractName.includes('AVAX')
                && contractName.includes('Vault')
            ) {
                payload = {
                    factor: parseAmount(log.args.factor, Base.D18)
                }
                // Chainlink price in AVAX
            } else if (eventName === EV.AnswerUpdated) {

                const token1_id =
                    (contractName === CN.Chainlink_aggr_dai)
                        ? TokenId.DAI_e
                        : (contractName === CN.Chainlink_aggr_usdc)
                            ? TokenId.USDC_e
                            : (contractName === CN.Chainlink_aggr_usdt)
                                ? TokenId.USDT_e
                                : TokenId.UNKNOWN;

                payload = {
                    token1_id: token1_id,
                    token2_id: TokenId.USD,
                    price: parseAmount(log.args.current, Base.D8),
                    round_id: parseInt(log.args.roundId.toString()),
                    updated_at: parseInt(log.args.updatedAt.toString()),
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
                log_index: log.logIndex,
                transaction_id: log.transactionId,
                contract_address: log.address,
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
                uncled: false,  //TODO-TBC
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

//@dev: vaults 1.0 do not have lockedProfit
const getExtraDataFromVaults = async (
    blockNumber: number,
    base: Base,
    contractName: string
) => {
    try {
        const sc = getVaultFromContractName(contractName);

        const isVault1_0 = (
            contractName === CN.AVAXDAIVault
            || contractName === CN.AVAXUSDCVault
            || contractName === CN.AVAXUSDTVault)
            ? true
            : false;

        const [
            _lockedProfit,
            _totalAssets,
        ] = await Promise.all([
            !isVault1_0
                ? sc.lockedProfit({ blockTag: blockNumber })
                : true,
            sc.totalAssets({ blockTag: blockNumber }),
        ]);

        const lockedProfit = !isVault1_0
            ? parseAmount(_lockedProfit, base)
            : null;
        const totalAssets = parseAmount(_totalAssets, base);

        return [
            lockedProfit,
            totalAssets,
        ];
    } catch (err) {
        showError('statefulParser.ts->getExtraDataFromVaults()', err);
        return [null, null, null];
    }
}

export {
    eventParser,
}
