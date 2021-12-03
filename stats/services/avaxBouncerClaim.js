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

const groGateFileFolder = groGateConfig.folder;
const groGateFiles = groGateConfig.files || [];

function readGroGateFile(fileName) {
    const rawdata = fs.readFileSync(fileName);
    const result = JSON.parse(rawdata);
    return result;
}

async function getRemainingAllowance(account, vaultType, provider) {
    const latestVault = getLatestSystemContractOnAVAX(
        vaultType,
        provider
    ).contract;

    const remainingAllowance = await latestVault.userAllowance(account);
    return remainingAllowance;
}

function fulledClaimableAndAllowance(
    type,
    decimals,
    orignal,
    claimedAmount,
    claimableAmount = 0,
    remainAmount
) {
    orignal[type].remaining_allowance = formatNumber2(
        remainAmount,
        decimals,
        0
    );
    if (BigNumber.from(claimableAmount).gt(claimedAmount)) {
        orignal[type].claimable = true;
    } else {
        orignal[type].claimable = false;
    }
}

async function getClaimedAmount(account, provider) {
    const latestBouncer = getLatestSystemContractOnAVAX(
        ContractNames.AVAXBouncer,
        provider
    ).contract;

    const latestContractsInfo = getLatestContractsAddress();
    const amountPromise = [];
    amountPromise.push(
        latestBouncer.getClaimed(
            latestContractsInfo[ContractNames.AVAXDAIVault].address,
            account
        )
    );
    amountPromise.push(
        latestBouncer.getClaimed(
            latestContractsInfo[ContractNames.AVAXUSDCVault].address,
            account
        )
    );
    amountPromise.push(
        latestBouncer.getClaimed(
            latestContractsInfo[ContractNames.AVAXUSDTVault].address,
            account
        )
    );
    const claimedAmounts = await Promise.all(amountPromise);
    return claimedAmounts;
}

async function getAccountAllowance(account, provider) {
    account = toChecksumAddress(account);
    const result = {
        'groDAI.e_vault': { ...DEFAULT_GRO_STABLE },
        'groUSDC.e_vault': { ...DEFAULT_GRO_STABLE },
        'groUSDT.e_vault': { ...DEFAULT_GRO_STABLE },
        total_claimable_allowance: '0',
        total_remaining_allowance: '0',
        snapshot_ts: '0',
        gro_balance_at_snapshot: '0',
        gro_gate_at_snapshot: '0',
        proofs: [],
    };
    try {
        const latestAllowanceFileIndex = groGateFiles.length;
        if (latestAllowanceFileIndex < 1) {
            logger.info("Doesn't find gro gate allowance files.");
            return result;
        }
        const filePath = `${groGateFileFolder}/${
            groGateFiles[latestAllowanceFileIndex - 1]
        }`;

        const groGateContent = readGroGateFile(filePath);
        const {
            snapshot_ts: snapshotTS,
            gro_gate_at_snapshot: groGateBalance,
            proofs,
        } = groGateContent;
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

            const claimedAmounts = await getClaimedAmount(account, provider);
            const remainingAmountPromise = [
                getRemainingAllowance(
                    account,
                    ContractNames.AVAXDAIVault,
                    provider
                ),
                getRemainingAllowance(
                    account,
                    ContractNames.AVAXUSDCVault,
                    provider
                ),
                getRemainingAllowance(
                    account,
                    ContractNames.AVAXUSDTVault,
                    provider
                ),
            ];
            const remainingAmounts = await Promise.all(remainingAmountPromise);

            fulledClaimableAndAllowance(
                'groDAI.e_vault',
                18,
                result,
                claimedAmounts[0],
                amount,
                remainingAmounts[0]
            );
            fulledClaimableAndAllowance(
                'groUSDC.e_vault',
                6,
                result,
                claimedAmounts[1],
                amount,
                remainingAmounts[1]
            );
            fulledClaimableAndAllowance(
                'groUSDT.e_vault',
                6,
                result,
                claimedAmounts[2],
                amount,
                remainingAmounts[2]
            );
            const claimableTotal = BigNumber.from(amount).mul(
                BigNumber.from(3)
            );
            const remainTotal = remainingAmounts[0]
                .div(BigNumber.from(10).pow(18))
                .add(remainingAmounts[1].div(BigNumber.from(10).pow(6)))
                .add(remainingAmounts[2].div(BigNumber.from(10).pow(6)));
            result.total_claimable_allowance = claimableTotal.toString();
            result.total_remaining_allowance = remainTotal.toString();
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
