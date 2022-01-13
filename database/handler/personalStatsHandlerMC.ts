import moment from 'moment';
import { query } from './queryHandler';
import {
    errorObj,
    getNetwork,
} from '../common/globalUtil';
import { getConfig } from '../../common/configUtil';
import { showError } from '../handler/logHandler';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import {
    Transfer,
    GlobalNetwork as GN
} from '../types';
import { ICall } from '../interfaces/ICall';
const launchTimeEth = getConfig('blockchain.start_timestamp');
const launchTimeAvax = getConfig('blockchain.avax_launch_timestamp');


const showErrDesc = (err: any): string => JSON.stringify(err, Object.getOwnPropertyNames(err));

const getTransfers = async (account: string): Promise<ICall> => {
    try {
        const deposits_eth = [];
        const withdrawals_eth = [];
        const transfers_in_eth = [];
        const transfers_out_eth = [];
        let amount_added_gvt_eth = 0;
        let amount_added_pwrd_eth = 0;
        let amount_removed_gvt_eth = 0;
        let amount_removed_pwrd_eth = 0;

        const deposits_avax = [];
        const withdrawals_avax = [];
        const transfers_in_avax = [];
        const transfers_out_avax = [];
        let amount_added_usdc_e_avax = 0;
        let amount_added_usdt_e_avax = 0;
        let amount_added_dai_e_avax = 0;
        let amount_removed_usdc_e_avax = 0;
        let amount_removed_usdt_e_avax = 0;
        let amount_removed_dai_e_avax = 0;

        const q = 'select_fe_user_transactions.sql';
        const transfers = await query(q, [account]);

        if (transfers.status !== QUERY_ERROR) {

            for (const item of transfers.rows) {

                if (!item.token_id
                    || !item.transfer_id
                    || !item.usd_amount)
                    return errorObj(`Missing data in DB [transfers] for user ${account}`);

                switch (item.transfer_id) {
                    case Transfer.DEPOSIT:
                        deposits_eth.push(item);
                        amount_added_pwrd_eth += item.token_id === 1
                            ? parseFloat(item.usd_amount)
                            : 0;
                        amount_added_gvt_eth += item.token_id === 2
                            ? parseFloat(item.usd_amount)
                            : 0;
                        break;
                    case Transfer.WITHDRAWAL:
                        withdrawals_eth.push(item);
                        amount_removed_pwrd_eth += item.token_id === 1
                            ? parseFloat(item.usd_amount)
                            : 0;
                        amount_removed_gvt_eth += item.token_id === 2
                            ? parseFloat(item.usd_amount)
                            : 0;
                        break;
                    case Transfer.TRANSFER_GVT_IN:
                        transfers_in_eth.push(item);
                        amount_added_gvt_eth += parseFloat(item.usd_amount);
                        break;
                    case Transfer.TRANSFER_PWRD_IN:
                        transfers_in_eth.push(item);
                        amount_added_pwrd_eth += parseFloat(item.usd_amount);
                        break;
                    case Transfer.TRANSFER_GVT_OUT:
                        transfers_out_eth.push(item);
                        amount_removed_gvt_eth += parseFloat(item.usd_amount);
                        break;
                    case Transfer.TRANSFER_PWRD_OUT:
                        transfers_out_eth.push(item);
                        amount_removed_pwrd_eth += parseFloat(item.usd_amount);
                        break;
                    case Transfer.DEPOSIT_USDCe:
                        deposits_avax.push(item);
                        amount_added_usdc_e_avax += parseFloat(item.usd_amount);
                        break;
                    case Transfer.DEPOSIT_USDTe:
                        deposits_avax.push(item);
                        amount_added_usdt_e_avax += parseFloat(item.usd_amount);
                        break;
                    case Transfer.DEPOSIT_DAIe:
                        deposits_avax.push(item);
                        amount_added_dai_e_avax += parseFloat(item.usd_amount);
                        break;
                    case Transfer.WITHDRAWAL_USDCe:
                        withdrawals_avax.push(item);
                        amount_removed_usdc_e_avax += parseFloat(item.usd_amount);
                        break;
                    case Transfer.WITHDRAWAL_USDTe:
                        withdrawals_avax.push(item);
                        amount_removed_usdt_e_avax += parseFloat(item.usd_amount);
                        break;
                    case Transfer.WITHDRAWAL_DAIe:
                        withdrawals_avax.push(item);
                        amount_removed_dai_e_avax += parseFloat(item.usd_amount);
                        break;
                    case Transfer.TRANSFER_USDCe_IN:
                        transfers_in_avax.push(item);
                        amount_added_usdc_e_avax += parseFloat(item.usd_amount);
                        break;
                    case Transfer.TRANSFER_USDTe_IN:
                        transfers_in_avax.push(item);
                        amount_added_usdt_e_avax += parseFloat(item.usd_amount);
                        break;
                    case Transfer.TRANSFER_DAIe_IN:
                        transfers_in_avax.push(item);
                        amount_added_dai_e_avax += parseFloat(item.usd_amount);
                        break;
                    case Transfer.TRANSFER_USDCe_OUT:
                        transfers_out_avax.push(item);
                        amount_removed_usdc_e_avax += parseFloat(item.usd_amount);
                        break;
                    case Transfer.TRANSFER_USDTe_OUT:
                        transfers_out_avax.push(item);
                        amount_removed_usdt_e_avax += parseFloat(item.usd_amount);
                        break;
                    case Transfer.TRANSFER_DAIe_OUT:
                        transfers_out_avax.push(item);
                        amount_removed_dai_e_avax += parseFloat(item.usd_amount);
                        break;
                    default:
                        const msg = `Unrecognized transfer_id (${item.transfer_id})`;
                        showError('personalStatsHandlerMC.ts->getTransfers()', msg);
                        return errorObj(msg);
                }
            }

            const result = {
                "status": QUERY_SUCCESS,
                "data": {
                    "ethereum": {
                        "deposits": deposits_eth,
                        "withdrawals": withdrawals_eth,
                        "transfers_in": transfers_in_eth,
                        "transfers_out": transfers_out_eth,
                    },
                    "ethereum_amounts": {
                        "amount_added": {
                            "pwrd": amount_added_pwrd_eth.toString(),
                            "gvt": amount_added_gvt_eth.toString(),
                            "total": (amount_added_gvt_eth
                                + amount_added_pwrd_eth).toString(),
                        },
                        "amount_removed": {
                            "pwrd": amount_removed_pwrd_eth.toString(),
                            "gvt": amount_removed_gvt_eth.toString(),
                            "total": (amount_removed_gvt_eth
                                + amount_removed_pwrd_eth).toString(),
                        },
                        "net_amount_added": {
                            "pwrd": (amount_added_pwrd_eth - amount_removed_pwrd_eth).toString(),
                            "gvt": (amount_added_gvt_eth - amount_removed_gvt_eth).toString(),
                            "total": (amount_added_pwrd_eth
                                + amount_added_gvt_eth
                                - amount_removed_gvt_eth
                                - amount_removed_pwrd_eth).toString(),
                        },
                    },
                    "avalanche": {
                        "deposits": deposits_avax,
                        "withdrawals": withdrawals_avax,
                        "transfers_in": transfers_in_avax,
                        "transfers_out": transfers_out_avax,
                    },
                    "avalanche_amounts": {
                        "amount_added": {
                            "groUSDC.e_vault": amount_added_usdc_e_avax.toString(),
                            "groUSDT.e_vault": amount_added_usdt_e_avax.toString(),
                            "groDAI.e_vault": amount_added_dai_e_avax.toString(),
                            "total": (amount_added_usdc_e_avax
                                + amount_added_usdt_e_avax
                                + amount_added_dai_e_avax).toString(),
                        },
                        "amount_removed": {
                            "groUSDC.e_vault": amount_removed_usdc_e_avax.toString(),
                            "groUSDT.e_vault": amount_removed_usdt_e_avax.toString(),
                            "groDAI.e_vault": amount_removed_dai_e_avax.toString(),
                            "total": (amount_removed_usdc_e_avax
                                + amount_removed_usdt_e_avax
                                + amount_removed_dai_e_avax).toString(),
                        },
                        "net_amount_added": {
                            "groUSDC.e_vault": (amount_added_usdc_e_avax
                                - amount_removed_usdc_e_avax).toString(),
                            "groUSDT.e_vault": (amount_added_usdt_e_avax
                                - amount_removed_usdt_e_avax).toString(),
                            "groDAI.e_vault": (amount_added_dai_e_avax
                                - amount_removed_dai_e_avax).toString(),
                            "total": (amount_added_usdc_e_avax
                                + amount_added_usdt_e_avax
                                + amount_added_dai_e_avax
                                - amount_removed_usdc_e_avax
                                - amount_removed_usdt_e_avax
                                - amount_removed_dai_e_avax).toString(),
                        },
                    },
                },
            };
            return result;
        } else
            return errorObj(`Error from DB when querying transfers for user: ${account}`);

    } catch (err) {
        showError('personalStatsHandlerMC.ts->getTransfers()', err);
        return errorObj(`Error from DB when querying transfers -> ${showErrDesc(err)}`);
    }
}

