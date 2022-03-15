import fs from 'fs';
import { BigNumber } from 'ethers';
import { toChecksumAddress } from 'web3-utils';
import { ContractNames } from '../../registry/registry';
import { getLatestContractsAddress } from '../../registry/registryLoader';
import { getLatestSystemContractOnAVAX } from '../common/contractStorage';
import { formatNumber2 } from '../../common/digitalUtil';
import { getConfig } from '../../common/configUtil';

const logger = require('../statsLogger');

const groGateConfig = getConfig('gro_gate');

const DEFAULT_GRO_STABLE = {
    claimable_allowance: '0',
    remaining_allowance: '0',
    claimable: 'false',
    base_allowance: '0',
    base_allowance_claimed: 'false',
};

const currentLiveVaults = {
    DAILiveVault: ContractNames.AVAXDAIVault_v1_7,
    USDCLiveVault: ContractNames.AVAXUSDCVault_v1_7,
    USDTLiveVault: ContractNames.AVAXUSDTVault_v1_7,
};

const groGateFileFolder = groGateConfig.folder;
const groGateFiles = groGateConfig.files || [];

function readGroGateFile(fileName) {
    const rawdata = fs.readFileSync(fileName);
    const result = JSON.parse(rawdata as unknown as string);
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
    allowance = BigNumber.from(allowance);
    orignal[type].remaining_allowance = allowance.toString();
    if (BigNumber.from(claimableAmount).gt(claimedAmount)) {
        orignal[type].claimable = true;
    } else {
        orignal[type].claimable = false;
    }

    const distBaseAllowance = BigNumber.from(baseAllowance);
    orignal[type].base_allowance = distBaseAllowance.toString();
    orignal[type].base_allowance_claimed = claimed.toString();
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
    return userAllowance.div(BigNumber.from(10).pow(decimals));
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
function fullupSingleVault(
    dataSource,
    vaultType,
    baseAllowance,
    userAllowance,
    userClaimed
) {
    let allowance = baseAllowance;
    if (userClaimed) {
        allowance = userAllowance;
    }
    allowance = BigNumber.from(allowance);
    dataSource[`gro${vaultType}.e_vault`].remaining_allowance =
        allowance.toString();

    const distBaseAllowance = BigNumber.from(baseAllowance);
    dataSource[`gro${vaultType}.e_vault`].base_allowance =
        distBaseAllowance.toString();

    dataSource[`gro${vaultType}.e_vault`].base_allowance_claimed =
        userClaimed.toString();

    return allowance;
}
function fullupVaults(dataSource, baseAllowance, userAllowance, userClaimed) {
    const vaultTypes = ['DAI', 'USDC', 'USDT'];
    let remainingTotal = BigNumber.from(0);
    for (let i = 0; i < vaultTypes.length; i += 1) {
        const allowance = fullupSingleVault(
            dataSource,
            vaultTypes[i],
            baseAllowance[i],
            userAllowance[i],
            userClaimed[i]
        );
        remainingTotal = remainingTotal.add(allowance);
    }
    dataSource.total_remaining_allowance = `${remainingTotal}`;
}

async function getAccountAllowance(account, provider) {
    account = toChecksumAddress(account);
    const result = {
        status: 'error',
        total_claimable_allowance: '0',
        total_remaining_allowance: '0',
        snapshot_ts: '0',
        gro_balance_at_snapshot: '0',
        gro_gate_at_snapshot: '0',
        proofs: [],
        root: '',
        root_matched: false,
    };
    // to do
    result['groDAI.e_vault'] = { ...DEFAULT_GRO_STABLE };
    result['groUSDC.e_vault'] = { ...DEFAULT_GRO_STABLE };
    result['groUSDT.e_vault'] = { ...DEFAULT_GRO_STABLE };

    try {
        const { baseAllowance, userAllowance, userClaimed } = await prepareData(
            account,
            provider
        );

        const latestAllowanceFileIndex = groGateFiles.length;
        if (latestAllowanceFileIndex < 1) {
            // Haven't proof file
            fullupVaults(result, baseAllowance, userAllowance, userClaimed);
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
                    result['groDAI.e_vault'].claimable_allowance = amount;
                    result['groUSDC.e_vault'].claimable_allowance = amount;
                    result['groUSDT.e_vault'].claimable_allowance = amount;
                }

                const claimedAmounts = await getBuncerClaimedAmount(
                    account,
                    provider
                );
                const daiAllowance = fulledClaimableAndAllowance(
                    'groDAI.e_vault',
                    result,
                    claimedAmounts[0],
                    amount,
                    userClaimed[0],
                    baseAllowance[0],
                    userAllowance[0]
                );
                const usdcAllowance = fulledClaimableAndAllowance(
                    'groUSDC.e_vault',
                    result,
                    claimedAmounts[1],
                    amount,
                    userClaimed[1],
                    baseAllowance[1],
                    userAllowance[1]
                );
                const usdtAllowance = fulledClaimableAndAllowance(
                    'groUSDT.e_vault',
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
                const remainTotal = daiAllowance
                    .add(usdcAllowance)
                    .add(usdtAllowance);
                result.total_claimable_allowance = claimableTotal.toString();
                result.total_remaining_allowance = remainTotal.toString();

                const bouncerRoot = await getCurrentRoot(provider);
                if (root === bouncerRoot) {
                    result.root_matched = true;
                }
            } else {
                // have proof file, but not include the account
                fullupVaults(result, baseAllowance, userAllowance, userClaimed);
            }
        }
        // update status
        result.status = 'ok';
    } catch (error) {
        logger.error(`Get gro gate for ${account} failed.`);
        logger.error(error);
    }
    return result;
}

export { getAccountAllowance };
