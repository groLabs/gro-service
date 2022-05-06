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
                        amount: parseAmount(log.args._amount, base),
                        shares: parseAmount(log.args.shares, base),
                        allowance: parseAmount(log.args.allowance, base),
                    }
                    break;
                // Withdrawals from Vaults
                case EV.LogWithdrawal:
                    payload = {
                        token_id: getTokenIdByContractName(contractName),
                        from: log.args.from,
                        value: parseAmount(log.args.value, base),
                        shares: parseAmount(log.args.shares, base),
                        totalLoss: parseAmount(log.args.totalLoss, base),
                        allowance: parseAmount(log.args.allowance, base),
                    }
                    break;
                // Transfers
                case EV.Transfer:
                    payload = {
                        token_id: getTokenIdByContractName(contractName),
                        from: log.args.from,
                        to: log.args.to,
                        value: parseAmount(log.args.value, base),
                    }
                    break;
                // Approvals
                case EV.Approval:
                    const value = parseAmount(log.args.value, base);
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
                        gain: parseAmount(log.args.gain, base),
                        loss: parseAmount(log.args.loss, base),
                        debt_paid: parseAmount(log.args.debtPaid, base),
                        total_gain: parseAmount(log.args.totalGain, base),
                        total_loss: parseAmount(log.args.totalLoss, base),
                        total_debt: parseAmount(log.args.totalDebt, base),
                        debt_added: parseAmount(log.args.debtAdded, base),
                        debt_ratio: parseAmount(log.args.debtRatio, base) * 100, //TBC
                        locked_profit: lockedProfit,
                        total_assets: totalAssets,
                    }
                    break;
                // Release factor
                case EV.LogNewReleaseFactor:
                    payload = {
                        factor: parseAmount(log.args.factor, Base.D18)
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
                        price: parseAmount(log.args.current, Base.D8),
                        round_id: parseInt(log.args.roundId.toString()),
                        updated_at: parseInt(log.args.updatedAt.toString()),
                    }
                    break;
                // AH position opened
                case EV.LogNewPositionOpened:
                    const ah_position_on_open = {
                        transaction_id: log.transactionId,
                        position_id: parseInt(log.args.positionId.toString()),
                        contract_address: log.address,
                        want_open: parseAmount(log.args.price[0], base),
                        want_close: null,
                    }
                    const ah_position_open = {
                        position_id: parseInt(log.args.positionId.toString()),
                        contract_address: log.address,
                        log_name: log.name,
                        amount: [
                            parseAmount(log.args.price[0], base),     // usdc, usdt or dai
                            parseAmount(log.args.price[1], Base.D18)  // wavax
                        ],
                        collateral_size: parseAmount(log.args.collateralSize, Base.D18),
                    }
                    events.push([
                        ah_position_on_open,
                        ah_position_open
                    ]);
                    break;
                // AH position closed
                case EV.LogPositionClosed:
                    const ah_position_on_close = {
                        position_id: parseInt(log.args.positionId.toString()),
                        want_close: -1,  //TODO
                    }
                    const ah_position_close = {
                        position_id: parseInt(log.args.positionId.toString()),
                        contract_address: log.address,
                        log_name: log.name,
                        amount: [
                            parseAmount(log.args.price[0], base),     // usdc, usdt or dai
                            parseAmount(log.args.price[1], Base.D18)  // wavax
                        ],
                        want_received: parseAmount(log.args.wantRecieved, base),
                    }
                    events.push([
                        ah_position_on_close,
                        ah_position_close
                    ]);
                    break;
                // AH position adjusted
                case EV.LogPositionAdjusted:
                    const ah_position_on_adjust = {
                        position_id: parseInt(log.args.positionId.toString()),
                        want_open: parseAmount(log.args.amounts[0], base),
                    }
                    const ah_position_adjust = {
                        position_id: parseInt(log.args.positionId.toString()),
                        salt: log.transactionId,
                        contract_address: log.address,
                        log_name: log.name,
                        amount: [
                            parseAmount(log.args.amounts[0], base),     // usdc, usdt or dai
                            parseAmount(log.args.amounts[1], Base.D18)  // wavax
                        ],
                        collateral_size: parseAmount(log.args.collateralSize, Base.D18),
                        withdrawal: log.args.withdrawal,
                    }
                    events.push([
                        ah_position_on_adjust,
                        ah_position_adjust,
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
    eventParserAvax,
}