const getNetBalances = async (account: string): Promise<ICall> => {
    try {
        const q = 'select_fe_user_net_balances.sql';
        const result = await query(q, [account]);
        let res;

        if (result.status !== QUERY_ERROR) {

            if (result.rows.length > 0)
                res = result.rows[0];

            // Check if any of the keys is missing
            if (!Object.values(res).some(x => x !== null && x !== ''))
                return errorObj(`Missing data in DB [balances] for user ${account}`);

            const daiValue =
                parseFloat(res.dai_e_1_0)
                + parseFloat(res.dai_e_1_5)
                + parseFloat(res.dai_e_1_6);
            const usdcValue =
                parseFloat(res.usdc_e_1_0)
                + parseFloat(res.usdc_e_1_5)
                + parseFloat(res.usdc_e_1_6);
            const usdtValue =
                parseFloat(res.usdt_e_1_0)
                + parseFloat(res.usdt_e_1_5)
                + parseFloat(res.usdt_e_1_6);

            return {
                "status": QUERY_SUCCESS,
                "data": {
                    "ethereum": {
                        "current_balance": {
                            "pwrd": res.pwrd,
                            "gvt": res.gvt,
                            "total": (parseFloat(res.pwrd)
                                + parseFloat(res.gvt)).toString(),
                        },
                    },
                    "avalanche": {
                        "current_balance": {
                            "groDAI.e_vault": daiValue.toString(),
                            "groUSDC.e_vault": usdcValue.toString(),
                            "groUSDT.e_vault": usdtValue.toString(),

                            "total": (usdcValue
                                + usdtValue
                                + daiValue).toString(),
                        },
                    },
                    "gro_balance_combined": res.gro_balance_combined,
                },
            };
        } else
            return errorObj(`Error from DB when querying balances for user: ${account}`);
    } catch (err) {
        showError('personalStatsHandlerMC.ts->getNetBalances()', err);
        return errorObj(showErrDesc(err));
    }
}

