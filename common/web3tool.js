'use strict';

const Web3 = require('web3');
const { SettingError } = require('./customErrors');
const CHAIN_URL = process.env.CHAIN_URL
let web3Instance = undefined;

const getWeb3Instance = function () {
	if(web3Instance) {
		return web3Instance
	}
	if(!CHAIN_URL) {
		throw new SettingError('Not fund CHAIN_URL')
	}

	const provider = new Web3.providers.WebsocketProvider(CHAIN_URL)
	web3Instance = new Web3(provider)
	return web3Instance
}

module.exports = {
    getWeb3Instance,
}