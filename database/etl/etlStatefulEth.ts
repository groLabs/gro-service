import { getNetwork } from '../common/globalUtil';
import { loadStateful } from '../loader/loadStateful';
import { ContractNames as CN } from '../../registry/registry';
import {
    EventName as EV,
    GlobalNetwork as GN
} from '../types';

const etlStatefulEth = (
    from: number,
    newOffset: number,
) => {
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
            // TODO: others?
        ];

        const vaults = [
            CN.DAIVault,
            CN.USDCVault,
            CN.USDTVault,
        ];

        result.push(
            // loadStateful(
            //     getNetwork(GN.ETHEREUM).id,
            //     EV.LogNewDeposit,
            //     CN.depositHandler,
            //     from,
            //     newOffset
            // ),
            // loadStateful(
            //     getNetwork(GN.ETHEREUM).id,
            //     EV.LogNewWithdrawal,
            //     CN.withdrawHandler,
            //     from,
            //     newOffset
            // ),
            // loadStateful(
            //     getNetwork(GN.ETHEREUM).id,
            //     EV.LogEmergencyWithdrawal,
            //     CN.emergencyHandler,
            //     from,
            //     newOffset
            // ),
            // ...groTokenContracts.map((groTokenContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.Transfer,
            //         groTokenContract,
            //         from,
            //         newOffset,
            //     )),
            // ...[
            //     CN.powerD,
            //     CN.groVault,
            //     CN.GroDAOToken,
            // ].map((groTokenContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.Approval,
            //         groTokenContract,
            //         from,
            //         newOffset,
            //     )),
            // ...[
            //     CN.DAI,
            //     CN.USDC,
            //     CN.USDT,
            // ].map((stableCoin) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.Approval,
            //         stableCoin,
            //         from,
            //         newOffset,
            //     )),
            // loadStateful(
            //     getNetwork(GN.ETHEREUM).id,
            //     EV.LogBonusClaimed,
            //     CN.GroHodler,
            //     from,
            //     newOffset
            // ),
            // loadStateful(
            //     getNetwork(GN.ETHEREUM).id,
            //     EV.LogClaim,
            //     CN.Airdrop,
            //     from,
            //     newOffset
            // ),
            // ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.LogDeposit,
            //         LpTokenStakerContract,
            //         from,
            //         newOffset
            //     )),
            // ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.LogClaim,
            //         LpTokenStakerContract,
            //         from,
            //         newOffset
            //     )),
            // ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.LogWithdraw,
            //         LpTokenStakerContract,
            //         from,
            //         newOffset
            //     )),
            // ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.LogAddPool,
            //         LpTokenStakerContract,
            //         from,
            //         newOffset
            //     )),
            // ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.LogSetPool,
            //         LpTokenStakerContract,
            //         from,
            //         newOffset
            //     )),
            // ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.LogMaxGroPerBlock,
            //         LpTokenStakerContract,
            //         from,
            //         newOffset
            //     )),
            // ...LpTokenStakerContracts.map((LpTokenStakerContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.LogGroPerBlock,
            //         LpTokenStakerContract,
            //         from,
            //         newOffset
            //     )),
            // ...[CN.LPTokenStakerV2].map((LpTokenStakerContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.LogMultiClaim,
            //         LpTokenStakerContract,
            //         from,
            //         newOffset
            //     )),
            // ...[CN.LPTokenStakerV2].map((LpTokenStakerContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.LogMultiWithdraw,
            //         LpTokenStakerContract,
            //         from,
            //         newOffset
            //     )),
            // ...[CN.LPTokenStakerV2].map((LpTokenStakerContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.LogEmergencyWithdraw,
            //         LpTokenStakerContract,
            //         from,
            //         newOffset
            //     )),
            // ...[CN.LPTokenStakerV2].map((LpTokenStakerContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.LogMigrateUser,
            //         LpTokenStakerContract,
            //         from,
            //         newOffset
            //     )),
            // loadStateful(
            //     getNetwork(GN.ETHEREUM).id,
            //     EV.LogPnLExecution,
            //     CN.pnl,
            //     from,
            //     newOffset
            // ),
            // ...strategies.map((strategy) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.Harvested,
            //         strategy,
            //         from,
            //         newOffset
            //     )),
            // ...vaults.map((vault) =>
            // loadStateful(
            //     getNetwork(GN.ETHEREUM).id,
            //     EV.StrategyReported,
            //     vault,
            //     from,
            //     newOffset,
            // )),
            // ...vaults.map((vault) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.StrategyUpdateDebtRatio,
            //         vault,
            //         from,
            //         newOffset,
            //     )),
            // ...oracles.map((oracle) =>
            // loadStateful(
            //     getNetwork(GN.ETHEREUM).id,
            //     EV.AnswerUpdated,
            //     oracle,
            //     from,
            //     newOffset,
            // )),
            // 1off load to track transfers from emergencyHandler
            // ...[
            //     CN.USDC,
            //     CN.USDT,
            //     CN.DAI
            // ].map((stableContract) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.Transfer,
            //         stableContract,
            //         from,
            //         newOffset
            //     )),
            // pools
            // loadStateful(
            //     getNetwork(GN.ETHEREUM).id,
            //     EV.Swap,
            //     CN.BalancerV2Vault,
            //     from,
            //     newOffset
            // ),
            // loadStateful(
            //     getNetwork(GN.ETHEREUM).id,
            //     EV.PoolBalanceChanged,
            //     CN.BalancerV2Vault,
            //     from,
            //     newOffset
            // ),
            // ...[
            //     CN.UniswapV2Pair_gvt_gro,
            //     CN.UniswapV2Pair_gro_usdc,
            // ].map((uniPair) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.Swap,
            //         uniPair,
            //         from,
            //         newOffset
            //     )),
            // ...[
            //     CN.UniswapV2Pair_gvt_gro,
            //     CN.UniswapV2Pair_gro_usdc,
            // ].map((uniPair) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.Mint,
            //         uniPair,
            //         from,
            //         newOffset
            //     )),
            // ...[
            //     CN.UniswapV2Pair_gvt_gro,
            //     CN.UniswapV2Pair_gro_usdc,
            // ].map((uniPair) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         EV.Burn,
            //         uniPair,
            //         from,
            //         newOffset
            //     )),
            // ...[
            //     EV.TokenExchange,
            //     EV.TokenExchangeUnderlying,
            // ].map((event) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         event,
            //         CN.Curve_PWRD3CRV,
            //         from,
            //         newOffset
            //     )),
            // ...[
            //     EV.AddLiquidity,
            //     EV.RemoveLiquidity,
            //     EV.RemoveLiquidityOne,
            //     EV.RemoveLiquidityImbalance,
            // ].map((event) =>
            //     loadStateful(
            //         getNetwork(GN.ETHEREUM).id,
            //         event,
            //         CN.Curve_PWRD3CRV,
            //         from,
            //         newOffset
            //     )),


            loadStateful(
                getNetwork(GN.ETHEREUM).id,
                EV.LogVest,
                CN.GroVesting,
                from,
                newOffset
            ),
        );
        return result;

    } catch (err) {
        return [];
    }
}

export {
    etlStatefulEth,
}