import { 
    getProvider,
    getProviderAvax,
 } from '../common/globalUtil';
import { BigNumber as BN } from 'ethers';
import { getConfig } from '../../common/configUtil';
import {
    Multicall,
    ContractCallResults,
    ContractCallContext,
} from 'ethereum-multicall';
import {
    Base,
    GlobalNetwork,
    ReturnType,
} from '../types';
import { parseAmount } from '../common/globalUtil';
import gvtABI from '../../abi/ce7b149/NonRebasingGToken.json';
import getVestingABI from '../../abi/GROVesting.json';
import tokenCounterABI from '../../abi/fa8e260/TokenCounter.json';

// const GRO_ADDRESS = getConfig('staker_pools.contracts.gro_address');
const GRO_GVT_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_gvt_pool_address');
const GRO_USDC_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_usdc_pool_address');
const CRV_PWRD_ADDRESS = getConfig('staker_pools.contracts.curve_pwrd3crv_pool_address');
// const GRO_WETH_ADDRESS = getConfig('staker_pools.contracts.balancer_gro_weth_pool_address');
// const VOTE_AGGREGATOR_ADDRESS = '0x2c57F9067E50E819365df7c5958e2c4C14A91C2D';

const multicall = new Multicall({ ethersProvider: getProvider(), tryAggregate: true });
const multicallAvax = new Multicall({ ethersProvider: getProviderAvax(), tryAggregate: true });


const multiCall = async (
    globalNetwork: GlobalNetwork,
    contractAddress: string,
    poolAddress: string,
    abi: any,
    methodName: string,
    addresses: string[],
    returnType: ReturnType,
    base: Base,
) => {

    let items = [];
    let result = [];
    let results: ContractCallResults;

    for (let i = 0; i < addresses.length; i++) {
        items.push({
            reference: 'item',
            methodName: methodName,
            methodParameters: poolAddress
                ? [poolAddress, [addresses[i]]]
                : [addresses[i]]
        });
    }

    const contractCallContext: ContractCallContext[] = [
        {
            reference: 'ref',
            contractAddress: contractAddress,
            abi: abi,
            calls: items,
        },
    ];

    if (globalNetwork === GlobalNetwork.ETHEREUM) {
        results = await multicall.call(contractCallContext);
    } else if (globalNetwork === GlobalNetwork.AVALANCHE) {
        results = await multicallAvax.call(contractCallContext);
    }

    for (let item of results.results.ref.callsReturnContext) {
        if (item.success) {
            switch (returnType) {
                case ReturnType.UINT:
                    result.push(parseAmount(BN.from(item.returnValues[0].hex), base));
                    break;
                case ReturnType.BOOL:
                    result.push(item.returnValues[0]);
                    break;
                case ReturnType.UINT_UINT:
                    result.push([
                        parseAmount(BN.from(item.returnValues[0].hex), base),
                        parseAmount(BN.from(item.returnValues[1].hex), base),
                    ]);
                    break;
                case ReturnType.arrUINT_arrUINT_arrUINT:
                    result.push([
                        parseAmount(BN.from(item.returnValues[0][0].hex), base),
                        parseAmount(BN.from(item.returnValues[1][0].hex), base),
                        parseAmount(BN.from(item.returnValues[2][0].hex), base),
                    ]);
                    break;
                case ReturnType.arrUINT_arrUINT_arrarrUINT:
                    result.push([
                        parseAmount(BN.from(item.returnValues[0][0].hex), base),
                        parseAmount(BN.from(item.returnValues[1][0].hex), base),
                        parseAmount(BN.from(item.returnValues[2][0][0].hex), base),
                        parseAmount(BN.from(item.returnValues[2][0][1].hex), base),
                        // parseAmount(BN.from(item.returnValues[2][0][1].hex),
                        //     poolAddress === GRO_USDC_ADDRESS ? Base.D6 : Base.D18),
                    ])
                default:
                    break;
            }
        } else {
            console.log('unsuccessful :/');
            return [];
        }
    }

    // console.log('result', result);
    return result;
    // console.log(results.results.ref.callsReturnContext);
    // console.log(results.results.ref.callsReturnContext[0].returnValues);
    // console.log(BN.from(results.results.ref.callsReturnContext[0].returnValues[0].hex).toString());
    // console.log(BN.from(results.results.ref.callsReturnContext[1].returnValues[0].hex).toString());
}

const runTest = async () => {
    // GVT : OK
    // await multiCall(
    //     '0x3ADb04E127b9C0a5D36094125669d4603AC52a0c',   // contractAddress
    //     '',
    //     gvtABI,
    //     'balanceOf',
    //     ['0x1E7127c81C8A58661a0811F026B6bE66533934bE', '0xAd192a9eAEe1E342CAbB1Cd32f01de3b77D8598f', '0x5E0543b1d1105CeDCCE884E59c8e7B4538C05E7b'],
    //     ReturnType.UINT
    // );

    // GroVesting : OK but depends on the address. For '0x5E0543b1d1105CeDCCE884E59c8e7B4538C05E7b' it's not working

    // await multiCall(
    //     '0xA28693bf01Dc261887b238646Bb9636cB3a3730B',   // contractAddress
    //     '', // pool address
    //     getVestingABI,
    //     'getVestingDates',
    //     [
    //         '0x1E7127c81C8A58661a0811F026B6bE66533934bE',
    //         '0xAd192a9eAEe1E342CAbB1Cd32f01de3b77D8598f',
    //         // '0x5E0543b1d1105CeDCCE884E59c8e7B4538C05E7b',
    //     ],
    //     ReturnType.UINT_UINT
    // );


    // tokenCounter - getLpAmountsUni
    // await multiCall(
    //     '0xAFFbD08B4754c3423f3583398C5749Bc22F26Ad7',   // contractAddress
    //     GRO_GVT_ADDRESS,   // pool address (GRO/GVT pool)
    //     tokenCounterABI,
    //     'getLpAmountsUni',
    //     [
    //         '0x73329C2737007a1B43bA19d501b10AfE5580f3FA',
    //         '0xAd192a9eAEe1E342CAbB1Cd32f01de3b77D8598f',
    //     ],
    //     ReturnType.arrUINT_arrUINT_arrarrUINT
    // );

    // tokenCounter - getCurvePwrd
    await multiCall(
        GlobalNetwork.ETHEREUM,
        '0xAFFbD08B4754c3423f3583398C5749Bc22F26Ad7',   // contractAddress
        CRV_PWRD_ADDRESS,   // pool address (GRO/GVT pool)
        tokenCounterABI,
        'getCurvePwrd',
        [
            '0x2B19fDE5d7377b48BE50a5D0A78398a496e8B15C',
            '0xAd192a9eAEe1E342CAbB1Cd32f01de3b77D8598f',
        ],
        ReturnType.arrUINT_arrUINT_arrUINT,
        Base.D18,
    );
}

export {
    runTest,
    multiCall,
}


