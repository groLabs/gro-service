import { BigNumber as BN } from 'ethers';
import { showError } from '../handler/logHandler';
import { parseAmount } from '../common/globalUtil';
import {
    getProvider,
    getProviderAvax,
} from '../common/globalUtil';
import {
    Base,
    ReturnType,
    GlobalNetwork,
} from '../types';
import {
    Multicall,
    ContractCallContext,
    ContractCallResults,
} from 'ethereum-multicall';

// Multicall providers
const multicallProvider = new Multicall({ ethersProvider: getProvider(), tryAggregate: true });
const multicallAvaxProvider = new Multicall({ ethersProvider: getProviderAvax(), tryAggregate: true });


const multiCall = async (
    globalNetwork: GlobalNetwork,
    contractAddress: string,
    poolAddress: string,
    poolId: string,
    abi: any,
    methodName: string,
    addresses: string[],
    returnType: ReturnType,
    base: Base,
    block: number,
) => {
    try {
        let items = [];
        let result = [];
        let results: ContractCallResults;

        for (let i = 0; i < addresses.length; i++) {
            items.push({
                reference: 'item',
                methodName: methodName,
                methodParameters: poolAddress
                    ? [poolAddress, [addresses[i]]]
                    : poolId
                        ? [parseInt(poolId), addresses[i]]
                        : [addresses[i]],
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
            results = await multicallProvider.call(
                contractCallContext,
                block
            );
        } else if (globalNetwork === GlobalNetwork.AVALANCHE) {
            results = await multicallAvaxProvider.call(
                contractCallContext,
                block
            );
        }

        for (let item of results.results.ref.callsReturnContext) {
            if (item.success) {
                switch (returnType) {
                    case ReturnType.UINT:
                        result.push(parseAmount(BN.from(item.returnValues[0].hex), base, 8));
                        break;
                    case ReturnType.BOOL:
                        result.push(item.returnValues[0]);
                        break;
                    case ReturnType.UINT_UINT:
                        result.push([
                            parseAmount(BN.from(item.returnValues[0].hex), base, 8),
                            parseAmount(BN.from(item.returnValues[1].hex), base, 8),
                        ]);
                        break;
                    case ReturnType.arrUINT_arrUINT_arrUINT:
                        result.push([
                            parseAmount(BN.from(item.returnValues[0][0].hex), base, 8),
                            parseAmount(BN.from(item.returnValues[1][0].hex), base, 8),
                            parseAmount(BN.from(item.returnValues[2][0].hex), base, 8),
                        ]);
                        break;
                    case ReturnType.arrUINT_arrUINT_arrarrUINT:
                        result.push([
                            parseAmount(BN.from(item.returnValues[0][0].hex), base, 8),
                            parseAmount(BN.from(item.returnValues[1][0].hex), base, 8),
                            parseAmount(BN.from(item.returnValues[2][0][0].hex), base, 8),
                            parseAmount(BN.from(item.returnValues[2][0][1].hex), base, 8),
                        ])
                    default:
                        showError(
                            'multiCaller.ts->multiCall()',
                            `Unknown return type: ${returnType}`);
                        return [];
                }
            } else {
                showError(
                    'multiCaller.ts->multiCall()',
                    `Error during callsReturnContext -> item: ${item}`);
                return [];
            }
        }

        return result;
    } catch (err) {
        showError('multiCaller.ts->multiCall()', err);
        return [];
    }
}

export {
    multiCall,
}


