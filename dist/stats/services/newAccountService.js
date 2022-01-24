const BN = require('bignumber.js');
const { avaxPersonalStats } = require('./avaxAccountService');
const { ethereumPersonalStats, getNetwork, } = require('./ethereumAccountService');
const { getConfig } = require('../../dist/common/configUtil');
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
function calculateTotal(ethereumStats, avaxStats) {
    const chain1Name = 'ethereum';
    const chain2Name = 'avalanche';
    const amountAdded = {};
    amountAdded[chain1Name] = ethereumStats.amount_added.total;
    amountAdded[chain2Name] = avaxStats.amount_added.total;
    const amountAddedTotal = BN(amountAdded[chain1Name]).plus(BN(amountAdded[chain2Name]));
    amountAdded.total = amountAddedTotal.toFixed(amountDecimal);
    const amountRemoved = {};
    amountRemoved[chain1Name] = ethereumStats.amount_removed.total;
    amountRemoved[chain2Name] = avaxStats.amount_removed.total;
    const amountRemovedTotal = BN(amountRemoved[chain1Name]).plus(BN(amountRemoved[chain2Name]));
    amountRemoved.total = amountRemovedTotal.toFixed(amountDecimal);
    const netAmountAdded = {};
    netAmountAdded[chain1Name] = ethereumStats.net_amount_added.total;
    netAmountAdded[chain2Name] = avaxStats.net_amount_added.total;
    const netAmountAddedTotal = BN(netAmountAdded[chain1Name]).plus(BN(netAmountAdded[chain2Name]));
    netAmountAdded.total = netAmountAddedTotal.toFixed(amountDecimal);
    const currentBalance = {};
    currentBalance[chain1Name] = ethereumStats.current_balance.total;
    currentBalance[chain2Name] = avaxStats.current_balance.total;
    const currentBalanceTotal = BN(currentBalance[chain1Name]).plus(BN(currentBalance[chain2Name]));
    currentBalance.total = currentBalanceTotal.toFixed(amountDecimal);
    const netReturns = {};
    netReturns[chain1Name] = ethereumStats.net_returns.total;
    netReturns[chain2Name] = avaxStats.net_returns.total;
    const netReturnsTotal = BN(netReturns[chain1Name]).plus(BN(netReturns[chain2Name]));
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
    const [statsOnEthereum, statsOnAvax] = await Promise.all([
        ethereumPersonalStats(account),
        avaxPersonalStats(account),
    ]);
    const statsOnTotal = calculateTotal(statsOnEthereum, statsOnAvax);
    const network = await getNetwork();
    const distStatsOnEthereum = {
        launch_timestamp: statsOnEthereum.launch_timestamp,
        network_id: `${network.chainId}`,
        airdrops: statsOnEthereum.airdrops,
        transaction: statsOnEthereum.transaction,
        amount_added: statsOnEthereum.amount_added,
        amount_removed: statsOnEthereum.amount_removed,
        net_amount_added: statsOnEthereum.net_amount_added,
        current_balance: statsOnEthereum.current_balance,
        net_returns: statsOnEthereum.net_returns,
    };
    return {
        gro_personal_position_mc: {
            current_timestamp: currentTimestamp,
            address: account,
            network: process.env.NODE_ENV,
            mc_totals: statsOnTotal,
            ethereum: distStatsOnEthereum,
            avalanche: statsOnAvax,
        },
    };
}
module.exports = {
    generateReport,
};
