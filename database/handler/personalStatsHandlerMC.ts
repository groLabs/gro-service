import moment from 'moment';
import { query } from './queryHandler';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import {
    Transfer,
    GlobalNetwork as GN
} from '../types';
import { getNetwork } from '../common/globalUtil';
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);

const ERROR_TRANSFERS = {
    "status": QUERY_ERROR,
    "message": "error from DB in personalStatsHandlerMC.ts->getTransfers()",
    "data": {
        "ethereum": {},
        "ethereum_amounts": {},
        "avalanche": {},
        "avalanche_amounts": {},
    }
}
const ERROR_BALANCES = {
    "status": QUERY_ERROR,
    "message": "error from DB in personalStatsHandlerMC.ts->getNetBalances()",
    "data": {
        "ethereum": {},
        "avalanche": {},
    }
}
const ERROR_RETURNS = {
    "status": QUERY_ERROR,
    "message": "error from DB in personalStatsHandlerMC.ts->getNetReturns()",
    "data": {
        "ethereum": {},
        "avalanche": {},
    }
}
const ERROR_MC_AMOUNTS = {
    "status": QUERY_ERROR,
    "message": "error from DB in personalStatsHandlerMC.ts->getMcTotals()",
    "data": {},
}

const ERROR_GLOBAL = {
    "gro_personal_position_mc": {
        "status": QUERY_ERROR,
        "message": "error from DB in personalStatsHandlerMC.ts->getPersonalStatsMC()",
        "data": {},
    }
}


const getTransfers = async (account: string) => {
    try {
        const q = 'select_fe_user_transactions.sql';
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

        const transfers = await query(q, [account]);

        if (transfers.status !== QUERY_ERROR) {
            for (const item of transfers.rows) {

                if (!item.token_id
                    || !item.transfer_id
                    || !item.usd_amount)
                    return ERROR_TRANSFERS;

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
                        logger.error(`**DB: Error in personalStatsHandlerMC.ts->getTransfers(): ${msg}`);
                        break;
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
                }
            }
            return result;
        } else
            return ERROR_TRANSFERS;

    } catch (err) {
        logger.error(`**DB: Error in personalStatsHandlerMC.ts->getTransfers(): ${err}`);
        return ERROR_TRANSFERS;
    }
}

const getNetBalances = async (account: string) => {
    try {
        const q = 'select_fe_user_net_balances.sql';
        const result = await query(q, [account]);
        if (result.status !== QUERY_ERROR) {
            const res = result.rows[0];

            if (!res.pwrd
                || !res.gvt
                || !res.usdc_e
                || !res.usdt_e
                || !res.dai_e)
                return ERROR_BALANCES;

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
                        "gro_balance_combined": res.gro_balance_combined,
                    },
                    "avalanche": {
                        "current_balance": {
                            "groDAI.e_vault": res.usdc_e,
                            "groUSDC.e_vault": res.usdt_e,
                            "groUSDT.e_vault": res.dai_e,
                            "total": (parseFloat(res.usdc_e)
                                + parseFloat(res.usdt_e)
                                + parseFloat(res.dai_e)).toString(),
                        },
                    }
                }
            }
        } else
            return ERROR_BALANCES
    } catch (err) {
        logger.error(`**DB: Error in personalStatsHandlerMC.ts->getNetBalances(): ${err}`);
        return ERROR_BALANCES;
    }
}

const getNetReturns = async (account: string) => {
    try {
        const qBalance = 'select_fe_user_net_returns.sql';
        const result = await query(qBalance, [account]);
        if (result.status !== QUERY_ERROR) {
            const res = result.rows[0];

            if (!res.pwrd
                || !res.gvt
                || !res.usdc_e
                || !res.usdt_e
                || !res.dai_e)
                return ERROR_RETURNS;

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
                    }
                }
            }
        } else
            return ERROR_RETURNS;
    } catch (err) {
        logger.error(`**DB: Error in personalStatsHandlerMC.ts->getNetReturns(): ${err}`);
        return ERROR_RETURNS;
    }
}

