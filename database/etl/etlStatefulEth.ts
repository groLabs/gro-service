import { getNetwork } from '../common/globalUtil';
import { showError } from '../handler/logHandler';
import { loadStateful } from '../loader/loadStateful';
import { ContractNames as CN } from '../../registry/registry';
import { getLatestContractsAddress as getAddress } from '../../registry/registryLoader';
import {
    EventName as EV,
    GlobalNetwork as GN
} from '../types';
import { ZERO_ADDRESS } from '../constants';


const etlStatefulEth = (
    from: number,
    newOffset: number,
    eventCodes: number[],
): Promise<any>[] => {
    try {
        let result = [];

        const groTokenContracts = [
            CN.powerD,
            CN.groVault,
            CN.GroDAOToken,
        ];

        const LpTokenStakerContracts = [
            CN.LPTokenStakerV1,
            CN.LPTokenStakerV2
        ];

        const oracles = [
            CN.Chainlink_aggr_usdc,
            CN.Chainlink_aggr_usdt,
            CN.Chainlink_aggr_dai,
        ];

        const strategies = [
            CN.DAIPrimary,
            CN.USDCPrimary,
            CN.USDTPrimary,
            CN.DAISecondary,
        ];

        const vaults = [
            CN.DAIVault,
            CN.USDCVault,
            CN.USDTVault,
        ];

        if (eventCodes.includes(1)) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogNewDeposit,
                    CN.depositHandler,
                    from,
                    newOffset,
                    []
                )
            );
        }

        if (eventCodes.includes(2)) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogNewWithdrawal,
                    CN.withdrawHandler,
                    from,
                    newOffset,
                    []
                )
            );
        }

        if (eventCodes.includes(3)) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogEmergencyWithdrawal,
                    CN.emergencyHandler,
                    from,
                    newOffset,
                    []
                ),
            );
        }

        if (eventCodes.includes(4)) {
            result.push(
                ...groTokenContracts.map((groTokenContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.Transfer,
                        groTokenContract,
                        from,
                        newOffset,
                        []
                    ))
            );
        }

        if (eventCodes.includes(5)) {
            result.push(
                ...groTokenContracts.map((groTokenContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.Approval,
                        groTokenContract,
                        from,
                        newOffset,
                        []
                    ))
            );
        }

        if (eventCodes.includes(6)) {
            result.push(
                ...[
                    CN.DAI,
                    CN.USDC,
                    CN.USDT,
                ].map((stableCoin) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.Approval,
                        stableCoin,
                        from,
                        newOffset,
                        [null, getAddress()[CN.depositHandler].address]
                    )),
            );
        }

        if (eventCodes.includes(7)) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogBonusClaimed,
                    CN.GroHodler,
                    from,
                    newOffset,
                    []

                ),
            );
        }

        if (eventCodes.includes(8)) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogClaim,
                    CN.Airdrop,
                    from,
                    newOffset,
                    []
                ),
            );
        }

        if (eventCodes.includes(9)) {
            result.push(
                ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogDeposit,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(10)) {
            result.push(
                ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogClaim,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(11)) {
            result.push(
                ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogWithdraw,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(12)) {
            result.push(
                ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogAddPool,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(13)) {
            result.push(
                ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogSetPool,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(14)) {
            result.push(
                ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogMaxGroPerBlock,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(15)) {
            result.push(
                ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogGroPerBlock,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(16)) {
            result.push(
                ...[CN.LPTokenStakerV2].map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogMultiClaim,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(17)) {
            result.push(
                ...[CN.LPTokenStakerV2].map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogMultiWithdraw,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(18)) {
            result.push(
                ...[CN.LPTokenStakerV2].map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogEmergencyWithdraw,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(19)) {
            result.push(
                ...[CN.LPTokenStakerV2].map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogMigrateUser,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(20)) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogPnLExecution,
                    CN.pnl,
                    from,
                    newOffset,
                    []
                ),
            );
        }

        if (eventCodes.includes(21)) {
            result.push(
                ...strategies.map((strategy) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.Harvested,
                        strategy,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(22)) {
            result.push(
                ...vaults.map((vault) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.StrategyReported,
                        vault,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(23)) {
            result.push(
                ...vaults.map((vault) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.StrategyUpdateDebtRatio,
                        vault,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(24)) {
            result.push(
                ...oracles.map((oracle) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.AnswerUpdated,
                        oracle,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        // 1off load to track transfers from emergencyHandler
        if (eventCodes.includes(25)) {
            result.push(
                ...[
                    CN.USDC,
                    CN.USDT,
                    CN.DAI
                ].map((stableContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.Transfer,
                        stableContract,
                        from,
                        newOffset,
                        [getAddress()[CN.emergencyHandler].address, null]
                    )),
            );
        }

        // ***** pools ***********

        if (eventCodes.includes(26)) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.Swap,
                    CN.BalancerV2Vault,
                    from,
                    newOffset,
                    ['0x702605f43471183158938c1a3e5f5a359d7b31ba00020000000000000000009f', null, null]
                ),
            );
        }

        if (eventCodes.includes(27)) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.PoolBalanceChanged,
                    CN.BalancerV2Vault,
                    from,
                    newOffset,
                    ['0x702605f43471183158938c1a3e5f5a359d7b31ba00020000000000000000009f', null]
                ),
            );
        }

        if (eventCodes.includes(28)) {
            result.push(
                ...[
                    CN.UniswapV2Pair_gvt_gro,
                    CN.UniswapV2Pair_gro_usdc,
                ].map((uniPair) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.Swap,
                        uniPair,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(29)) {
            result.push(
                ...[
                    CN.UniswapV2Pair_gvt_gro,
                    CN.UniswapV2Pair_gro_usdc,
                ].map((uniPair) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.Mint,
                        uniPair,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(30)) {
            result.push(
                ...[
                    CN.UniswapV2Pair_gvt_gro,
                    CN.UniswapV2Pair_gro_usdc,
                ].map((uniPair) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.Burn,
                        uniPair,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(31)) {
            result.push(
                ...[
                    EV.TokenExchange,
                    EV.TokenExchangeUnderlying,
                ].map((event) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        event,
                        CN.Curve_PWRD3CRV,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(32)) {
            result.push(
                ...[
                    EV.AddLiquidity,
                    EV.RemoveLiquidity,
                    EV.RemoveLiquidityOne,
                    EV.RemoveLiquidityImbalance,
                ].map((event) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        event,
                        CN.Curve_PWRD3CRV,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(33)) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogVest,
                    CN.GroVesting,
                    from,
                    newOffset,
                    []
                ),
            );
        }

        if (eventCodes.includes(34)) {
            result.push(
                ...[
                    EV.LogExit,
                    EV.LogInstantExit,
                ].map((event) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        event,
                        CN.GroVesting,
                        from,
                        newOffset,
                        []
                    )),
            );
        }

        if (eventCodes.includes(35)) {
            result.push(
                ...[
                    CN.UniswapV2Pair_gvt_gro,
                    CN.UniswapV2Pair_gro_usdc,
                    CN.Curve_PWRD3CRV,
                    CN.Balancer_gro_weth_LP,
                ].map((pool) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.Transfer,
                        pool,
                        from,
                        newOffset,
                        [ZERO_ADDRESS, null]
                    )),
            );
        }

        if (eventCodes.includes(36)) {
            result.push(
                ...[
                    CN.UniswapV2Pair_gvt_gro,
                    CN.UniswapV2Pair_gro_usdc,
                    CN.Curve_PWRD3CRV,
                    CN.Balancer_gro_weth_LP,
                ].map((pool) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.Transfer,
                        pool,
                        from,
                        newOffset,
                        [null, ZERO_ADDRESS]
                    )),
            );
        }

        if (eventCodes.includes(37)) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.Transfer,
                    CN.Curve_3CRV,
                    from,
                    newOffset,
                    [getAddress()[CN.Curve_PWRD3CRV].address, null]
                ),
            );
        }

        if (eventCodes.includes(38)) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.Transfer,
                    CN.Curve_3CRV,
                    from,
                    newOffset,
                    [null, getAddress()[CN.Curve_PWRD3CRV].address]
                ),
            );
        }

        if (eventCodes.includes(39)) {
            result.push(
                ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
                    loadStateful(
                        getNetwork(GN.ETHEREUM).id,
                        EV.LogUpdatePool,
                        LpTokenStakerContract,
                        from,
                        newOffset,
                        []
                    )),
            );
        }


        //****@dev: number to be updated if additional events are integrated
        if (eventCodes.some(el => el > 39)) {
            showError('etlStatefulEth.ts->etlStatefulEth()', 'Event code above the max value');
            result.push(false);
        }

        return result;

    } catch (err) {
        return [];
    }
}

export {
    etlStatefulEth,
}
