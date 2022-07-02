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
import {
    getPowerD,
    getGroVault,
    getCurve_PWRD3CRV,
    getLpTokenStakerV2,
    getVaultFromContractName,
} from '../common/contractUtil';


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
                payload = {
                    token_id: getTokenIdByContractName(contractName),
                    from: log.args[0],
                    to: log.args[1],
                    value: parseAmount(log.args[2], base, 8),
                }
                // Approvals
            } else if (eventName === EV.Approval) {
                const value = parseAmount(log.args[2], Base.D18, 8);
                payload = {
                    token_id: getTokenIdByContractName(contractName),
                    owner: log.args[0],
                    spender: log.args[1],
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
                // Vests from GROVesting
            } else if (eventName === EV.LogVest
                && contractName === CN.GroVesting
            ) {
                payload = {
                    user: log.args.user,
                    total_locked_amount: parseAmount(log.args.totalLockedAmount, Base.D18, 8),
                    amount: parseAmount(log.args.amount, Base.D18, 8),
                    vesting_total: parseAmount(log.args.vesting[0], Base.D18, 8),
                    vesting_start_time: parseInt(log.args.vesting[1].toString()),
                }
                // Exits from GROVesting
            } else if ((eventName === EV.LogExit
                || eventName === EV.LogInstantExit)
                && contractName === CN.GroVesting
            ) {
                payload = {
                    user: log.args.user,
                    total_locked_amount: (eventName === EV.LogExit)
                        ? parseAmount(log.args.totalLockedAmount, Base.D18, 8)
                        : null,
                    unlocked: (eventName === EV.LogExit)
                        ? parseAmount(log.args.unlocked, Base.D18, 8)
                        : null,
                    amount: (eventName === EV.LogExit)
                        ? parseAmount(log.args.amount, Base.D18, 8)
                        : null,
                    minting_amount: (eventName === EV.LogExit)
                        ? null
                        : parseAmount(log.args.mintingAmount, Base.D18, 8),
                    penalty: parseAmount(log.args.penalty, Base.D18, 8),
                }
                // Deposits in LPTokenStaker
            } else if (eventName === EV.LogDeposit) {
                payload = {
                    user: log.args.user,
                    pid: parseInt(log.args.pid.toString()),
                    amount: parseAmount(log.args.amount, Base.D18, 12),
                }
                // Withdrawals from LPTokenStaker
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

                const amounts = (eventName === EV.LogMultiClaim)
                    ? await getClaimedAmounts(
                        log.blockNumber,
                        pids,
                        log.args.user,
                    )
                    : [parseAmount(log.args.amount, Base.D18, 12)];

                payload = {
                    user: log.args.user,
                    vest: log.args.vest, //only for V2
                    pids: pids,
                    amount: parseAmount(log.args.amount, Base.D18, 12),
                    amounts: amounts,
                }
                // Add pool to LpTokenStaker
            } else if (
                (contractName === CN.LPTokenStakerV1
                    || contractName === CN.LPTokenStakerV2)
                && (eventName === EV.LogAddPool
                )
            ) {
                payload = {
                    pid: parseInt(log.args.pid.toString()),
                    alloc_point: parseInt(log.args.allocPoint.toString()),
                    lp_token: log.args.lpToken,
                }
                // Set pool in LpTokenStaker
            } else if (
                (contractName === CN.LPTokenStakerV1
                    || contractName === CN.LPTokenStakerV2)
                && (eventName === EV.LogSetPool
                )
            ) {
                payload = {
                    pid: parseInt(log.args.pid.toString()),
                    alloc_point: parseInt(log.args.allocPoint.toString()),
                }
                // Set update in LpTokenStaker
            } else if (
                (contractName === CN.LPTokenStakerV1
                    || contractName === CN.LPTokenStakerV2)
                && (eventName === EV.LogUpdatePool
                )
            ) {
                payload = {
                    pid: parseInt(log.args.pid.toString()),
                    last_reward_block: parseInt(log.args.lastRewardBlock.toString()),
                    lp_supply: parseAmount(log.args.lpSupply, Base.D18, 8),
                    acc_gro_per_share: parseAmount(log.args.accGroPerShare, Base.D18, 12),
                }
                // Max Gro per block in LpTokenStaker
            } else if (
                (contractName === CN.LPTokenStakerV1
                    || contractName === CN.LPTokenStakerV2)
                && (eventName === EV.LogMaxGroPerBlock
                )
            ) {
                payload = {
                    max_gro_per_block: parseAmount(log.args.newMax, Base.D18, 8),
                }
                // Gro per block in LpTokenStaker
            } else if (
                (contractName === CN.LPTokenStakerV1
                    || contractName === CN.LPTokenStakerV2)
                && (eventName === EV.LogGroPerBlock
                )
            ) {
                payload = {
                    gro_per_block: parseAmount(log.args.newGro, Base.D18, 8),
                }
                // Migrations from LPTokenStakerV1 into LPTokenStakerV2
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
                const [
                    pwrdFactor,
                    gvtFactor,
                ] = await getGTokenFactors(log.blockNumber);

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
                    pwrd_factor: pwrdFactor,
                    gvt_factor: gvtFactor,
                }
                // Strategy harvest
            } else if (eventName === EV.Harvested) {
                const base = (contractName === CN.DAIPrimary || contractName === CN.DAISecondary)
                    ? Base.D18
                    : Base.D6;
                payload = {
                    profit: parseAmount(log.args.profit, base, 8),
                    loss: parseAmount(log.args.loss, base, 8),
                    debt_payment: parseAmount(log.args.debtPayment, base, 8),
                    debt_outstanding: parseAmount(log.args.debtOutstanding, base, 8),
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
                // Balancer swaps
            } else if (eventName === EV.Swap
                && contractName === CN.BalancerV2Vault
            ) {
                payload = {
                    pool_id: log.args.poolId,
                    token_in: log.args.tokenIn,
                    token_out: log.args.tokenOut,
                    amount_in: parseAmount(log.args.amountIn, Base.D18, 8),
                    amount_out: parseAmount(log.args.amountOut, Base.D18, 8),
                }
                // Balancer swaps
            } else if (eventName === EV.PoolBalanceChanged
                && contractName === CN.BalancerV2Vault
            ) {
                payload = {
                    pool_id: log.args.poolId,
                    liquidity_provider: log.args.liquidityProvider,
                    tokens: log.args.tokens.map((token: number) => token),
                    deltas: log.args.deltas.map((delta: number) => parseAmount(delta, Base.D18, 8)),
                    protocol_fee_amounts: log.args.protocolFeeAmounts.map((fee: number) => parseAmount(fee, Base.D18, 8)),
                }
                // Uniswap swaps
            } else if (eventName === EV.Swap
                && (contractName === CN.UniswapV2Pair_gvt_gro
                    || contractName === CN.UniswapV2Pair_gro_usdc)
            ) {
                const baseAmount1 = (contractName === CN.UniswapV2Pair_gro_usdc)
                    ? Base.D6
                    : Base.D18;
                payload = {
                    sender: log.args.sender,
                    amount0_in: parseAmount(log.args.amount0In, Base.D18, 8),
                    amount1_in: parseAmount(log.args.amount1In, baseAmount1, 8),
                    amount0_out: parseAmount(log.args.amount0Out, Base.D18, 8),
                    amount1_out: parseAmount(log.args.amount1Out, baseAmount1, 8),
                    to: log.args.sender,
                }
                // Uniswap liquidity
            } else if (
                (eventName === EV.Mint
                    || eventName === EV.Burn)
                && (contractName === CN.UniswapV2Pair_gvt_gro
                    || contractName === CN.UniswapV2Pair_gro_usdc)
            ) {
                const baseAmount1 = (contractName === CN.UniswapV2Pair_gro_usdc)
                    ? Base.D6
                    : Base.D18;

                payload = {
                    sender: log.args.sender,
                    amount0: parseAmount(log.args.amount0, Base.D18, 8),
                    amount1: parseAmount(log.args.amount1, baseAmount1, 8),
                    to: log.args.to,
                }
                // Curve swaps
            } else if (
                (eventName === EV.TokenExchange
                    || eventName === EV.TokenExchangeUnderlying)
                && contractName === CN.Curve_PWRD3CRV
            ) {
                const sold_id = parseInt(log.args.sold_id.toString());
                const bought_id = parseInt(log.args.bought_id.toString());
                const virtualPrice = await getVirtualPrice(log.blockNumber);
                const baseTokenSold = (eventName === EV.TokenExchangeUnderlying)
                    ? getBaseFromTokenIDcurve(sold_id)
                    : Base.D18;
                const baseTokenBought = (eventName === EV.TokenExchangeUnderlying)
                    ? getBaseFromTokenIDcurve(bought_id)
                    : Base.D18;
                payload = {
                    buyer: log.args.buyer,
                    sold_id: sold_id,
                    tokens_sold: parseAmount(log.args.tokens_sold, baseTokenSold, 8),
                    bought_id: bought_id,
                    tokens_bought: parseAmount(log.args.tokens_bought, baseTokenBought, 8),
                    virtual_price: virtualPrice,
                }
                // Curve liquidity
            } else if (
                (eventName === EV.AddLiquidity
                    || eventName === EV.RemoveLiquidity
                    || eventName === EV.RemoveLiquidityOne
                    || eventName === EV.RemoveLiquidityImbalance)
                && contractName === CN.Curve_PWRD3CRV
            ) {
                const virtualPrice = await getVirtualPrice(log.blockNumber);
                payload = {
                    provider: log.args.provider,
                    token_amounts: (eventName === EV.RemoveLiquidityOne)
                        ? [parseAmount(log.args.token_amount, Base.D18, 8)]
                        : [...log.args.token_amounts.map((amount) => parseAmount(amount, Base.D18, 8))],
                    fees: (eventName === EV.RemoveLiquidityOne)
                        ? null
                        : [...log.args.fees.map((fee) => parseAmount(fee, Base.D18, 8))],
                    coin_amount: (eventName === EV.RemoveLiquidityOne)
                        ? parseAmount(log.args.coin_amount, Base.D18, 8)
                        : null,
                    invariant: (eventName === EV.AddLiquidity || eventName === EV.RemoveLiquidityImbalance)
                        ? parseAmount(log.args.invariant, Base.D18, 8)
                        : null,
                    token_supply: parseAmount(log.args.token_supply, Base.D18, 8),
                    virtual_price: virtualPrice,
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
        showError(`statefulParser.ts->eventParser() for event <${eventName}> and contract <${contractName}>`, err);
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

const getGTokenFactors = async (blockNumber: number) => {
    try {
        const [
            pwrd,
            gvt,
        ] = await Promise.all([
            getPowerD().factor({ blockTag: blockNumber }),
            getGroVault().factor({ blockTag: blockNumber }),
        ]);

        return [
            parseAmount(pwrd, Base.D18, 12),
            parseAmount(gvt, Base.D18, 12)
        ];
    } catch (err) {
        showError('statefulParserEth.ts->getGTokenFactors()', err);
        return [null, null];
    }
}

//@dev: get virtual price from metapool swaps
const getVirtualPrice = async (blockNumber: number) => {
    try {
        const virtualPrice = await getCurve_PWRD3CRV().get_virtual_price({ blockTag: blockNumber });
        return parseAmount(virtualPrice, Base.D18, 8);
    } catch (err) {
        showError('statefulParserEth.ts->getVirtualPrice()', err);
        return null;
    }
}

//@dev: event LogMultiClaim does not have the claimed amounts per pool; therefore, it is calculated
//      by retrieving the claimed amounts in block-1 through on-call function claimable()
const getClaimedAmounts = async (
    blockNumber: number,
    pids: number[],
    address: string,
) => {
    try {
        let claimedAmounts = [];
        for (const pid of pids) {
            const amount = await getLpTokenStakerV2().claimable(
                pid,
                address,
                { blockTag: blockNumber - 1 }
            );
            claimedAmounts.push(parseAmount(amount, Base.D18, 12));
        }
        return claimedAmounts;
    } catch (err) {
        showError('statefulParserEth.ts->getVirtualPrice()', err);
        return [];
    }
}

//@dev: get the token base (decimals) based on Curve's token id
const getBaseFromTokenIDcurve = (tokenID: number) => {
    switch (tokenID) {
        case 0: // PWRD
        case 1: // DAI
            return Base.D18;
        case 2: // USDC
        case 3: // USDT
            return Base.D6
        default:
            return Base.D18;
    }
}

export {
    eventParserEth,
}
