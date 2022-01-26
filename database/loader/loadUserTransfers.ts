import { query } from '../handler/queryHandler';
import { loadEthBlocks } from './loadEthBlocks';
import { loadTableUpdates } from './loadTableUpdates';
import {
    isInflow,
    transferType,
} from '../common/personalUtil';
import { getTransferEvents } from '../listener/getTransferEvents';
import { ICall } from '../interfaces/ICall';
import {
    isPlural,
    getNetwork
} from '../common/globalUtil'
import { personalStatsTransfersParser } from '../parser/personalStatsTransfersParser';
import {
    GENESIS,
    QUERY_ERROR,
} from '../constants';
import {
    Transfer,
    NetworkId,
    GlobalNetwork,
    ContractVersion,
} from '../types';
import {
    showInfo,
    showError,
    showWarning,
} from '../handler/logHandler';


/// @notice - Loads deposits/withdrawals into USER_STD_FACT_TRANSFERS
///         - Data is sourced from USER_STD_TMP_DEPOSITS & USER_STD_TMP_TRANSACTIONS (full load w/o filters)
///         - All blocks from such transactions are stored into ETH_BLOCKS (incl. timestamp)
///         - Load date is stored into SYS_USER_LOADS
/// @param  fromDate Start date to load transfers
/// @param  toDdate End date to load transfers
/// @param  account User address for cache loading; null for daily loads
/// @return True if no exceptions found, false otherwise
const loadUserTransfers = async (
    fromDate: string,
    toDate: string,
    account: string
): Promise<boolean> => {
    try {
        // Add new blocks into ETH_BLOCKS (incl. block timestamp)
        if (await loadEthBlocks('loadUserTransfers', account)) {
            // Insert deposits, withdrawals & transfers
            const q = (account)
                ? 'insert_user_transfers_cache.sql'
                : 'insert_user_transfers.sql';
            const params = (account)
                ? [account]
                : [];
            const res = await query(q, params);
            if (res.status === QUERY_ERROR)
                return false;

            if (!account) {
                const numTransfers = res.rowCount;
                const table = `added into ${account ? 'USER_TRANSFERS_CACHE' : 'USER_TRANSFERS'}`;
                showInfo(`${numTransfers} record${isPlural(numTransfers)} ${table}`);
            }
        } else {
            return false;
        }
        // Update table SYS_USER_LOADS with the last loads
        if (account) {
            return true;
        } else {
            const res = await loadTableUpdates('USER_TRANSFERS', fromDate, toDate);
            return (res) ? true : false;
        }
    } catch (err) {
        showError('loadUserTransfers.ts->loadUserTransfers()', err);
        return false;
    }
}

//TBR
/// @notice - Loads deposits & withdrawals into temporary tables USER_STD_TMP_DEPOSITS 
///         & USER_STD_TMP_WITHDRAWALS respectively
///         - Amount for GVT & PWRD deposits/withdrawals is retrieved from its TRANSFER event
///         - Value for GTO, USDCe, USDTe & DAIe is retrieve by multiplying amount x pricePerShare
/// @dev    - Truncates always temporary tables beforehand even if no data is to be processed,
///         otherwise, old data would be loaded if no new deposits/withdrawals
/// @param network The global network to retrieve data (Ethereum, Avalanche)
/// @param contractVersion The contract version for AVAX vaults (1.0, 1.5, 1.5.1)
/// @param _fromBlock The starting block to search for events
/// @param toBlock The ending block to search for events
/// @param side The transfer type (see types->Transfer)
/// @param account The user address for cache loading; null for daily loads
/// @return True if no exceptions found, false otherwise
const loadTmpUserTransfers = async (
    network: GlobalNetwork,
    contractVersion: ContractVersion,
    _fromBlock: number,
    toBlock: number | string,
    side: Transfer,
    account: string,
): Promise<boolean> => {
    try {
        const [
            isDeployed,
            fromBlock
        ] = isContractDeployed(network, contractVersion, side, _fromBlock);

        if (isDeployed) {
            const logs: ICall = await getTransferEvents(
                contractVersion,
                side,
                fromBlock,
                toBlock,
                account
            );

            if (logs.status === QUERY_ERROR) {
                return false;
            } else if (logs.data.length > 0) {
                for (let i = 0; i < logs.data.length; i++) {

                    const result: ICall = await personalStatsTransfersParser(
                        contractVersion,
                        network,
                        logs.data[i],
                        side,
                        account
                    );
                    
                    if (result.status === QUERY_ERROR)
                        return false;

                    // Convert params from object to array
                    let params = [];
                    for (const item of result.data)
                        params.push(Object.values(item));

                    if (params.length > 0) {

                        const [res, rows] = await query(
                            (isInflow(side))
                                ? (account)
                                    ? 'insert_user_deposits_cache.sql'
                                    : 'insert_user_deposits_tmp.sql'
                                : (account)
                                    ? 'insert_user_withdrawals_cache.sql'
                                    : 'insert_user_withdrawals_tmp.sql'
                            , params);

                        if (!res)
                            return false;

                        if (!account)
                            showInfo(`${rows} ${transferType(side)}${isPlural(rows)} added into ${(isInflow(side))
                                ? 'USER_DEPOSITS_TMP'
                                : 'USER_WITHDRAWALS_TMP'
                                }`);
                    }
                }
            }
        } else {
            let msg = `Block ${_fromBlock} is older than SC deployment for transfer type ${side} (${transferType(side)}) `;
            showWarning('loadUserTransfers.ts->loadTmpUserTransfers',
                `${msg} ${contractVersion === ContractVersion.VAULT_1_0
                    ? 'Vault 1.0'
                    : contractVersion === ContractVersion.VAULT_1_5
                        ? 'Vault 1.5'
                        : contractVersion === ContractVersion.VAULT_1_6
                            ? 'Vault 1.6'
                            : contractVersion === ContractVersion.VAULT_1_7
                                ? 'Vault 1.7'
                                : ''} -> No data load required`);
        }
        return true;

    } catch (err) {
        const params = `[blocks from: ${_fromBlock} to ${toBlock}, side: ${side}, account: ${account}]`;
        showError(
            'loadUserTransfers.ts->loadTmpUserTransfers()',
            `${params}: ${err}`);
        return false;
    }
}

