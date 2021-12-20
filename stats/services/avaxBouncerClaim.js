const fs = require('fs');
const { BigNumber } = require('ethers');
const { toChecksumAddress } = require('web3-utils');
const { ContractNames } = require('../../dist/registry/registry');
const {
    getLatestContractsAddress,
} = require('../../dist/registry/registryLoader');
const { getLatestSystemContractOnAVAX } = require('../common/contractStorage');
const { formatNumber2 } = require('../../common/digitalUtil');
const { getConfig } = require('../../dist/common/configUtil');

const logger = require('../statsLogger');

const groGateConfig = getConfig('gro_gate');

const DEFAULT_GRO_STABLE = {
    claimable_allowance: '0',
    remaining_allowance: '0',
    claimable: 'false',
};

const currentLiveVaults = {
    DAILiveVault: ContractNames.AVAXDAIVault_v1_5,
    USDCLiveVault: ContractNames.AVAXUSDCVault_v1_5,
    USDTLiveVault: ContractNames.AVAXUSDTVault_v1_5,
};

const vaultsVersion = {
    dai: '_v1_5',
    usdc: '_v1_5',
    usdt: '_v1_5',
};

const groGateFileFolder = groGateConfig.folder;
const groGateFiles = groGateConfig.files || [];

function readGroGateFile(fileName) {
    const rawdata = fs.readFileSync(fileName);
    const result = JSON.parse(rawdata);
    return result;
}

function fulledClaimableAndAllowance(
    type,
    orignal,
    claimedAmount,
    claimableAmount = 0,
    claimed,
    baseAllowance,
    remainAmount
) {
    let allowance = baseAllowance;
    if (claimed) {
        allowance = remainAmount;
    }
    orignal[type].remaining_allowance = allowance;
    if (BigNumber.from(claimableAmount).gt(claimedAmount)) {
        orignal[type].claimable = true;
    } else {
        orignal[type].claimable = false;
    }
    return allowance;
}

async function getBuncerClaimedAmount(account, provider) {
    const latestBouncer = getLatestSystemContractOnAVAX(
        ContractNames.AVAXBouncer,
        provider
    ).contract;

    const latestContractsInfo = getLatestContractsAddress();
    const amountPromise = [];
    amountPromise.push(
        latestBouncer.getClaimed(
            latestContractsInfo[currentLiveVaults.DAILiveVault].address,
            account
        )
    );
    amountPromise.push(
        latestBouncer.getClaimed(
            latestContractsInfo[currentLiveVaults.USDCLiveVault].address,
            account
        )
    );
    amountPromise.push(
        latestBouncer.getClaimed(
            latestContractsInfo[currentLiveVaults.USDTLiveVault].address,
            account
        )
    );
    const claimedAmounts = await Promise.all(amountPromise);
    return claimedAmounts;
}

async function getCurrentRoot(provider) {
    const latestBouncer = getLatestSystemContractOnAVAX(
        ContractNames.AVAXBouncer,
        provider
    ).contract;

    const root = await latestBouncer.root();
    return root;
}

async function getVaultBaseAllowance(vaultType, decimals, provider) {
    const latestVault = getLatestSystemContractOnAVAX(
        vaultType,
        provider
    ).contract;

    const baseAllowance = await latestVault.BASE_ALLOWANCE();
    return formatNumber2(baseAllowance, decimals, 0);
}

async function getVaultUserAllowance(account, vaultType, decimals, provider) {
    const latestVault = getLatestSystemContractOnAVAX(
        vaultType,
        provider
    ).contract;

    const userAllowance = await latestVault.userAllowance(account);
    return formatNumber2(userAllowance, decimals, 0);
}

async function getVaultUserClaimed(account, vaultType, provider) {
    const latestVault = getLatestSystemContractOnAVAX(
        vaultType,
        provider
    ).contract;

    const userClaimed = await latestVault.claimed(account);
    return userClaimed;
}