const getMcTotals = (transfers, balances, returns) => {
    try {
        const result = {
            "status": QUERY_SUCCESS,
            "data": {
                "amount_added": {
                    "ethereum": transfers.data.ethereum_amounts.amount_added.total,
                    "avalanche": transfers.data.avalanche_amounts.amount_added.total,
                    "total": (parseFloat(transfers.data.ethereum_amounts.amount_added.total)
                        + parseFloat(transfers.data.avalanche_amounts.amount_added.total)).toString()
                },
                "amount_removed": {
                    "ethereum": transfers.data.ethereum_amounts.amount_removed.total,
                    "avalanche": transfers.data.avalanche_amounts.amount_removed.total,
                    "total": (parseFloat(transfers.data.ethereum_amounts.amount_removed.total)
                        + parseFloat(transfers.data.avalanche_amounts.amount_removed.total)).toString()
                },
                "net_amount_added": {
                    "ethereum": transfers.data.ethereum_amounts.net_amount_added.total,
                    "avalanche": transfers.data.avalanche_amounts.net_amount_added.total,
                    "total": (parseFloat(transfers.data.ethereum_amounts.net_amount_added.total)
                        + parseFloat(transfers.data.avalanche_amounts.net_amount_added.total)).toString()
                },
                "current_balance": {
                    "ethereum": balances.data.ethereum.current_balance.total,
                    "avalanche": balances.data.avalanche.current_balance.total,
                    "total": (parseFloat(balances.data.ethereum.current_balance.total)
                        + parseFloat(balances.data.avalanche.current_balance.total)).toString()
                },
                "net_returns": {
                    "ethereum": returns.data.ethereum.net_returns.total,
                    "avalanche": returns.data.avalanche.net_returns.total,
                    "total": (parseFloat(returns.data.ethereum.net_returns.total)
                        + parseFloat(returns.data.avalanche.net_returns.total)).toString()
                },
                "gro_balance_combined": balances.data.ethereum.gro_balance_combined,
            }
        }
        return result;
    } catch (err) {
        logger.error(`**DB: Error in personalStatsHandlerMC.ts->getMcTotals(): ${err}`);
        return ERROR_MC_AMOUNTS
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
            getNetReturns(account)
        ]);

        if (transfers.status === QUERY_ERROR) {
            return {
                "gro_personal_position_mc": ERROR_TRANSFERS,
            };
        } else if (balances.status === QUERY_ERROR) {
            return {
                "gro_personal_position_mc": ERROR_BALANCES,
            };
        } else if (returns.status === QUERY_ERROR) {
            return {
                "gro_personal_position_mc": ERROR_RETURNS,
            };
        } else {
            const mcTotals = getMcTotals(transfers, balances, returns);
            const result = {
                "gro_personal_position_mc": {
                    "status": QUERY_SUCCESS,
                    "current_timestamp": moment().unix(),
                    "address": account,
                    "network": getNetwork(GN.ETHEREUM).name,
                    "mc_totals": mcTotals,
                    "ethereum": {
                        "transaction": transfers.data.ethereum,
                        ...transfers.data.ethereum_amounts,
                        ...balances.data.ethereum,
                        ...returns.data.ethereum,
                    },
                    "avalanche": {
                        "transaction": transfers.data.avalanche,
                        ...transfers.data.avalanche_amounts,
                        ...balances.data.avalanche,
                        ...returns.data.avalanche,
                    }
                }
            }

            console.log('here global', result.gro_personal_position_mc);
            console.log('here mc_totals', result.gro_personal_position_mc.mc_totals);
            // console.log('** eth transactions **', result.gro_personal_position_mc.ethereum.transaction);
            // console.log('** eth amounts **', result.gro_personal_position_mc.ethereum);
            // console.log('** avax amounts **', result.gro_personal_position_mc.avalanche);

            return result;
        }

    } catch (err) {
        logger.error(`**DB: Error in personalStatsHandlerMC.ts->getPersonalStatsMC(): ${err}`);
        return ERROR_GLOBAL;
    }
}

export {
    getPersonalStatsMC,
}
