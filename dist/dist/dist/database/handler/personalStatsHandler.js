"use strict";
const { query } = require('./queryHandler');
// const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { QUERY_ERROR } = require('../constants');
const getTransfers = async (account) => {
    try {
        const qTransfers = 'select_fe_user_transactions.sql';
        const qApprovals = 'select_fe_user_approvals.sql';
        // TODO: if (res.every( val => (val !== 400 ))) {
        const [deposits, withdrawals, ext_gvt_deposit, ext_pwrd_deposit, ext_gvt_withdrawal, ext_pwrd_withdrawal, approvals,] = await Promise.all([
            query(qTransfers, [account, 'deposit']),
            query(qTransfers, [account, 'withdrawal']),
            query(qTransfers, [account, 'ext_gvt_deposit']),
            query(qTransfers, [account, 'ext_pwrd_deposit']),
            query(qTransfers, [account, 'ext_gvt_withdrawal']),
            query(qTransfers, [account, 'ext_pwrd_withdrawal']),
            query(qApprovals, [account]),
        ]);
        if (deposits.status !== QUERY_ERROR
            && withdrawals.status !== QUERY_ERROR
            && ext_gvt_deposit.status !== QUERY_ERROR
            && ext_pwrd_deposit.status !== QUERY_ERROR
            && ext_gvt_withdrawal.status !== QUERY_ERROR
            && ext_pwrd_withdrawal.status !== QUERY_ERROR
            && approvals.status !== QUERY_ERROR) {
            return {
                "deposits": deposits.rows,
                "withdrawals": withdrawals.rows,
                "transfers_in": ext_gvt_deposit.rows.concat(ext_pwrd_deposit.rows),
                "transfers_out": ext_gvt_withdrawal.rows.concat(ext_pwrd_withdrawal.rows),
                "approvals": approvals.rows,
            };
        }
        else
            return null;
    }
    catch (err) {
        console.log(err);
        return null;
    }
};
const getNetAmounts = async (account) => {
    try {
        const qNetAmounts = 'select_fe_user_net_amounts.sql';
        const result = await query(qNetAmounts, [account]);
        if (result.status !== QUERY_ERROR) {
            const res = result.rows[0];
            return {
                "amount_added": {
                    "pwrd": res.pwrd_in,
                    "gvt": res.gvt_in,
                    "total": res.total_in,
                },
                "amount_removed": {
                    "pwrd": res.pwrd_out,
                    "gvt": res.gvt_out,
                    "total": res.total_out,
                },
                "net_amount_added": {
                    "pwrd": res.pwrd_net,
                    "gvt": res.gvt_net,
                    "total": res.total_net,
                },
            };
        }
        else
            return {};
    }
    catch (err) {
        console.log(err);
        return {};
    }
};
const getNetBalances = async (account) => {
    try {
        const qBalance = 'select_fe_user_net_balances.sql';
        const result = await query(qBalance, [account]);
        if (result.status !== QUERY_ERROR) {
            const res = result.rows[0];
            console.log('res:', res);
            return {
                "current_balance": {
                    "pwrd": res.pwrd,
                    "gvt": res.gvt,
                    "total": res.total,
                },
            };
        }
        else
            return {};
    }
    catch (err) {
        console.log(err);
        return {};
    }
};
const getNetReturns = async (account) => {
    try {
        const qBalance = 'select_fe_user_net_returns.sql';
        const result = await query(qBalance, [account]);
        if (result.status !== QUERY_ERROR) {
            const res = result.rows[0];
            console.log('res:', res);
            return {
                "net_returns": {
                    "pwrd": res.return_pwrd,
                    "gvt": res.return_gvt,
                    "total": res.return_total,
                },
                "net_returns_ratio": {
                    "pwrd": res.ratio_pwrd,
                    "gvt": res.ratio_gvt,
                    "total": res.ratio_total,
                },
            };
        }
        else
            return {};
    }
    catch (err) {
        console.log(err);
        return {};
    }
};
const getPersonalStats = async (/*toDate,*/ account) => {
    try {
        // if (!(/^\d{10}$/).test(_toDate))
        //     return {
        //         "error": 'wrong timestamp'
        //     }
        const [transfers, netAmounts, balances, returns] = await Promise.all([
            getTransfers(account),
            getNetAmounts(account),
            getNetBalances(account),
            getNetReturns(account)
        ]);
        const toDate = moment.utc();
        const launchDate = moment
            .utc(toDate, "DD/MM/YYYY")
            .unix();
        console.log('transfers:', transfers);
        const result = {
            "gro_personal_position": Object.assign(Object.assign(Object.assign(Object.assign({ "transaction": transfers, "current_timestamp": moment().unix(), "launch_timestamp": launchDate, "network": process.env.NODE_ENV.toLowerCase() }, netAmounts), balances), returns), { "address": account })
        };
        //console.log(result.gro_personal_position.transaction);
        //console.log(result);
        return result;
    }
    catch (err) {
        console.log(err);
        return {};
    }
};
module.exports = {
    getPersonalStats
};
