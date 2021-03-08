'use strict';

const { getWeb3Instance } = require('../common/web3tool')
const { SettingError } = require('../common/customErrors')
const IInsuranceABI = require('../abis/IInsurance.json').abi
const web3Instance = getWeb3Instance()

const BOT_ACCOUNT = process.env.BOT_ACCOUNT
const INSURANCE_ADDRESS = process.env.INSURANCE_ADDRESS
if(!BOT_ACCOUNT || !INSURANCE_ADDRESS){
	throw new SettingError('BOT_ACCOUNT not setting or INSURANCE_ADDRESS not setting')
}

const IInsurance = new web3Instance.eth.Contract(IInsuranceABI, INSURANCE_ADDRESS)

const callInvestTrigger = async function () {
	const result = await IInsurance.methods.investTrigger().call({from: BOT_ACCOUNT})
	return result;
}

const callRebalanceTrigger = async function () {
	const result = await IInsurance.methods.rebalanceTrigger().call({from: BOT_ACCOUNT})
	return {
		swapInAmounts: result.swapInAmounts,
		swapOutPercent: result.swapOutPercent,
		utilisationRatio: result.utilisationRatio,
		lgNeedRebalance: result.lgNeedRebalance
	};
}

module.exports = {
	callInvestTrigger,
	callRebalanceTrigger
}
