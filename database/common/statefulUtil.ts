import { ContractNames as CN } from '../../registry/registry';
import { TokenId } from '../types';

const getTokenIdByContractName = (
    contractName: string,
): TokenId => {
    switch (contractName) {
        case CN.AVAXDAIVault:
        case CN.AVAXDAIVault_v1_5:
        case CN.AVAXDAIVault_v1_6:
        case CN.AVAXDAIVault_v1_7:
            return TokenId.DAI;
        case CN.AVAXUSDCVault:
        case CN.AVAXUSDCVault_v1_5:
        case CN.AVAXUSDCVault_v1_6:
        case CN.AVAXUSDCVault_v1_7:
            return TokenId.USDC;
        case CN.AVAXUSDTVault:
        case CN.AVAXUSDTVault_v1_5:
        case CN.AVAXUSDTVault_v1_6:
        case CN.AVAXUSDTVault_v1_7:
            return TokenId.USDT;
        case CN.LPTokenStakerV1:
        case CN.LPTokenStakerV2:
            return TokenId.GRO;
        default:
            return TokenId.UNKNOWN;
    }
}

export {
    getTokenIdByContractName,
}