const getNetReturns = async (account: string): Promise<ICall> => {
    try {
        const qBalance = 'select_fe_user_net_returns.sql';
        const result = await query(qBalance, [account]);
        let res = {
            pwrd: '0',
            gvt: '0',
            usdc_e: '0',
            usdt_e: '0',
            dai_e: '0',
        };

        if (result.status !== QUERY_ERROR) {

            if (result.rows.length > 0)
                res = result.rows[0];

            // Check if any of the keys is missing
            if (!Object.values(res).some(x => x !== null && x !== ''))
                return errorObj(`Missing data in DB [returns] for user ${account}`);

            return {
                "status": QUERY_SUCCESS,
                "data": {
                    "ethereum": {
                        "net_returns": {
                            "pwrd": res.pwrd,
                            "gvt": res.gvt,
                            "total": (parseFloat(res.pwrd)
                                + parseFloat(res.gvt)).toString(),
                        },
                    },
                    "avalanche": {
                        "net_returns": {
                            "groDAI.e_vault": res.usdc_e,
                            "groUSDC.e_vault": res.usdt_e,
                            "groUSDT.e_vault": res.dai_e,
                            "total": (parseFloat(res.usdc_e)
                                + parseFloat(res.usdt_e)
                                + parseFloat(res.dai_e)).toString(),
                        },
                    },
                },
            };
        } else
            return errorObj(`Error from DB when querying net returns for user: ${account}`);
    } catch (err) {
        showError('personalStatsHandlerMC.ts->getNetReturns()', err);
        return errorObj(showErrDesc(err));

    }
}

