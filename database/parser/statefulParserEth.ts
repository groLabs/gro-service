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
import { getVaultFromContractName } from '../common/contractUtil';


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
                // Withdrawals from Emergency Handler
            } else if (eventName === EV.LogEmergencyWithdrawal
                && contractName === CN.emergencyHandler) {
                payload = {
                    pwrd: log.args.pwrd ? log.args.pwrd : null,
                    account: log.args.account ? log.args.account : null,
                    asset: log.args.asset ? log.args.asset : null,
                    amount: log.args.amount ? parseAmount(log.args.amount, Base.D18, 8) : null,
                    price: log.args.price ? parseAmount(log.args.price, Base.D18, 8) : null,
                }
                // Transfers
            } else if (eventName === EV.Transfer) {
                const base = (contractName === CN.USDC || contractName === CN.USDT)
                    ? Base.D6
                    : Base.D18;
                const value = (contractName === CN.DAI)
                    ? log.args.wad
                    : log.args.value;
                payload = {
                    token_id: getTokenIdByContractName(contractName),
                    from: (contractName === CN.DAI)
                        ? log.args.src
                        : log.args.from,
                    to: (contractName === CN.DAI)
                        ? log.args.dst
                        : log.args.to,
                    value: parseAmount(value, base, 8),
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
                    user: log.args.user,
                    vest: log.args.vest,
                    amount: parseAmount(log.args.amount, Base.D18, 8),
                }
                // Claims from Airdrop
            } else if (eventName === EV.LogClaim
                && contractName === CN.Airdrop
            ) {
                payload = {
                    account: log.args.account,
                    vest: log.args.vest,
                    tranche_id: parseInt(log.args.trancheId.toString()),
                    amount: parseAmount(log.args.amount, Base.D18, 12),
                }
                // Deposits in LPTokenStaker
            } else if (eventName === EV.LogDeposit) {
                payload = {
                    user: log.args.user,
                    pid: parseInt(log.args.pid.toString()),
                    amount: parseAmount(log.args.amount, Base.D18, 12),
                }
                // Withdrawals from LPTokenStaker in ETH
            } else if (
                (contractName === CN.LPTokenStakerV1
                    || contractName === CN.LPTokenStakerV2)
                && (eventName === EV.LogWithdraw
                    || eventName === EV.LogMultiWithdraw
                    || eventName === EV.LogEmergencyWithdraw)
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
                // Claims from LPTokenStaker
            } else if (
                (contractName === CN.LPTokenStakerV1
                    || contractName === CN.LPTokenStakerV2)
                && (eventName === EV.LogClaim
                    || eventName === EV.LogMultiClaim)
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
                // Migrations from LPTokenStakerV1 in ETH
            } else if (
                (contractName === CN.LPTokenStakerV2
                    && eventName === EV.LogMigrateUser)
            ) {
                payload = {
                    account: log.args.account,
                    pids: log.args.pids.map((pid: number) => parseInt(pid.toString())),
                }
                // Execution from PnL
            } else if (eventName === EV.LogPnLExecution) {
                payload = {
                    deducted_assets: parseAmount(log.args.deductedAssets, Base.D18, 8),
                    total_pnl: parseAmount(log.args.totalPnL, Base.D18, 8),
                    invest_pnl: parseAmount(log.args.investPnL, Base.D18, 8),
                    price_pnl: parseAmount(log.args.pricePnL, Base.D18, 8),
                    withdrawal_bonus: parseAmount(log.args.withdrawalBonus, Base.D18, 8),
                    performance_bonus: parseAmount(log.args.performanceBonus, Base.D18, 8),
                    before_gvt_assets: parseAmount(log.args.beforeGvtAssets, Base.D18, 8),
                    before_pwrd_assets: parseAmount(log.args.beforePwrdAssets, Base.D18, 8),
                    after_gvt_assets: parseAmount(log.args.afterGvtAssets, Base.D18, 8),
                    after_pwrd_assets: parseAmount(log.args.afterPwrdAssets, Base.D18, 8),
                }
                // Strategy harvest
            } else if (eventName === EV.Harvested) {
                payload = {
                    profit: parseAmount(log.args.profit, Base.D18, 8),
                    loss: parseAmount(log.args.loss, Base.D18, 8),
                    debt_payment: parseAmount(log.args.debtPayment, Base.D18, 8),
                    debt_outstanding: parseAmount(log.args.debtOutstanding, Base.D18, 8),
                }
                // Strategy reported (from Vaults and vault adaptors)
            } else if (eventName === EV.StrategyReported) {
                const base = (contractName === CN.DAIVault)
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

                if (!totalAssets) {
                    return {
                        status: QUERY_ERROR,
                        data: null
                    }
                }

                payload = {
                    strategy: log.args.strategy,
                    gain: parseAmount(log.args.gain, base, 8),
                    loss: parseAmount(log.args.loss, base, 8),
                    debt_paid: parseAmount(log.args.debtPaid, base, 8),
                    total_gain: parseAmount(log.args.totalGain, base, 8),
                    total_loss: parseAmount(log.args.totalLoss, base, 8),
                    total_debt: parseAmount(log.args.totalDebt, base, 8),
                    debt_added: parseAmount(log.args.debtAdded, base, 8),
                    debt_ratio: parseInt(log.args.debtRatio.toString()) / 10000,
                    locked_profit: lockedProfit,
                    total_assets: totalAssets,
                }
                // Strategy update debt ratio
            } else if (eventName === EV.StrategyUpdateDebtRatio) {
                    payload = {
                        strategy: log.args.strategy,
                        debt_ratio: parseInt(log.args.debtRatio.toString()) / 10000,
                    }
                // Chainlink price
            } else if (eventName === EV.AnswerUpdated) {
                const token1_id =
                    (contractName === CN.Chainlink_aggr_dai)
                        ? TokenId.DAI
                        : (contractName === CN.Chainlink_aggr_usdc)
                            ? TokenId.USDC
                            : (contractName === CN.Chainlink_aggr_usdt)
                                ? TokenId.USDT
                                : TokenId.UNKNOWN;
                payload = {
                    token1_id: token1_id,
                    token2_id: TokenId.USD,
                    price: parseAmount(log.args.current, Base.D8, 8),
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

//@dev: lockedProfit does not exist for Ethereum vaults
//@dev: totalAssets is read from VaultAdaptors instead of Vaults
const getExtraDataFromVaults = async (
    blockNumber: number,
    base: Base,
    contractName: string
) => {
    try {
        const sc = getVaultFromContractName(contractName);
        const _totalAssets = await sc.totalAssets({ blockTag: blockNumber });
        const totalAssets = parseAmount(_totalAssets, base, 8);
        const lockedProfit = null;


        return [
            lockedProfit,
            totalAssets,
        ];
    } catch (err) {
        showError('statefulParserEth.ts->getExtraDataFromVaults()', err);
        return [null, null];
    }
}

export {
    eventParserEth,
}
