import csvtojson from 'csvtojson';
import BN from 'bignumber.js';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { getConfig } from '../../common/configUtil';
import { formatNumber2 } from '../../common/digitalUtil';
import { getAlchemyRpcProvider } from '../../common/chainUtil';
import {
    getAirdropClaimEvents,
    getAirdropClaimed,
} from '../handler/airdropClaimHandler';
import { toChecksumAddress } from 'web3-utils';

const logger = require('../statsLogger');

const airdropConfig = getConfig('airdrop');
const merkleAirdropConfig = getConfig('merkle_airdrop');

const gasFundAirdropFile = airdropConfig.gas_pwrd;
const gasRefundFilePath = `${airdropConfig.folder}/${gasFundAirdropFile}`;

const DECIMAL = new BN('1000000000000000000');
const airdropCache = new Map();
const providerKey = 'stats_personal';
const provider = getAlchemyRpcProvider(providerKey);

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

const vestingAirdropDefaultValue = {
    name: 'N/A',
    token: 'N/A',
    amount: '0.00',
    claim_initialized: 'N/A',
    claimed_amount: '0.00',
    claimable_amount: '0.00',
    proofs: [],
};

function expired(currentTimestamp, airdropExpiryTS) {
    if (!airdropExpiryTS) return 'false';
    if (parseInt(airdropExpiryTS, 10) > currentTimestamp) {
        return 'false';
    }
    return 'true';
}

async function readAirdropFile(fileName) {
    const rawdata = fs.readFileSync(fileName);
    const result = JSON.parse(rawdata as unknown as string);
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
        result.amount = `${new BN(accountAirdrop.amount).toFormat(2)}`;
        result.amount_to_claim = new BN(accountAirdrop.amount)
            .multipliedBy(DECIMAL)
            .toString();
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
    result.expiry_ts = expiryTimestamp;
    const isExpired = expired(currentTimestamp, result.expiry_ts);
    result.expired = isExpired;
    if (accountAirdrop) {
        result.claimable = 'true';
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
    if (isExpired === 'true') {
        result.claimable = 'false';
        result.proofs = [];
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

async function getVestingAirdropInitialized(address) {
    if (!merkleAirdropConfig.address) return 'N/A';
    const abi = [
        {
            inputs: [
                {
                    internalType: 'address',
                    name: '',
                    type: 'address',
                },
            ],
            name: 'claimStarted',
            outputs: [
                {
                    internalType: 'bool',
                    name: '',
                    type: 'bool',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
    ];
    const GMerkleVestor = new ethers.Contract(
        merkleAirdropConfig.address,
        abi,
        provider
    );
    const result = await GMerkleVestor.claimStarted(address);
    return result;
}

async function getVestingAirdropClaimedAmount(address) {
    if (!merkleAirdropConfig.address) return '0.00';
    const abi = [
        {
            inputs: [
                {
                    internalType: 'address',
                    name: '',
                    type: 'address',
                },
            ],
            name: 'usersInfo',
            outputs: [
                {
                    internalType: 'uint256',
                    name: 'totalClaim',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'claimedAmount',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
    ];
    const GMerkleVestor = new ethers.Contract(
        merkleAirdropConfig.address,
        abi,
        provider
    );
    const userInfo = await GMerkleVestor.usersInfo(address);
    return formatNumber2(userInfo[1], 18, 2);
}

async function getVestingAirdropClaimableAmount(address, proofs, amount) {
    if (!merkleAirdropConfig.address) return '0.00';
    const abi = [
        {
            inputs: [
                {
                    internalType: 'bytes32[]',
                    name: 'proof',
                    type: 'bytes32[]',
                },
                {
                    internalType: 'uint256',
                    name: '_totalClaim',
                    type: 'uint256',
                },
                {
                    internalType: 'address',
                    name: '_user',
                    type: 'address',
                },
            ],
            name: 'getVestedAmount',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
    ];
    const GMerkleVestor = new ethers.Contract(
        merkleAirdropConfig.address,
        abi,
        provider
    );
    const claimabeAmount = await GMerkleVestor.getVestedAmount(
        proofs,
        amount,
        address
    );
    return formatNumber2(claimabeAmount, 18, 2);
}

async function getVestingAirdrop(address) {
    const account = toChecksumAddress(address);
    const filePath = `${merkleAirdropConfig.folder}/${merkleAirdropConfig.file}`;
    if (!airdropCache[filePath]) {
        const content = await readAirdropFile(filePath);
        const { root, total, airdrops } = content;
        const proofResult = {};
        for (let i = 0; i < airdrops.length; i += 1) {
            const { address, amount, proofs } = airdrops[i];
            const accountKey = toChecksumAddress(address);
            proofResult[accountKey] = { address, amount, proofs };
        }
        airdropCache[filePath] = { root, total, proofs: proofResult };
    }

    const { proofs } = airdropCache[filePath];
    if (!proofs[account]) return vestingAirdropDefaultValue;
    const { amount, proofs: proof } = proofs[account];
    const initialized = await getVestingAirdropInitialized(account);
    const claimedAmount = await getVestingAirdropClaimedAmount(account);
    const claimableAmount = await getVestingAirdropClaimableAmount(
        account,
        proof,
        amount
    );
    const result = {
        name: 'UST-vesting-airdrop',
        token: 'PWRD',
        amount,
        proofs: proof,
        claim_initialized: initialized,
        claimed_amount: claimedAmount,
        claimable_amount: claimableAmount,
    };
    return result;
}

export { updateOGAirdropFile, getAllAirdropResults, getVestingAirdrop };