async function prepareData(account, provider) {
    const vaultBaseAllowancePromise = [
        getVaultBaseAllowance(currentLiveVaults.DAILiveVault, 18, provider),
        getVaultBaseAllowance(currentLiveVaults.USDCLiveVault, 6, provider),
        getVaultBaseAllowance(currentLiveVaults.USDTLiveVault, 6, provider),
    ];
    const [
        daiVaultBaseAllowance,
        usdcVaultBaseAllowance,
        usdtVaultBaseAllowance,
    ] = await Promise.all(vaultBaseAllowancePromise);

    const vaultUserAllowancePromise = [
        getVaultUserAllowance(
            account,
            currentLiveVaults.DAILiveVault,
            18,
            provider
        ),
        getVaultUserAllowance(
            account,
            currentLiveVaults.USDCLiveVault,
            6,
            provider
        ),
        getVaultUserAllowance(
            account,
            currentLiveVaults.USDTLiveVault,
            6,
            provider
        ),
    ];
    const [
        daiVaultUserAllowance,
        usdcVaultUserAllowance,
        usdtVaultUserAllowance,
    ] = await Promise.all(vaultUserAllowancePromise);

    const vaultUserClaimedPromise = [
        getVaultUserClaimed(account, currentLiveVaults.DAILiveVault, provider),
        getVaultUserClaimed(account, currentLiveVaults.USDCLiveVault, provider),
        getVaultUserClaimed(account, currentLiveVaults.USDTLiveVault, provider),
    ];
    const [daiVaultUserClaimed, usdcVaultUserClaimed, usdtVaultUserClaimed] =
        await Promise.all(vaultUserClaimedPromise);

    return {
        baseAllowance: [
            daiVaultBaseAllowance,
            usdcVaultBaseAllowance,
            usdtVaultBaseAllowance,
        ],
        userAllowance: [
            daiVaultUserAllowance,
            usdcVaultUserAllowance,
            usdtVaultUserAllowance,
        ],
        userClaimed: [
            daiVaultUserClaimed,
            usdcVaultUserClaimed,
            usdtVaultUserClaimed,
        ],
    };
}

function fullupRemainingAllowance(
    dataSource,
    baseAllowance,
    userAllowance,
    userClaimed
) {
    const [daiVaultUserClaimed, usdcVaultUserClaimed, usdtVaultUserClaimed] =
        userClaimed;
    const [
        daiVaultUserAllowance,
        usdcVaultUserAllowance,
        usdtVaultUserAllowance,
    ] = userAllowance;
    const [
        daiVaultBaseAllowance,
        usdcVaultBaseAllowance,
        usdtVaultBaseAllowance,
    ] = baseAllowance;

    let daiAllowance = daiVaultBaseAllowance;
    if (daiVaultUserClaimed) {
        daiAllowance = daiVaultUserAllowance;
    }
    dataSource[`groDAI.e_vault${vaultsVersion.dai}`].remaining_allowance =
        daiAllowance;

    let usdcAllowance = usdcVaultBaseAllowance;
    if (usdcVaultUserClaimed) {
        usdcAllowance = usdcVaultUserAllowance;
    }
    dataSource[`groUSDC.e_vault${vaultsVersion.usdc}`].remaining_allowance =
        usdcAllowance;

    let usdtAllowance = usdtVaultBaseAllowance;
    if (usdtVaultUserClaimed) {
        usdtAllowance = usdtVaultUserAllowance;
    }
    dataSource[`groUSDT.e_vault${vaultsVersion.usdt}`].remaining_allowance =
        usdtAllowance;
    const totalRemainingAllowance = BigNumber.from(daiAllowance)
        .add(BigNumber.from(usdcAllowance))
        .add(BigNumber.from(usdtAllowance));
    dataSource.total_remaining_allowance = `${totalRemainingAllowance}`;
}

