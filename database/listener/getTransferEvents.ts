import { getEvents } from '../../common/logFilter';
import {
    getLatestContractEventFilter,
    getContractHistoryEventFilters,
} from '../../common/filterGenerateTool';
import {
    isTransfer,
    isDepositOrWithdrawal
} from '../common/personalUtil';
import { ContractNames } from '../../registry/registry';
import { showError } from '../handler/logHandler';
import { EventResult } from '../../common/commonTypes';
import { ICall } from '../interfaces/ICall';
import { QUERY_ERROR } from '../constants';
import { QUERY_SUCCESS } from '../../lbp/constants';
import {
    Transfer,
    ContractVersion
} from '../types';
import {
    errorObj,
    getProvider,
    getProviderAvax
} from '../common/globalUtil';


const getTransferEvents = async (
    contractVersion: ContractVersion,
    side: Transfer,
    fromBlock,
    toBlock, //TODO: number or 'latest'.... so what?
    account: string
): Promise<ICall> => {
    try {
        // Determine event type to apply filters
        let eventType: string = '';
        let contractName: string = '';
        let sender: string = '';
        let receiver: string = '';
        switch (side) {
            // Ethereum
            case Transfer.DEPOSIT:
                eventType = 'LogNewDeposit';
                contractName = ContractNames.depositHandler;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL:
                eventType = 'LogNewWithdrawal';
                contractName = ContractNames.withdrawHandler;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_GVT_IN:
                eventType = 'Transfer';
                contractName = ContractNames.groVault;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_PWRD_IN:
                eventType = 'Transfer';
                contractName = ContractNames.powerD;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_GVT_OUT:
                eventType = 'Transfer';
                contractName = ContractNames.groVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_PWRD_OUT:
                eventType = 'Transfer';
                contractName = ContractNames.powerD;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_GRO_IN:
                eventType = 'Transfer';
                contractName = ContractNames.GroDAOToken;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_GRO_OUT:
                eventType = 'Transfer';
                contractName = ContractNames.GroDAOToken;
                sender = account;
                receiver = null;
                break;
            // Avalanche Vaults
            case Transfer.DEPOSIT_USDCe:
                eventType = 'LogDeposit';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXUSDCVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXUSDCVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXUSDCVault_v1_6
                                : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL_USDCe:
                eventType = 'LogWithdrawal';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXUSDCVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXUSDCVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXUSDCVault_v1_6
                                : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_USDCe_IN:
                eventType = 'Transfer';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXUSDCVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXUSDCVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXUSDCVault_v1_6
                                : null;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_USDCe_OUT:
                eventType = 'Transfer';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXUSDCVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXUSDCVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXUSDCVault_v1_6
                                : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.DEPOSIT_USDTe:
                eventType = 'LogDeposit';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXUSDTVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXUSDTVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXUSDTVault_v1_6
                                : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL_USDTe:
                eventType = 'LogWithdrawal';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXUSDTVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXUSDTVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXUSDTVault_v1_6
                                : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_USDTe_IN:
                eventType = 'Transfer';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXUSDTVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXUSDTVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXUSDTVault_v1_6
                                : null;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_USDTe_OUT:
                eventType = 'Transfer';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXUSDTVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXUSDTVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXUSDTVault_v1_6
                                : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.DEPOSIT_DAIe:
                eventType = 'LogDeposit';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXDAIVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXDAIVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXDAIVault_v1_6
                                : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL_DAIe:
                eventType = 'LogWithdrawal';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXDAIVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXDAIVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXDAIVault_v1_6
                                : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_DAIe_IN:
                eventType = 'Transfer';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXDAIVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXDAIVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXDAIVault_v1_6
                                : null;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_DAIe_OUT:
                eventType = 'Transfer';
                contractName =
                    contractVersion === ContractVersion.VAULT_1_0
                        ? ContractNames.AVAXDAIVault
                        : contractVersion === ContractVersion.VAULT_1_5
                            ? ContractNames.AVAXDAIVault_v1_5
                            : contractVersion === ContractVersion.VAULT_1_6
                                ? ContractNames.AVAXDAIVault_v1_6
                                : null;
                sender = account;
                receiver = null;
                break;
            default:
                showError(
                    'getTransferEvents.ts->getTransferEvents()',
                    `switch: Invalid event: ${side}`
                );
                return errorObj(`switch: Invalid event: ${side}`);
        }

        const isAvax = side >= 500 && side < 1000 ? true : false;

        let filters;
        if (isDepositOrWithdrawal(side)) {
            // returns an array
            filters = getContractHistoryEventFilters(
                'default',
                contractName,
                eventType,
                fromBlock,
                toBlock,
                [sender, receiver]
            );
        } else {
            // returns an object
            filters = getLatestContractEventFilter(
                'default',
                contractName,
                eventType,
                fromBlock,
                toBlock,
                [sender, receiver]
            );
            filters = [filters];
        }

        const logPromises = [];

        for (let i = 0; i < filters.length; i += 1) {
            const transferEventFilter = filters[i];
            const result: EventResult = await getEvents(
                transferEventFilter.filter,
                transferEventFilter.interface,
                isAvax ? getProviderAvax() : getProvider()
            );
            if (result.status === QUERY_ERROR) {
                showError(
                    'getTransferEvents.ts->getTransferEvents()',
                    `Error while retrieving transfer events -> [side:${side}]: ${result.data}`
                );
                return errorObj(
                    `Error in getTransferEvents->getEvents(): [side:${side}]: ${result.data}`
                );
            }
            if (result.data.length > 0) {
                logPromises.push(result.data);
            }
        }

        let logResults = await Promise.all(logPromises);
        let logTrades = [];

        // Only if transfers, return:
        // - all direct transfer events between users
        // - mint/burn events for GRO (as GRO has no deposit/withdrawal handler)
        if (isTransfer(side) && logResults.length > 0) {
            for (let i = 0; i < logResults.length; i++) {
                for (let j = 0; j < logResults[i].length; j++) {
                    const elem = logResults[i][j];
                    if (
                        elem.args[0] !==
                        '0x0000000000000000000000000000000000000000' &&
                        elem.args[1] !==
                        '0x0000000000000000000000000000000000000000'
                    ) {
                        // Add direct transfer between users
                        logTrades.push(elem);
                    } else if (
                        elem.args[0] ===
                        '0x0000000000000000000000000000000000000000' &&
                        side === Transfer.TRANSFER_GRO_IN
                    ) {
                        // Add mint transfer for GRO
                        logTrades.push(elem);
                    } else if (
                        elem.args[1] ===
                        '0x0000000000000000000000000000000000000000' &&
                        side === Transfer.TRANSFER_GRO_OUT
                    ) {
                        // Add burn transfer for GRO
                        logTrades.push(elem);
                    }
                }
            }

            const res = logTrades.length > 0 ? [logTrades] : [];
            return {
                status: QUERY_SUCCESS,
                data: res,
            };
        } else {
            // return all deposit & withdrawal events
            return {
                status: QUERY_SUCCESS,
                data: logResults,
            };
        }
    } catch (err) {
        showError(
            'getTransferEvents.ts->getTransferEvents()',
            `[side: ${side}]: ${err}`
        );
        return errorObj(err);
    }
};

export { getTransferEvents };
