"use strict";
const { ethers } = require('ethers');
const { getFilterEvents } = require('../../common/logFilter-new');
const { getConfig } = require('../../common/configUtil');
const { appendEventTimestamp, } = require('../services/generatePersonTransaction');
const { getAlchemyRpcProvider } = require('../../common/chainUtil');
const AirdropABI = require('../../abi/Airdrop.json');
const providerKey = 'stats_personal';
const airdropConfig = getConfig('airdrop');
const provider = getAlchemyRpcProvider(providerKey);
const airdrop = new ethers.Contract(airdropConfig.address, AirdropABI, provider);
async function getAirdropClaimEvents(account, startBlock = airdropConfig.start_block, endBlock) {
    const filter = airdrop.filters.LogClaim(account);
    filter.fromBlock = startBlock;
    filter.toBlock = endBlock;
    const logs = await getFilterEvents(filter, airdrop.interface, providerKey);
    await appendEventTimestamp(logs, provider);
    const transactions = {};
    logs.forEach((item) => {
        transactions[`${item.args[1]}`] = [item.transactionHash];
        console.log(transactions[`${item.args[1]}`]);
    });
    return transactions;
}
async function getAirdropClaimed(merkleId, account) {
    const claimed = await airdrop.isClaimed(merkleId, account);
    return claimed;
}
module.exports = {
    getAirdropClaimEvents,
    getAirdropClaimed,
};