async function getAccountAllowance(account, provider) {
    account = toChecksumAddress(account);
    const result = {
        total_claimable_allowance: '0',
        total_remaining_allowance: '0',
        snapshot_ts: '0',
        gro_balance_at_snapshot: '0',
        gro_gate_at_snapshot: '0',
        proofs: [],
        root: '',
        root_matched: false,
    };
    result[`groDAI.e_vault${vaultsVersion.dai}`] = { ...DEFAULT_GRO_STABLE };
    result[`groUSDC.e_vault${vaultsVersion.usdc}`] = { ...DEFAULT_GRO_STABLE };
    result[`groUSDT.e_vault${vaultsVersion.usdt}`] = { ...DEFAULT_GRO_STABLE };

    try {
        const { baseAllowance, userAllowance, userClaimed } = await prepareData(
            account,
            provider
        );
        [
            result[`groDAI.e_vault${vaultsVersion.dai}`].base_allowance,
            result[`groUSDC.e_vault${vaultsVersion.dai}`].base_allowance,
            result[`groUSDT.e_vault${vaultsVersion.dai}`].base_allowance,
        ] = baseAllowance;
        result[
            `groDAI.e_vault${vaultsVersion.dai}`
        ].base_allowance_claimed = `${userClaimed[0]}`;
        result[
            `groUSDC.e_vault${vaultsVersion.dai}`
        ].base_allowance_claimed = `${userClaimed[1]}`;
        result[
            `groUSDT.e_vault${vaultsVersion.dai}`
        ].base_allowance_claimed = `${userClaimed[2]}`;

        const latestAllowanceFileIndex = groGateFiles.length;
        if (latestAllowanceFileIndex < 1) {
            // Haven't proof file
            fullupRemainingAllowance(
                result,
                baseAllowance,
                userAllowance,
                userClaimed
            );
        } else {
            const filePath = `${groGateFileFolder}/${
                groGateFiles[latestAllowanceFileIndex - 1]
            }`;

            const groGateContent = readGroGateFile(filePath);
            const {
                snapshot_ts: snapshotTS,
                gro_gate_at_snapshot: groGateBalance,
                root,
                proofs,
            } = groGateContent;
            result.root = root;
            result.snapshot_ts = snapshotTS;
            result.gro_gate_at_snapshot = groGateBalance;

            const accountProofInfo = proofs[account];
            if (accountProofInfo) {
                const { amount, proof, groBalance } = accountProofInfo;
                if (groBalance) {
                    result.gro_balance_at_snapshot = groBalance;
                }
                if (proof) {
                    result.proofs = proof;
                }
                if (amount) {
                    result[
                        `groDAI.e_vault${vaultsVersion.dai}`
                    ].claimable_allowance = amount;
                    result[
                        `groUSDC.e_vault${vaultsVersion.usdc}`
                    ].claimable_allowance = amount;
                    result[
                        `groUSDT.e_vault${vaultsVersion.usdt}`
                    ].claimable_allowance = amount;
                }

                const claimedAmounts = await getBuncerClaimedAmount(
                    account,
                    provider
                );
                const daiAllowance = fulledClaimableAndAllowance(
                    `groDAI.e_vault${vaultsVersion.dai}`,
                    result,
                    claimedAmounts[0],
                    amount,
                    userClaimed[0],
                    baseAllowance[0],
                    userAllowance[0]
                );
                const usdcAllowance = fulledClaimableAndAllowance(
                    `groUSDC.e_vault${vaultsVersion.usdc}`,
                    result,
                    claimedAmounts[1],
                    amount,
                    userClaimed[1],
                    baseAllowance[1],
                    userAllowance[1]
                );
                const usdtAllowance = fulledClaimableAndAllowance(
                    `groUSDT.e_vault${vaultsVersion.usdt}`,
                    result,
                    claimedAmounts[2],
                    amount,
                    userClaimed[2],
                    baseAllowance[2],
                    userAllowance[2]
                );
                const claimableTotal = BigNumber.from(amount).mul(
                    BigNumber.from(3)
                );
                const remainTotal = BigNumber.from(daiAllowance)
                    .add(BigNumber.from(usdcAllowance))
                    .add(BigNumber.from(usdtAllowance));
                result.total_claimable_allowance = claimableTotal.toString();
                result.total_remaining_allowance = remainTotal.toString();

                const bouncerRoot = await getCurrentRoot(provider);
                if (root === bouncerRoot) {
                    result.root_matched = true;
                }
            } else {
                // have proof file, but not include the account
                fullupRemainingAllowance(
                    result,
                    baseAllowance,
                    userAllowance,
                    userClaimed
                );
            }
        }
    } catch (error) {
        logger.error(`Get gro gate for ${account} failed.`);
        logger.error(error);
    }
    return result;
}

module.exports = {
    getAccountAllowance,
};
