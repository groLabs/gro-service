import { getNetwork } from '../common/globalUtil';
import { loadStateful } from '../loader/loadStateful';
import { ContractNames as CN } from '../../registry/registry';
import {
    EventName as EV,
    GlobalNetwork as GN
} from '../types';

const etlStatefulAvax = (
    from: number,
    newOffset: number,
) => {
    try {
        let result = [];

        const vaults = [
            CN.AVAXDAIVault,
            CN.AVAXUSDCVault,
            CN.AVAXUSDTVault,
            CN.AVAXDAIVault_v1_7,
            CN.AVAXUSDCVault_v1_7,
            CN.AVAXUSDTVault_v1_7,
            // CN.AVAXDAIVault_v1_9_internal,
            // CN.AVAXUSDCVault_v1_9_internal,
            // CN.AVAXUSDTVault_v1_9_internal,
        ];

        const strategies = [
            // CN.AVAXDAIStrategy,
            // CN.AVAXUSDCStrategy,
            // CN.AVAXUSDTStrategy,
            CN.AVAXDAIStrategy_v1_7,
            CN.AVAXUSDCStrategy_v1_7,
            CN.AVAXUSDTStrategy_v1_7,
            // CN.AVAXDAIStrategy_v1_9_internal,
            // CN.AVAXUSDCStrategy_v1_9_internal,
            // CN.AVAXUSDTStrategy_v1_9_internal,
        ]

        const oracles = [
            CN.Chainlink_aggr_usdc_e,
            CN.Chainlink_aggr_usdt_e,
            CN.Chainlink_aggr_dai_e,
        ];

        result.push(
            // ...vaults.map((vault) =>
            //     loadStateful(
            //         getNetwork(GN.AVALANCHE).id,
            //         EV.LogDeposit,
            //         vault,
            //         from,
            //         newOffset,
            //     )),
            // ...vaults.map((vault) =>
            //     loadStateful(
            //         getNetwork(GN.AVALANCHE).id,
            //         EV.LogWithdrawal,
            //         vault,
            //         from,
            //         newOffset,
            //     )),
            ...vaults.map((vault) =>
                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.Approval,
                    vault,
                    from,
                    newOffset,
                )),
            // ...vaults.map((vault) =>
            //     loadStateful(
            //         getNetwork(GN.AVALANCHE).id,
            //         EV.Transfer,
            //         vault,
            //         from,
            //         newOffset,
            //     )),
            // ...vaults.map((vault) =>
            //     loadStateful(
            //         getNetwork(GN.AVALANCHE).id,
            //         EV.LogStrategyReported,
            //         vault,
            //         from,
            //         newOffset,
            //     )),
            // ...[
            //     CN.AVAXDAIVault_v1_7,
            //     CN.AVAXUSDCVault_v1_7,
            //     CN.AVAXUSDTVault_v1_7,
            // ].map((vault) =>
            //     loadStateful(
            //         getNetwork(GN.AVALANCHE).id,
            //         EV.LogNewReleaseFactor,
            //         vault,
            //         from,
            //         newOffset,
            //     )),
            // ...oracles.map((oracle) =>
            //     loadStateful(
            //         getNetwork(GN.AVALANCHE).id,
            //         EV.AnswerUpdated,
            //         oracle,
            //         from,
            //         newOffset,
            //     )),
            // loadStateful(
            //     getNetwork(GN.AVALANCHE).id,
            //     EV.LogClaim,
            //     CN.AVAXBouncer,
            //     from,
            //     newOffset,
            // ),
            // loadStateful(
            //     getNetwork(GN.AVALANCHE).id,
            //     EV.LogNewDrop,
            //     CN.AVAXBouncer,
            //     from,
            //     newOffset,
            // ),
            // ...strategies.map((strategy) =>
            //     loadStateful(
            //         getNetwork(GN.AVALANCHE).id,
            //         EV.LogNewPositionOpened,
            //         strategy,
            //         from,
            //         newOffset,
            //     )),
            // ...strategies.map((strategy) =>
            //     loadStateful(
            //         getNetwork(GN.AVALANCHE).id,
            //         EV.LogPositionAdjusted,
            //         strategy,
            //         from,
            //         newOffset,
            //     )),
            // ...strategies.map((strategy) =>
            //     loadStateful(
            //         getNetwork(GN.AVALANCHE).id,
            //         EV.LogPositionClosed,
            //         strategy,
            //         from,
            //         newOffset,
            //     )),
            // ...vaults.map((vault) =>
            //     loadStateful(
            //         getNetwork(GN.AVALANCHE).id,
            //         EV.LogNewStrategyHarvest,
            //         vault,
            //         from,
            //         newOffset,
            //     )),
            // ...[
            //     CN.AVAXDAIStrategy_v1_7,
            //     CN.AVAXUSDCStrategy_v1_7,
            //     CN.AVAXUSDTStrategy_v1_7,
            //     // CN.AVAXDAIStrategy_v1_9_internal,
            //     // CN.AVAXUSDCStrategy_v1_9_internal,
            //     // CN.AVAXUSDTStrategy_v1_9_internal,
            // ].map((strategy) =>
            //     loadStateful(
            //         getNetwork(GN.AVALANCHE).id,
            //         EV.LogHarvested,
            //         strategy,
            //         from,
            //         newOffset,
            //     )),
        );

        return result;

    } catch (err) {
        return [];
    }
}

export {
    etlStatefulAvax,
}