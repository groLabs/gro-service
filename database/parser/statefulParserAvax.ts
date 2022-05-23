import { ICall } from '../interfaces/ICall';
import {
    showInfo,
    showError,
} from '../handler/logHandler';
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
    getVaultFromContractName,
    getStableFromStrategyName,
    getStrategyFromContractName,
} from '../common/contractUtil';


const eventParserAvax = async (
    logs: any,
    eventName: string,
    contractName: string
): Promise<ICall> => {
    try {
        let payload = {};
        const events = [];
        const transactions = [];

        const base = contractName.includes('DAI')
            ? Base.D18
            : Base.D6;

        for (const log of logs) {

            switch (eventName) {
                // Deposits in Vaults
                case EV.LogDeposit:
                    payload = {
                        token_id: getTokenIdByContractName(contractName),
                        from: log.args.from,
                        amount: parseAmount(log.args._amount, base, 8),
                        shares: parseAmount(log.args.shares, base, 8),
                        allowance: parseAmount(log.args.allowance, base, 8),
                    }
                    break;
                // Withdrawals from Vaults
                case EV.LogWithdrawal:
                    payload = {
                        token_id: getTokenIdByContractName(contractName),
                        from: log.args.from,
                        value: parseAmount(log.args.value, base, 8),
                        shares: parseAmount(log.args.shares, base, 8),
                        totalLoss: parseAmount(log.args.totalLoss, base, 8),
                        allowance: parseAmount(log.args.allowance, base, 8),
                    }
                    break;
                // Transfers
                case EV.Transfer:
                    payload = {
                        token_id: getTokenIdByContractName(contractName),
                        from: log.args.from,
                        to: log.args.to,
                        value: parseAmount(log.args.value, base, 8),
                    }
                    break;
                // Approvals
                case EV.Approval:
                    const value = parseAmount(log.args.value, base, 8);
                    payload = {
                        token_id: getTokenIdByContractName(contractName),
                        owner: log.args.owner,
                        spender: log.args.spender,
                        value: (value < MAX_NUMBER) ? value : -1,
                    }
                    break;
                // Claims from Bouncer
                case EV.LogClaim:
                    payload = {
                        account: log.args.account,
                        vault: log.args.vault,
                        amount: parseInt(log.args.amount.toString()),
                    }
                    break;
                // Strategy reported
                case EV.LogStrategyReported:
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
                        gain: parseAmount(log.args.gain, base, 8),
                        loss: parseAmount(log.args.loss, base, 8),
                        debt_paid: parseAmount(log.args.debtPaid, base, 8),
                        total_gain: parseAmount(log.args.totalGain, base, 8),
                        total_loss: parseAmount(log.args.totalLoss, base, 8),
                        total_debt: parseAmount(log.args.totalDebt, base, 8),
                        debt_added: parseAmount(log.args.debtAdded, base, 8),
                        debt_ratio: parseAmount(log.args.debtRatio, base, 8) * 100, //TBC
                        locked_profit: lockedProfit,
                        total_assets: totalAssets,
                    }
                    break;
                // Release factor
                case EV.LogNewReleaseFactor:
                    payload = {
                        factor: parseAmount(log.args.factor, Base.D18, 8)
                    }
                    break;
                // Chainlink price
                case EV.AnswerUpdated:
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
                        price: parseAmount(log.args.current, Base.D8, 8),
                        round_id: parseInt(log.args.roundId.toString()),
                        updated_at: parseInt(log.args.updatedAt.toString()),
                    }
                    break;
                case EV.LogHarvested:
                    payload = {
                        profit: parseAmount(log.args.profit, base, 8),
                        loss: parseAmount(log.args.loss, base, 8),
                        debt_payment: parseAmount(log.args.debtPayment, base, 8),
                        debt_outstanding: parseAmount(log.args.debtOutstanding, base, 8),
                    }
                    break;
                case EV.LogNewStrategyHarvest:
                    payload = {
                        loss: log.args.loss,
                        change: parseAmount(log.args.change, base, 8),
                    }
                    break;
                // AH position opened
                case EV.LogNewPositionOpened:
                    // For table EV_LAB_AH_POSITION_OPENED
                    const ah_position_open = {
                        position_id: parseInt(log.args.positionId.toString()),
                        block_number: log.blockNumber,
                        contract_address: log.address,
                        log_name: log.name,
                        amount: [
                            parseAmount(log.args.price[0], base, 8),    // usdc, usdt or dai
                            parseAmount(log.args.price[1], Base.D18, 8) // wavax
                        ],
                        collateral_size: parseAmount(log.args.collateralSize, Base.D18, 12),
                    }
                    // For table EV_LAB_AH_POSITIONS
                    const ah_position_on_open = {
                        position_id: parseInt(log.args.positionId.toString()),
                        transaction_id: log.transactionId,
                        block_number: log.blockNumber,
                        contract_address: log.address,
                        want_open: parseAmount(log.args.price[0], base, 8),
                        want_close: null,
                    }
                    events.push([
                        ah_position_open,
                        ah_position_on_open,
                    ]);
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
                    break;
                // AH position closed
                case EV.LogPositionClosed:
                    const [
                        estimatedTotalAssets,
                        balance
                    ] = await getExtraDataForClosePosition(log.blockNumber, contractName);
                    // For table EV_LAB_AH_POSITION_CLOSED
                    const ah_position_close = {
                        position_id: parseInt(log.args.positionId.toString()),
                        transaction_hash: log.transactionHash,
                        block_number: log.blockNumber,
                        contract_address: log.address,
                        log_name: log.name,
                        amount: [
                            parseAmount(log.args.price[0], base, 8),    // usdc, usdt or dai
                            parseAmount(log.args.price[1], Base.D18, 8) // wavax
                        ],
                        want_received: parseAmount(log.args.wantRecieved, base, 8),
                    }
                    // For table EV_LAB_AH_POSITIONS
                    const ah_position_on_close = {
                        position_id: parseInt(log.args.positionId.toString()),
                        want_close: parseAmount(estimatedTotalAssets, Base.D18, 8) - parseAmount(balance, base, 8)
                    }
                    events.push([
                        ah_position_close,
                        ah_position_on_close,
                    ]);
                    break;
                // AH position adjusted
                case EV.LogPositionAdjusted:
                    const sign = (log.args.withdrawal)
                        ? -1
                        : 1;
                    // For table EV_LAB_AH_POSITION_ADJUSTED
                    const ah_position_adjust = {
                        position_id: parseInt(log.args.positionId.toString()),
                        transaction_hash: log.transactionHash,
                        block_number: log.blockNumber,
                        contract_address: log.address,
                        log_name: log.name,
                        amount: [
                            parseAmount(log.args.amounts[0], base, 8),      // usdc, usdt or dai
                            parseAmount(log.args.amounts[1], Base.D18, 8)   // wavax
                        ],
                        collateral_size: parseAmount(log.args.collateralSize, Base.D18, 12),
                        withdrawal: log.args.withdrawal,
                    }
                    // For table EV_LAB_AH_POSITIONS
                    const ah_position_on_adjust = {
                        position_id: parseInt(log.args.positionId.toString()),
                        want_open: parseAmount(log.args.amounts[0], base, 8) * sign,
                    }
                    events.push([
                        ah_position_adjust,
                        ah_position_on_adjust,
                    ]);
                    break;
                default:
                    showError(
                        'statefulParserAvax.ts->eventParserAvax()',
                        `No parsing match for event <${eventName}> on contract <${contractName}>`
                    );
                    return {
                        status: QUERY_ERROR,
                        data: null
                    }
            }

            if (eventName !== EV.LogNewPositionOpened
                && eventName !== EV.LogPositionClosed
                && eventName !== EV.LogPositionAdjusted
            ) {
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
        }

        return {
            status: QUERY_SUCCESS,
            data: {
                events: events,
                transactions: transactions,
            },
        };

    } catch (err) {
        showError('statefulParserAvax.ts->eventParserAvax()', err);
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
            ? parseAmount(_lockedProfit, base, 8)
            : null;
        const totalAssets = parseAmount(_totalAssets, base, 8);

        return [
            lockedProfit,
            totalAssets,
        ];
    } catch (err) {
        showError('statefulParserAvax.ts->getExtraDataFromVaults()', err);
        return [null, null];
    }
}

///@dev: calculation of field <want_close> for table EV_LAB_AH_POSITIONS
const getExtraDataForClosePosition = async (
    blockNumber: number,
    contractName: string
) => {
    try {
        const stratContract = getStrategyFromContractName(contractName);
        const stableContract = getStableFromStrategyName(contractName);
        const stratAddress = stratContract.address;

        const [
            estimatedTotalAssets,
            balance
        ] = await Promise.all([
            stratContract.estimatedTotalAssets({ blockTag: blockNumber }),
            stableContract.balanceOf(stratAddress, { blockTag: blockNumber - 1 })
        ]);

        return [
            estimatedTotalAssets,
            balance,
        ];
    } catch (err) {
        showError('statefulParserAvax.ts->getExtraDataForClosePosition()', err);
        return [null, null];
    }
}

export {
    eventParserAvax,
}
