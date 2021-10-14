const csvtojson = require('csvtojson');
const BN = require('bignumber.js');
const fs = require('fs');
const { ethers } = require('ethers');
const { getConfig } = require('../../common/configUtil');
const {
    getAirdropClaimEvents,
    getAirdropClaimed,
} = require('../handler/airdropClaimHandler');

const csvFolder = getConfig('airdrop_csv_folder');
const airdropConfig = getConfig('airdrop');

const csv1FilePath = `${csvFolder}/airdrop1_result.csv`;
const airdrop2FilePath = `${csvFolder}/airdrop-1-proofs.json`;
const airdrop3FilePath = `${csvFolder}/airdrop-0-proofs.json`;

const DECIMAL = new BN('1000000000000000000');
const airdropCache = new Map();

let firstAirdropJson;

const airdropFirstDefaultValue = {
    name: 'gas_pwrd',
    display_name: 'Gas PWRD',
    token: 'pwrd',
    participated: 'false',
    amount: '0.00',
    amount_to_claim: '0',
    merkle_root_index: 'N/A',
    timestamp: '1629383452',
    claimed: 'false',
    claimable: 'false',
    expired: 'false',
    proofs: [],
    hash: [],
};

const airdropDefaultValue = {
    name: 'N/A',
    display_name: 'N/A',
    token: 'N/A',
    participated: 'false',
    amount: '0.00',
    amount_to_claim: '0',
    merkle_root_index: 'N/A',
    timestamp: 'N/A',
    claimed: 'false',
    claimable: 'false',
    expired: 'false',
    proofs: [],
    hash: [],
};

async function readAirdropFile(fileName) {
    const rawdata = fs.readFileSync(fileName);
    const result = JSON.parse(rawdata);
    return result;
}

async function convertCSVtoJson(filePath) {
    const result = {};
    const arrayResult = await csvtojson().fromFile(filePath);
    for (let i = 0; i < arrayResult.length; i += 1) {
        const item = arrayResult[i];
        result[item.address.toLowerCase()] = arrayResult[i];
    }
    return result;
}

async function getGasRefundResult(account) {
    if (!firstAirdropJson) {
        firstAirdropJson = await convertCSVtoJson(csv1FilePath);
    }
    account = account.toLowerCase();
    const accountAirdrop = firstAirdropJson[account];
    let result = airdropFirstDefaultValue;
    if (accountAirdrop) {
        result = { ...airdropFirstDefaultValue };
        result.amount = `${BN(accountAirdrop.amount).toFormat(2)}`;
        result.amount_to_claim = new BN(accountAirdrop.amount).multipliedBy(
            DECIMAL
        );
        result.participated = 'true';
        result.claimed = 'true';
        result.claimable = 'true';
    }
    return result;
}

async function getAirdropResultWithProof(account, endBlock, airdropFilePath) {
    if (!airdropCache[airdropFilePath]) {
        airdropCache[airdropFilePath] = await readAirdropFile(airdropFilePath);
    }
    account = ethers.utils.getAddress(account);
    const {
        merkleIndex,
        name,
        display_name,
        token,
        timestamp,
        claimable,
        proofs,
    } = airdropCache[airdropFilePath];
    const accountAirdrop = proofs[account];
    const result = { ...airdropDefaultValue };
    result.name = name;
    result.display_name = display_name;
    result.token = token;
    result.timestamp = timestamp;
    result.merkle_root_index = merkleIndex.toString();
    if (accountAirdrop) {
        // result = { ...airdropDefaultValue };
        const { amount, proof } = accountAirdrop;
        const amountBn = new BN(amount);
        if (!amountBn.isZero()) {
            const claimed = await getAirdropClaimed(merkleIndex, account);
            if (claimed) {
                const txList = await getAirdropClaimEvents(
                    account,
                    airdropConfig.start_block,
                    endBlock
                );
                result.hash = txList[merkleIndex];
            } else {
                result.proofs = proof;
            }
            result.participated = 'true';
            result.amount_to_claim = amount;
            result.amount = amountBn.dividedBy(DECIMAL).toFixed(2);
            result.claimable = claimable;
            result.claimed = claimed.toString();
        }
    }
    return result;
}

async function updateOGAirdropFile() {
    console.log('');
}

async function getAllAirdropResults(address, endBlock) {
    const airdrop1 = await getGasRefundResult(address);
    const airdrop2 = await getAirdropResultWithProof(
        address,
        endBlock,
        airdrop2FilePath
    );
    const airdrop3 = await getAirdropResultWithProof(
        address,
        endBlock,
        airdrop3FilePath
    );
    return [airdrop1, airdrop2, airdrop3];
}

module.exports = {
    updateOGAirdropFile,
    getAllAirdropResults,
};
