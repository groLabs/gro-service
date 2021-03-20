'use strict';

const { ethers } = require('ethers');
const { getNonceManager } = require('../../common/web3tool');
const logger = require('../../common/logger');
const pnlABI = require('../../abis/IPnL.json').abi;
const nonceManager = getNonceManager();

const pnlTrigger = async function (pnlAddress) {
    const pnl = new ethers.Contract(pnlAddress, pnlABI, nonceManager);
    const triggerResult = await pnl.pnlTrigger().catch((error) => {
        logger.error(error);
        return false;
    });
    return triggerResult;
};

const execPnl = async function (pnlAddress) {
    const pnl = new ethers.Contract(pnlAddress, pnlABI, nonceManager);
    const pnlResult = await pnl.execPnL(0).catch((error) => {
        logger.error(error);
        return {};
    });
    return pnlResult;
};
module.exports = {
    pnlTrigger,
    execPnl,
};
