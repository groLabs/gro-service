import {
    // getContractHistory,
    ContractNames as CN
} from '../../registry/registry';
// import { getLatestContractsAddress } from '../../registry/registryLoader';
import { TokenId, NetworkId } from '../types';
// import {
//     showInfo,
//     showError,
// } from '../handler/logHandler';
// import {
//     DAIVaultAdaptor,
//     USDCVaultAdaptor,
//     USDTVaultAdaptor
// } from '../../registry/config/mainnet_contracts_history.json';


/// @notice Determine token identifier based on contract name
/// @param  contractName The contract name
/// @return token identifier [aligned with table MD_TOKENS and types.ts]
const getTokenIdByContractName = (
    contractName: string,
): TokenId => {
    switch (contractName) {
        case CN.powerD:
            return TokenId.PWRD;
        case CN.groVault:
            return TokenId.GVT;
        case CN.GroDAOToken:
            return TokenId.GRO;
        case CN.AVAXDAIVault:
            return TokenId.groDAI_e;
        case CN.AVAXDAIVault_v1_7:
            return TokenId.groDAI_e_1_8;
        case CN.AVAXDAIVault_v1_9_internal:
            return TokenId.groDAI_e_1_9_int;
        case CN.AVAXUSDCVault:
            return TokenId.groUSDC_e;
        case CN.AVAXUSDCVault_v1_7:
            return TokenId.groUSDC_e_1_8;
        case CN.AVAXUSDCVault_v1_9_internal:
            return TokenId.groUSDC_e_1_9_int;
        case CN.AVAXUSDTVault:
            return TokenId.groUSDT_e;
        case CN.AVAXUSDTVault_v1_7:
            return TokenId.groUSDT_e_1_8;
        case CN.AVAXUSDTVault_v1_9_internal:
            return TokenId.groUSDT_e_1_9_int;
        case CN.USDC_e:
            return TokenId.USDC_e;
        case CN.USDT_e:
            return TokenId.USDT_e;
        case CN.DAI_e:
            return TokenId.DAI_e;
        case CN.USDC:
            return TokenId.USDC;
        case CN.USDT:
            return TokenId.USDT;
        case CN.DAI:
            return TokenId.DAI;
        case CN.UniswapV2Pair_gvt_gro:
            return TokenId.uniswap_gvt_gro;
        case CN.UniswapV2Pair_gro_usdc:
            return TokenId.uniswap_gro_usdc;
        case CN.Balancer_gro_weth_LP:
            return TokenId.balancer_gro_weth;
        case CN.Curve_PWRD3CRV:
            return TokenId.curve_pwrd3crv;
        case CN.Curve_3CRV:
            return TokenId.curve_3crv;
        default:
            return TokenId.UNKNOWN;
    }
}

/// @param  networkId The blockchain identifier
/// @param  contractName The contract name
/// @return Stablecoin name associated with a contract name (eg. USDC.e for groUSDC.e)
const getStableContractNames = (
    networkId: number,
    contractName: string
) => {
    //TODO: try-catch
    if (networkId === NetworkId.AVALANCHE) {
        if (contractName.includes('USDC')) {
            return [CN.USDC_e];
        } else if (contractName.includes('USDT')) {
            return [CN.USDT_e];
        } else if (contractName.includes('DAI')) {
            return [CN.DAI_e];
        }
    } else if (networkId === NetworkId.MAINNET) {
        return [
            CN.DAI,
            CN.USDC,
            CN.USDT,
        ];
    } else {
        return ['unknown']; //TODO
    }
}

// const getVaultAdaptorAddresses = (eventCode: number) => {
//     try {
        
//         const adaptor = (eventCode === 40)
//             ? DAIVaultAdaptor
//             : (eventCode === 41)
//                 ? USDCVaultAdaptor
//                 : (eventCode === 42)
//                     ? USDTVaultAdaptor
//                     : '';

//         if (adaptor.length > 0) {
//             //@ts-ignore
//             const adaptorAddress = adaptor.map((item: string) => item.address);
//             console.log('adaptorAddress -> ', adaptorAddress);
//             return adaptorAddress;
//         } else {
//             return [];
//         }
//     } catch (err) {
//         showError('etlStatefulUtil.ts->getVaultAdaptorAddresses()', err);
//         return [];
//     }
// }

export {
    getTokenIdByContractName,
    getStableContractNames,
    // getVaultAdaptorAddresses,
}
