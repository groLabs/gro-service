const { query } = require('./queryHandler');
// const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');

const QUERY_ERROR = 400;

const getTransfers = async (account, toDate) => {
    try {
        const qTransfers = 'select_fe_user_transactions.sql';
        const qApprovals = 'select_fe_user_approvals.sql';

        const [
            deposits,
            withdrawals,
            ext_gvt_deposit,
            ext_pwrd_deposit,
            ext_gvt_withdrawal,
            ext_pwrd_withdrawal,
            approvals,
        ] = await Promise.all([
            query(qTransfers, [account, 'deposit', toDate]),
            query(qTransfers, [account, 'withdrawal', toDate]),
            query(qTransfers, [account, 'ext_gvt_deposit', toDate]),
            query(qTransfers, [account, 'ext_pwrd_deposit', toDate]),
            query(qTransfers, [account, 'ext_gvt_withdrawal', toDate]),
            query(qTransfers, [account, 'ext_pwrd_withdrawal', toDate]),
            query(qApprovals, [account, toDate]),
        ]);

        if (deposits !== QUERY_ERROR
            && withdrawals !== QUERY_ERROR
            && ext_gvt_deposit !== QUERY_ERROR
            && ext_pwrd_deposit !== QUERY_ERROR
            && ext_gvt_withdrawal !== QUERY_ERROR
            && ext_pwrd_withdrawal !== QUERY_ERROR
            && approvals !== QUERY_ERROR) {
            return {
                "deposits": deposits.rows,
                "withdrawals": withdrawals.rows,
                "transfers_in": ext_gvt_deposit.rows.concat(ext_pwrd_deposit.rows),
                "transfers_out": ext_gvt_withdrawal.rows.concat(ext_pwrd_withdrawal.rows),
                "approvals": approvals.rows,
            }
        } else
            return {};
    } catch (err) {
        console.log(err);
        return {};
    }
}

const getNetAmounts = async (account, toDate) => {
    try {
        const qNetAmounts = 'select_fe_user_net_amounts.sql';
        const result = await query(qNetAmounts, [account, toDate]);
        if (result !== QUERY_ERROR) {
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
            }
        } else
            return {};
    } catch (err) {
        console.log(err);
        return {};
    }
}

const getNetBalances = async (account, toDate) => {
    try {
        const qBalance = 'select_fe_user_net_balances.sql';
        const result = await query(qBalance, [account, toDate]);
        if (result !== QUERY_ERROR) {
            const res = result.rows[0];
            console.log('res:', res)
            return {
                "current_balance": {
                    "pwrd": res.pwrd,
                    "gvt": res.gvt,
                    "total": res.total,
                },
            }
        } else
            return {};
    } catch (err) {
        console.log(err);
        return {};
    }
}

const getNetReturns = async (account, toDate) => {
    try {
        const qBalance = 'select_fe_user_net_returns.sql';
        const result = await query(qBalance, [account, toDate]);
        if (result !== QUERY_ERROR) {
            const res = result.rows[0];
            console.log('res:', res)
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
            }
        } else
            return {};
    } catch (err) {
        console.log(err);
        return {};
    }
}

const getPersonalStats = async (toDate, account) => {
    try {

        // TODO IMPROVEMENT *** Promise.all ***
        const transfers = await getTransfers(account, toDate);
        const netAmounts = await getNetAmounts(account, toDate);
        const balances = await getNetBalances(account, toDate);
        const returns = await getNetReturns(account, toDate);
        const launchDate = moment.utc(toDate, "DD/MM/YYYY")
            .add(23, 'hours')
            .add(59, 'minutes')
            .add(59, 'seconds')
            .unix();

        const result = {
            "gro_personal_position": {
                "transaction": transfers,
                "current_timestamp": moment().unix(),
                "launch_timestamp": launchDate,
                "network": process.env.NODE_ENV.toLowerCase(),
                ...netAmounts,
                ...balances,
                ...returns,
                "address": account,
            }
        }

        console.log(result.gro_personal_position.transaction);
        console.log(result)

    } catch (err) {
        console.log(err);
    }
}

module.exports = {
    getPersonalStats
}