const getMcTotals = (
    transfers: ICall,
    balances: ICall,
    returns: ICall,
): ICall => {
    try {
        const result = {
            "status": QUERY_SUCCESS,
            "data": {
                "amount_added": {
                    "ethereum": transfers.data.ethereum_amounts.amount_added.total,
                    "avalanche": transfers.data.avalanche_amounts.amount_added.total,
                    "total": (parseFloat(transfers.data.ethereum_amounts.amount_added.total)
                        + parseFloat(transfers.data.avalanche_amounts.amount_added.total)).toString(),
                },
                "amount_removed": {
                    "ethereum": transfers.data.ethereum_amounts.amount_removed.total,
                    "avalanche": transfers.data.avalanche_amounts.amount_removed.total,
                    "total": (parseFloat(transfers.data.ethereum_amounts.amount_removed.total)
                        + parseFloat(transfers.data.avalanche_amounts.amount_removed.total)).toString(),
                },
                "net_amount_added": {
                    "ethereum": transfers.data.ethereum_amounts.net_amount_added.total,
                    "avalanche": transfers.data.avalanche_amounts.net_amount_added.total,
                    "total": (parseFloat(transfers.data.ethereum_amounts.net_amount_added.total)
                        + parseFloat(transfers.data.avalanche_amounts.net_amount_added.total)).toString(),
                },
                "current_balance": {
                    "ethereum": balances.data.ethereum.current_balance.total,
                    "avalanche": balances.data.avalanche.current_balance.total,
                    "total": (parseFloat(balances.data.ethereum.current_balance.total)
                        + parseFloat(balances.data.avalanche.current_balance.total)).toString(),
                },
                "net_returns": {
                    "ethereum": returns.data.ethereum.net_returns.total,
                    "avalanche": returns.data.avalanche.net_returns.total,
                    "total": (parseFloat(returns.data.ethereum.net_returns.total)
                        + parseFloat(returns.data.avalanche.net_returns.total)).toString(),
                },
            },
        }
        return result;
    } catch (err) {
        showError('personalStatsHandlerMC.ts->getMcTotals()', err);
        return errorObj(`Error when parsing MC Totals -> ${showErrDesc(err)}`);
    }
}

const getPersonalStatsMC = async (account: string) => {
    try {
        const [
            transfers,
            balances,
            returns
        ] = await Promise.all([
            getTransfers(account),
            getNetBalances(account),
            getNetReturns(account),
        ]);
        const mcTotals = getMcTotals(transfers, balances, returns);

        if (transfers.status === QUERY_ERROR) {
            return {
                "gro_personal_position_mc": {
                    ...errorObj(transfers.data),
                },
            };
        } else if (balances.status === QUERY_ERROR) {
            return {
                "gro_personal_position_mc": {
                    ...errorObj(balances.data),
                },
            };
        } else if (returns.status === QUERY_ERROR) {
            return {
                "gro_personal_position_mc": {
                    ...errorObj(returns.data),
                },
            };
        } else if (mcTotals.status === QUERY_ERROR) {
            return {
                "gro_personal_position_mc": {
                    ...errorObj(mcTotals.data),
                },
            };
        } else {
            const result = {
                "gro_personal_position_mc": {
                    "status": QUERY_SUCCESS.toString(),
                    "current_timestamp": moment().unix().toString(),
                    "address": account,
                    "network": getNetwork(GN.ETHEREUM).name,
                    "mc_totals": mcTotals.data,
                    "ethereum": {
                        "launch_timestamp": launchTimeEth.toString(),
                        "network_id": getNetwork(GN.ETHEREUM).id.toString(),
                        "transaction": transfers.data.ethereum,
                        ...transfers.data.ethereum_amounts,
                        ...balances.data.ethereum,
                        ...returns.data.ethereum,
                        "gro_balance_combined": balances.data.gro_balance_combined,
                    },
                    "avalanche": {
                        "launch_timestamp": launchTimeAvax.toString(),
                        "network_id": getNetwork(GN.AVALANCHE).id.toString(),
                        "transaction": transfers.data.avalanche,
                        ...transfers.data.avalanche_amounts,
                        ...balances.data.avalanche,
                        ...returns.data.avalanche,
                    },
                },
            };
            return result;
        }

    } catch (err) {
        showError('personalStatsHandlerMC.ts->getPersonalStatsMC()', err);
        return errorObj(`Error when parsing the final JSON output -> ${showErrDesc(err)}`);
    }
}

export {
    getPersonalStatsMC,
}
