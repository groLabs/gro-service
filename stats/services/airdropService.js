const csvtojson = require('csvtojson');
const BN = require('bignumber.js');
const { getConfig } = require('../../common/configUtil');

const csvFolder = getConfig('airdrop_csv_folder');

const csv1FilePath = `${csvFolder}/airdrop1_result.csv`;
const csv2FilePath = `${csvFolder}/airdrop2_result.csv`;

let firstAirdropJson;
let secondAirdropJson;

const airdropFirstDefaultValue = {
    name: 'gas_pwrd',
    display_name: 'Gas PWRD',
    token: 'pwrd',
    participated: 'false',
    amount: '0.00',
    timestamp: '1629383452',
    claimed: 'false',
    hash: [],
};

const airdropSecondDefaultValue = {
    name: 'early_frens',
    display_name: 'Early Frens',
    token: 'gro',
    participated: 'false',
    amount: '0.00',
    timestamp: '1629972000',
    claimed: 'false',
    hash: [],
};

async function convertCSVtoJson(filePath) {
    const result = {};
    const arrayResult = await csvtojson().fromFile(filePath);
    for (let i = 0; i < arrayResult.length; i += 1) {
        const item = arrayResult[i];
        result[item.address.toLowerCase()] = arrayResult[i];
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
    if (!secondAirdropJson) {
        secondAirdropJson = await convertCSVtoJson(csv2FilePath);
    }
    account = account.toLowerCase();
    const accountAirdrop = secondAirdropJson[account];
    let result = airdropSecondDefaultValue;
    if (accountAirdrop) {
        const amount = `${BN(accountAirdrop.amount).toFormat(2)}`;
        result = { ...airdropSecondDefaultValue };
        if (amount !== '0.00') {
            result.amount = amount;
            result.participated = 'true';
        }
    }
    return result;
}

module.exports = {
    getFirstAirdropResult,
    getSecondAirdropResult,
};
