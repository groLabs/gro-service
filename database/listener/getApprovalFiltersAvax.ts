import { ethers } from 'ethers';
import { ContractNames } from '../../registry/registry';
import { getLatestSystemContractOnAVAX } from '../../stats/common/contractStorage';
import {
    ContractVersion,
} from '../types';
import { showError } from '../handler/logHandler';

interface IFilter extends ethers.EventFilter {
    fromBlock: any;
    toBlock: any;
}

const abi = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'Approval',
        type: 'event',
    },
];

const getAvaxApprovalEventFilters = (
    account: string,
    contractVersion: ContractVersion,
    provider,
    fromBlock,
    toBlock,
) => {
    let contractNames;
    let result = [];

    switch (contractVersion) {
        case ContractVersion.VAULT_1_0:
            contractNames = [
                ContractNames.AVAXUSDCVault,
                ContractNames.AVAXUSDTVault,
                ContractNames.AVAXDAIVault,
            ];
            break;
        case ContractVersion.VAULT_1_5:
            contractNames = [
                ContractNames.AVAXUSDCVault_v1_5,
                ContractNames.AVAXUSDTVault_v1_5,
                ContractNames.AVAXDAIVault_v1_5,
            ];
            break;
        case ContractVersion.VAULT_1_6:
            contractNames = [
                ContractNames.AVAXUSDCVault_v1_6,
                ContractNames.AVAXUSDTVault_v1_6,
                ContractNames.AVAXDAIVault_v1_6,
            ];
            break;
        case ContractVersion.VAULT_1_7:
            contractNames = [
                ContractNames.AVAXUSDCVault_v1_7,
                ContractNames.AVAXUSDTVault_v1_7,
                ContractNames.AVAXDAIVault_v1_7,
            ];
            break;
        default:
            showError(
                'getApprovalFiltersAvax.ts->getAvaxApprovalEventFilters()',
                'Unknown contract version'
            );
            return {};
    }

    for (const contractName of contractNames) {
        const latestAvaxVault = getLatestSystemContractOnAVAX(
            contractName,
            provider
        );
        const avaxVaultInfo = latestAvaxVault.contractInfo;

        const { address: vaultAddress, _, tokens } = avaxVaultInfo;
        const coin = new ethers.Contract(tokens[0], abi, provider);
        let filter = coin.filters.Approval(
            account,
            vaultAddress
        ) as IFilter;
        filter.fromBlock = fromBlock;
        filter.toBlock = toBlock;
        const contractInterface = coin.interface;
        result.push({
            "filter": filter,
            "interface": contractInterface,
        });
    }
    return result;
}

export {
    getAvaxApprovalEventFilters
};