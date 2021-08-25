const csvtojson = require('csvtojson');
const BN = require('bignumber.js');
const { getConfig } = require('../../common/configUtil');

const csvFolder = getConfig('airdrop_csv_folder');

const csv1FilePath = `${csvFolder}/airdrop1_result.csv`;
let firstAirdropJson;

const airdropFirstDefaultValue = {
    name: 'gas_pwrd',
    display_name: 'Gas PWRD',
    token: 'pwrd',
    participated: 'false',
    amount: '0.00',
    timestamp: '',
    claimed: 'false',
    hash: [],
};

const airdropSecondDefaultValue = {
    name: 'early_frens',
    display_name: 'Early Frens',
    token: 'gro',
    participated: 'false',
    amount: '0.00',
    timestamp: '',
    claimed: 'false',
    hash: [],
};

async function convertCSVtoJson(filePath) {
    const result = {};
    const arrayResult = await csvtojson().fromFile(filePath);
    for (let i = 0; i < arrayResult.length; i += 1) {
        const item = arrayResult[i];
        result[item.address] = arrayResult[i];
    }
    return result;
}

async function getFirstAirdropResult(account) {
    if (!firstAirdropJson) {
        firstAirdropJson = await convertCSVtoJson(csv1FilePath);
    }
    account = account.toLowerCase();
    const accountAirdrop = firstAirdropJson[account];
    let result = airdropFirstDefaultValue;
    if (accountAirdrop) {
        result = { ...airdropFirstDefaultValue };
        result.amount = `${BN(accountAirdrop.amount).toFormat(2)}`;
        result.participated = 'true';
        result.claimed = 'true';
    }
    return result;
}

async function getSecondAirdropResult(account) {
    return airdropSecondDefaultValue;
}

module.exports = {
    getFirstAirdropResult,
    getSecondAirdropResult,
};
