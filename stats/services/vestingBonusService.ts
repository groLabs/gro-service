import { ethers } from 'ethers';
import { ContractNames } from '../../registry/registry';
import { getContractsHistory } from '../../registry/registryLoader';
import { getLatestSystemContract } from '../common/contractStorage';

async function getClaimedTotalBonus(account) {
    const groHodlerContractInfos =
        getContractsHistory()[ContractNames.GroHodler];
}
