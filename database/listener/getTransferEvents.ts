import {
    Transfer,
    ContractVersion,
} from '../types';
import {
    getProviderAvax
} from '../common/globalUtil';
import {
    getEvents,
    getFilterEvents
} from '../../common/logFilter-new';
import {
    getLatestContractEventFilter,
    getContractHistoryEventFilters,
} from '../../common/filterGenerateTool';
import {
    handleErr,
    isTransfer,
    isDepositOrWithdrawal,
} from '../common/personalUtil';
import { ContractNames } from '../../registry/registry';


const getTransferEvents = async (
    contractVersion: ContractVersion,
    side: Transfer,
    fromBlock,
    toBlock,    //TODO: number or 'latest'.... so what?
    account: string
) => {
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
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXUSDCVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXUSDCVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXUSDCVault_v1_5_1
                            : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL_USDCe:
                eventType = 'LogWithdrawal';
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXUSDCVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXUSDCVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXUSDCVault_v1_5_1
                            : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_USDCe_IN:
                eventType = 'Transfer';
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXUSDCVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXUSDCVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXUSDCVault_v1_5_1
                            : null;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_USDCe_OUT:
                eventType = 'Transfer';
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXUSDCVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXUSDCVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXUSDCVault_v1_5_1
                            : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.DEPOSIT_USDTe:
                eventType = 'LogDeposit';
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXUSDTVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXUSDTVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXUSDTVault_v1_5_1
                            : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL_USDTe:
                eventType = 'LogWithdrawal';
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXUSDTVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXUSDTVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXUSDTVault_v1_5_1
                            : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_USDTe_IN:
                eventType = 'Transfer';
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXUSDTVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXUSDTVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXUSDTVault_v1_5_1
                            : null;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_USDTe_OUT:
                eventType = 'Transfer';
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXUSDTVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXUSDTVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXUSDTVault_v1_5_1
                            : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.DEPOSIT_DAIe:
                eventType = 'LogDeposit';
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXDAIVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXDAIVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXDAIVault_v1_5_1
                            : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL_DAIe:
                eventType = 'LogWithdrawal';
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXDAIVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXDAIVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXDAIVault_v1_5_1
                            : null;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_DAIe_IN:
                eventType = 'Transfer';
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXDAIVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXDAIVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXDAIVault_v1_5_1
                            : null;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_DAIe_OUT:
                eventType = 'Transfer';
                contractName = contractVersion === ContractVersion.VAULT_1_0
                    ? ContractNames.AVAXDAIVault
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? ContractNames.AVAXDAIVault_v1_5
                        : contractVersion === ContractVersion.VAULT_1_5_1
                            ? ContractNames.AVAXDAIVault_v1_5_1
                            : null;
                sender = account;
                receiver = null;
                break;
            default:
                handleErr(`getTransferEvents.ts->getTransferEvents()->switch: Invalid event:`, side);
                return false;
        }

        const isAvax = (side >= 500 && side < 1000)
            ? true
            : false;

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

        if (isAvax) {
            for (let i = 0; i < filters.length; i += 1) {
                const transferEventFilter = filters[i];
                const result = await getEvents(
                    transferEventFilter.filter,
                    transferEventFilter.interface,
                    getProviderAvax(),
                );
                if (result.length > 0) {
                    logPromises.push(result);
                }
            }
        } else {
            for (let i = 0; i < filters.length; i += 1) {
                const transferEventFilter = filters[i];
                const result = await getFilterEvents(
                    transferEventFilter.filter,
                    transferEventFilter.interface,
                    'default',
                );
                if (result.length > 0) {
                    logPromises.push(result);
                }
            }
        }

        let logResults = await Promise.all(logPromises);
        let logTrades = [];

        // Include:
        // - all deposit & withdrawal events
        // - all transfer events between users
        // - mint/burn events for GRO (as GRO has no deposits/withdrawals)
        if (isTransfer(side) && logResults.length > 0) {
            for (let i = 0; i < logResults.length; i++) {
                for (let j = 0; j < logResults[i].length; j++) {
                    const elem = logResults[i][j];
                    if (
                        elem.args[0] !== '0x0000000000000000000000000000000000000000'
                        && elem.args[1] !== '0x0000000000000000000000000000000000000000'
                    ) {
                        // Add direct transfer between users
                        logTrades.push(elem);
                    } else if (
                        elem.args[0] === '0x0000000000000000000000000000000000000000'
                        && side === Transfer.TRANSFER_GRO_IN
                    ) {
                        // Add mint transfer for GRO
                        logTrades.push(elem);
                    } else if (
                        elem.args[1] === '0x0000000000000000000000000000000000000000'
                        && side === Transfer.TRANSFER_GRO_OUT
                    ) {
                        // Add burn transfer for GRO
                        logTrades.push(elem);
                    }
                }
            }
            return (logTrades.length > 0) ? [logTrades] : [];
        } else {
            return logResults;
        }
    } catch (err) {
        handleErr(`personalUtil->getTransferEvents2() [side: ${side}]`, err);
        return [];
    }
};

export {
    getTransferEvents,
}