///@notice
///     Case 1: block >= block at start day of deplyment date but 
///             block <= deployment block => return true & deployment block as new fromBlock,
///             otherwise, this day would be incorrectly exluded from the loads
///     Case 2: block >= deployment block => return true & block as fromBlock
///     Case 3: block < block at start day of deployment date, return false & block as fromBlock
///             This last case will prevent loading data
const checkGenesisDate = (
    block: number,
    startOfDayBlock: number,
    deploymentBlock: number
) => {
    if ((block >= startOfDayBlock - 1)
        && (block < deploymentBlock)) {
        return [true, deploymentBlock];
    } else if (block > deploymentBlock) {
        return [true, block];
    } else {
        return [false, block];
    }
}

//@notice:  Determine if data needs to be loaded depending on the date of SC deployments
const isContractDeployed = (
    network: GlobalNetwork,
    contractVersion: ContractVersion,
    side: Transfer,
    block: number
) => {
    const networkId = getNetwork(network).id;

    if (network === GlobalNetwork.ETHEREUM && networkId === NetworkId.MAINNET) {

        switch (side) {
            case Transfer.DEPOSIT:
            case Transfer.WITHDRAWAL:
            case Transfer.TRANSFER_GVT_IN:
            case Transfer.TRANSFER_GVT_OUT:
            case Transfer.TRANSFER_PWRD_IN:
            case Transfer.TRANSFER_PWRD_OUT:
                return checkGenesisDate(
                    block,
                    GENESIS.ETHEREUM.GVT_START_OF_DAY_BLOCK,
                    GENESIS.ETHEREUM.GVT_DEPLOYMENT_BLOCK,
                );
            case Transfer.TRANSFER_GRO_IN:
            case Transfer.TRANSFER_GRO_OUT:
                return checkGenesisDate(
                    block,
                    GENESIS.ETHEREUM.GRO_START_OF_DAY_BLOCK,
                    GENESIS.ETHEREUM.GRO_DEPLOYMENT_BLOCK,
                );
            default:
                showError(
                    'loadUserTransfers.ts->isContractDeployed()',
                    `Unknown transfer type ${side} for Ethereum`
                );
                return [false, block];
        }

    } else if (network === GlobalNetwork.AVALANCHE) {

        if (contractVersion === ContractVersion.VAULT_1_0)
            return checkGenesisDate(
                block,
                GENESIS.AVALANCHE.VAULTS_1_0_START_OF_DAY_BLOCK,
                GENESIS.AVALANCHE.VAULT_USDC_1_0_DEPLOYMENT_BLOCK,
            );
        else if (contractVersion === ContractVersion.VAULT_1_5)
            return checkGenesisDate(
                block,
                GENESIS.AVALANCHE.VAULTS_1_5_START_OF_DAY_BLOCK,
                GENESIS.AVALANCHE.VAULT_USDT_1_5_DEPLOYMENT_BLOCK,
            );
        else if (contractVersion === ContractVersion.VAULT_1_6)
            return checkGenesisDate(
                block,
                GENESIS.AVALANCHE.VAULTS_1_6_START_OF_DAY_BLOCK,
                GENESIS.AVALANCHE.VAULT_USDT_1_6_DEPLOYMENT_BLOCK,
            );
        else if (contractVersion === ContractVersion.VAULT_1_7)
            return checkGenesisDate(
                block,
                GENESIS.AVALANCHE.VAULTS_1_7_START_OF_DAY_BLOCK,
                GENESIS.AVALANCHE.VAULT_USDT_1_7_DEPLOYMENT_BLOCK,
            );
        else {
            showError(
                'loadUserTransfers.ts->isContractDeployed()',
                `Unknown transfer type ${side} for Avalanche`
            );
            return [false, block];
        }

    } else {
        // No checks in testnets
        return [true, block];
    }
}

export {
    loadUserTransfers,
    loadTmpUserTransfers,
};
