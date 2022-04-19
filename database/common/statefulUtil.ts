import { ContractNames as CN } from '../../registry/registry';
import { TokenId } from '../types';


//TODO: document function
const getTokenIdByContractName = (
    contractName: string,
): TokenId => {
    switch (contractName) {
        case CN.powerD:
            return TokenId.PWRD;
        case CN.groVault:
            return TokenId.GVT;
        case CN.GroDAOToken:
        case CN.LPTokenStakerV1:
        case CN.LPTokenStakerV2:
            return TokenId.GRO;
        case CN.AVAXDAIVault:
        case CN.AVAXDAIVault_v1_5:
        case CN.AVAXDAIVault_v1_6:
        case CN.AVAXDAIVault_v1_7:
            return TokenId.groDAI_e;
        case CN.AVAXUSDCVault:
        case CN.AVAXUSDCVault_v1_5:
        case CN.AVAXUSDCVault_v1_6:
        case CN.AVAXUSDCVault_v1_7:
            return TokenId.groUSDC_e;
        case CN.AVAXUSDTVault:
        case CN.AVAXUSDTVault_v1_5:
        case CN.AVAXUSDTVault_v1_6:
        case CN.AVAXUSDTVault_v1_7:
            return TokenId.groUSDT_e;
        default:
            return TokenId.UNKNOWN;
    }
}

export {
    getTokenIdByContractName,
}

