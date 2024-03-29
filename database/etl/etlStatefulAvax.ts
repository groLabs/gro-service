import { getNetwork } from '../common/globalUtil';
import { showError } from '../handler/logHandler';
import { loadStateful } from '../loader/loadStateful';
import { ContractNames as CN } from '../../registry/registry';
import { getLatestContractsAddress as getAddress } from '../../registry/registryLoader';
import {
    EventName as EV,
    GlobalNetwork as GN
} from '../types';


const etlStatefulAvax = (
    from: number,
    newOffset: number,
    eventCodes: number[],
): Promise<any>[] => {
    try {
        let result = [];

        const vaults = [
            CN.AVAXDAIVault,
            CN.AVAXUSDCVault,
            CN.AVAXUSDTVault,
            CN.AVAXDAIVault_v1_7,
            CN.AVAXUSDCVault_v1_7,
            CN.AVAXUSDTVault_v1_7,
            CN.AVAXDAIVault_v1_9_internal,
            CN.AVAXUSDCVault_v1_9_internal,
            CN.AVAXUSDTVault_v1_9_internal,
        ];

        const strategies = [
            CN.AVAXDAIStrategy,
            CN.AVAXUSDCStrategy,
            CN.AVAXUSDTStrategy,
            CN.AVAXDAIStrategy_v1_7,
            CN.AVAXUSDCStrategy_v1_7_v1,    // 1st deployment of the contract
            CN.AVAXUSDCStrategy_v1_7_v2,    // 2nd deployment of the contract
            CN.AVAXUSDTStrategy_v1_7_v1,    // 1st deployment of the contract
            CN.AVAXUSDTStrategy_v1_7_v2,    // 2nd deployment of the contract
            CN.AVAXDAIStrategy_v1_9_internal,
            CN.AVAXUSDCStrategy_v1_9_internal,
            CN.AVAXUSDTStrategy_v1_9_internal,
        ]

        const oracles = [
            CN.Chainlink_aggr_usdc_e,
            CN.Chainlink_aggr_usdt_e,
            CN.Chainlink_aggr_dai_e,
        ];

        if (eventCodes.includes(1)) {
            result.push(
                ...vaults.map((vault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.LogDeposit,
                        vault,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(2)) {
            result.push(
                ...vaults.map((vault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.LogWithdrawal,
                        vault,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(3)) {
            result.push(
                ...vaults.map((vault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.Approval,
                        vault,
                        from,
                        newOffset,
                        [null, getAddress()[vault].address]
                    )),
            );
        }

        if (eventCodes.includes(4)) {
            result.push(
                ...vaults.map((vault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.Transfer,
                        vault,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(5)) {
            result.push(
                ...vaults.map((vault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.LogStrategyReported,
                        vault,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(6)) {
            result.push(
                ...[
                    CN.AVAXDAIVault_v1_7,
                    CN.AVAXUSDCVault_v1_7,
                    CN.AVAXUSDTVault_v1_7,
                    CN.AVAXDAIVault_v1_9_internal,
                    CN.AVAXUSDCVault_v1_9_internal,
                    CN.AVAXUSDTVault_v1_9_internal,
                ].map((vault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.LogNewReleaseFactor,
                        vault,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(7)) {
            result.push(
                ...oracles.map((oracle) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.AnswerUpdated,
                        oracle,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(8)) {
            result.push(
                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.LogClaim,
                    CN.AVAXBouncer,
                    from,
                    newOffset,
                    []
                ),
            );
        }

        if (eventCodes.includes(9)) {
            result.push(
                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.LogNewDrop,
                    CN.AVAXBouncer,
                    from,
                    newOffset,
                    []
                ),
            );
        }

        if (eventCodes.includes(10)) {
            result.push(
                ...strategies.map((strategy) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.LogNewPositionOpened,
                        strategy,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(11)) {
            result.push(
                ...strategies.map((strategy) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.LogPositionAdjusted,
                        strategy,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(12)) {
            result.push(
                ...strategies.map((strategy) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.LogPositionClosed,
                        strategy,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(13)) {
            result.push(
                ...vaults.map((vault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.LogNewStrategyHarvest,
                        vault,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(14)) {
            result.push(
                ...[
                    CN.AVAXDAIStrategy,
                    CN.AVAXUSDCStrategy,
                    CN.AVAXUSDTStrategy,
                ].map((strategy) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.Harvested,
                        strategy,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(15)) {
            result.push(
                ...[
                    CN.AVAXDAIStrategy_v1_7,
                    CN.AVAXUSDCStrategy_v1_7,
                    CN.AVAXUSDTStrategy_v1_7,
                    CN.AVAXDAIStrategy_v1_9_internal,
                    CN.AVAXUSDCStrategy_v1_9_internal,
                    CN.AVAXUSDTStrategy_v1_9_internal,
                ].map((strategy) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.LogHarvested,
                        strategy,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        // DAIe transfers to/from DAIVaults
        if (eventCodes.includes(16)) {
            result.push(
                ...[
                    CN.AVAXDAIVault_v1_7,
                    CN.AVAXDAIVault_v1_9_internal,
                ].map((daiVault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.Transfer,
                        CN.DAI_e,
                        from,
                        newOffset,
                        [getAddress()[daiVault].address, null]
                    )),
            );
            result.push(
                ...[
                    CN.AVAXDAIVault_v1_7,
                    CN.AVAXDAIVault_v1_9_internal,
                ].map((daiVault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.Transfer,
                        CN.DAI_e,
                        from,
                        newOffset,
                        [null, getAddress()[daiVault].address]
                    )),
            );
        }

        // USDCe transfers to/from USDCVaults
        if (eventCodes.includes(17)) {
            result.push(
                ...[
                    CN.AVAXUSDCVault_v1_7,
                    CN.AVAXUSDCVault_v1_9_internal,
                ].map((usdcVault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.Transfer,
                        CN.USDC_e,
                        from,
                        newOffset,
                        [getAddress()[usdcVault].address, null]
                    )),
            );
            result.push(
                ...[
                    CN.AVAXUSDCVault_v1_7,
                    CN.AVAXUSDCVault_v1_9_internal,
                ].map((usdcVault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.Transfer,
                        CN.USDC_e,
                        from,
                        newOffset,
                        [null, getAddress()[usdcVault].address]
                    )),
            );
        }

        // USDTe transfers to/from USDTVaults
        if (eventCodes.includes(18)) {
            result.push(
                ...[
                    CN.AVAXUSDTVault_v1_7,
                    CN.AVAXUSDTVault_v1_9_internal,
                ].map((usdtVault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.Transfer,
                        CN.USDT_e,
                        from,
                        newOffset,
                        [getAddress()[usdtVault].address, null]
                    )),
            );
            result.push(
                ...[
                    CN.AVAXUSDTVault_v1_7,
                    CN.AVAXUSDTVault_v1_9_internal,
                ].map((usdtVault) =>
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.Transfer,
                        CN.USDT_e,
                        from,
                        newOffset,
                        [null, getAddress()[usdtVault].address]
                    )),
            );
        }

        //****@dev: number to be updated if additional events are integrated */
        if (eventCodes.some(el => el > 18)) {
            showError('etlStatefulEth.ts->etlStatefulEth()', 'Event code above the max value');
            result.push(false);
        }

        return result;

    } catch (err) {
        return [];
    }
}

export {
    etlStatefulAvax,
}