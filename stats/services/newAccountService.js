const BN = require('bignumber.js');
const { avaxPersonalStats } = require('./avaxAccountService');
const { ethereumPersonalStats } = require('./ethereumAccountService');
const { getConfig } = require('../../dist/common/configUtil');
const logger = require('../statsLogger');

const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;

function getTotalValue(source, type) {
    let total = '0';
    if (source[type] && source[type].total) {
        total = source[type].total;
    }
    return total;
}

function calculateTotal(ethereumStats, avaxStats) {
    const chain1Name = 'ethereum';
    const chain2Name = 'avalanche';

    const amountAdded = {};
    amountAdded[chain1Name] = getTotalValue(ethereumStats, 'amount_added');
    amountAdded[chain2Name] = getTotalValue(avaxStats, 'amount_added');
    const amountAddedTotal = BN(amountAdded[chain1Name]).plus(
        BN(amountAdded[chain2Name])
    );
    amountAdded.total = amountAddedTotal.toFixed(amountDecimal);

    const amountRemoved = {};
    amountRemoved[chain1Name] = getTotalValue(ethereumStats, 'amount_removed');
    amountRemoved[chain2Name] = getTotalValue(avaxStats, 'amount_removed');
    const amountRemovedTotal = BN(amountRemoved[chain1Name]).plus(
        BN(amountRemoved[chain2Name])
    );
    amountRemoved.total = amountRemovedTotal.toFixed(amountDecimal);

    const netAmountAdded = {};
    netAmountAdded[chain1Name] = getTotalValue(
        ethereumStats,
        'net_amount_added'
    );
    netAmountAdded[chain2Name] = getTotalValue(avaxStats, 'net_amount_added');
    const netAmountAddedTotal = BN(netAmountAdded[chain1Name]).plus(
        BN(netAmountAdded[chain2Name])
    );
    netAmountAdded.total = netAmountAddedTotal.toFixed(amountDecimal);

    const currentBalance = {};
    currentBalance[chain1Name] = getTotalValue(
        ethereumStats,
        'current_balance'
    );
    currentBalance[chain2Name] = getTotalValue(avaxStats, 'current_balance');
    const currentBalanceTotal = BN(currentBalance[chain1Name]).plus(
        BN(currentBalance[chain2Name])
    );
    currentBalance.total = currentBalanceTotal.toFixed(amountDecimal);

    const netReturns = {};
    netReturns[chain1Name] = getTotalValue(ethereumStats, 'net_returns');
    netReturns[chain2Name] = getTotalValue(avaxStats, 'net_returns');
    const netReturnsTotal = BN(netReturns[chain1Name]).plus(
        BN(netReturns[chain2Name])
    );
    netReturns.total = netReturnsTotal.toFixed(amountDecimal);

    return {
        amount_added: amountAdded,
        amount_removed: amountRemoved,
        net_amount_added: netAmountAdded,
        current_balance: currentBalance,
        net_returns: netReturns,
    };
}

async function generateReport(account) {
    account = account.toLowerCase();
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const result = {
        gro_personal_position_mc: {
            status: 'error',
            current_timestamp: currentTimestamp,
            address: account,
            network: process.env.NODE_ENV,
            mc_totals: {},
            ethereum: {},
            avalanche: {},
        },
    };
    try {
        const [statsOnEthereum, statsOnAvax] = await Promise.all([
            ethereumPersonalStats(account),
            avaxPersonalStats(account),
        ]);

        const statsOnTotal = calculateTotal(statsOnEthereum, statsOnAvax);

        result.gro_personal_position_mc.mc_totals = statsOnTotal;
        result.gro_personal_position_mc.ethereum = statsOnEthereum;
        result.gro_personal_position_mc.avalanche = statsOnAvax;
        if (statsOnEthereum.status === 'ok' && statsOnAvax.status === 'ok') {
            result.gro_personal_position_mc.status = 'ok';
        }
    } catch (error) {
        logger.error(`Get personal stats for ${account}.`);
        logger.error(error);
    }
    return result;
}

module.exports = {
    generateReport,
};
