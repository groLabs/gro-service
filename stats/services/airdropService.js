const csvtojson = require('csvtojson');
const BN = require('bignumber.js');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const logger = require('../statsLogger');
const { getConfig } = require('../../common/configUtil');
const {
    getAirdropClaimEvents,
    getAirdropClaimed,
} = require('../handler/airdropClaimHandler');

const airdropConfig = getConfig('airdrop');

const gasFundAirdropFile = airdropConfig.gas_pwrd;
const gasRefundFilePath = `${airdropConfig.folder}/${gasFundAirdropFile}`;

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
    launch_ts: '1629383452',
    claimed: 'false',
    claimable: 'false',
    expiry_ts: undefined,
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
    launch_ts: 'N/A',
    claimed: 'false',
    claimable: 'false',
    expiry_ts: undefined,
    expired: 'false',
    proofs: [],
    hash: [],
};

function expired(currentTimestamp, airdropExpiryTS) {
    if (!airdropExpiryTS) return false;
    if (parseInt(airdropExpiryTS, 10) > currentTimestamp) {
        return false;
    }
    return true;
}

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

async function getGasRefundResult(account, currentTimestamp) {
    if (!firstAirdropJson) {
        firstAirdropJson = await convertCSVtoJson(gasRefundFilePath);
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
    }

    result.expired = expired(currentTimestamp, result.expiry_ts);
    return result;
}

async function getAirdropResultWithProof(
    account,
    endBlock,
    currentTimestamp,
    airdropFilePath
) {
    if (!airdropCache[airdropFilePath]) {
        airdropCache[airdropFilePath] = await readAirdropFile(airdropFilePath);
    }

    account = ethers.utils.getAddress(account);
    const {
        merkleIndex,
        name,
        display_name: displayName,
        token,
        timestamp,
        claimable,
        proofs,
        expiry_ts: expiryTimestamp,
    } = airdropCache[airdropFilePath];
    const accountAirdrop = proofs[account];
    const result = { ...airdropDefaultValue };
    result.name = name;
    result.display_name = displayName;
    result.token = token;
    result.launch_ts = timestamp;
    result.merkle_root_index = merkleIndex.toString();
    result.claimable = claimable;
    result.expiry_ts = expiryTimestamp;
    result.expired = expired(currentTimestamp, result.expiry_ts);
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
                result.claimable = 'false';
            } else {
                result.proofs = proof;
            }
            result.participated = 'true';
            result.amount_to_claim = amount;
            result.amount = amountBn.dividedBy(DECIMAL).toFixed(2);
            result.claimed = claimed.toString();
        }
    }
    return result;
}

async function updateOGAirdropFile() {
    logger.info('');
}

async function getAllAirdropResults(address, endBlock) {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const airdropGasPwrd = await getGasRefundResult(address, currentTimestamp);
    const airdrops = [airdropGasPwrd];
    for (let i = 0; i < airdropConfig.files.length; i += 1) {
        const filePath = `${airdropConfig.folder}/${airdropConfig.files[i]}`;
        if (fs.existsSync(filePath)) {
            // eslint-disable-next-line no-await-in-loop
            const airdropWithProof = await getAirdropResultWithProof(
                address,
                endBlock,
                currentTimestamp,
                filePath
            );
            airdrops.push(airdropWithProof);
        } else {
            logger.error(`airdrop file does not exist ${filePath}`);
        }
    }
    return airdrops;
}

module.exports = {
    updateOGAirdropFile,
    getAllAirdropResults,
};
