const { ethers } = require('ethers');
const logger = require('../statsLogger');
const { getAlchemyRpcProvider } = require('../../dist/common/chainUtil');
const erc20ABI = require('../../dist/abi/ERC20.json');
const { ContractNames } = require('../../dist/registry/registry');
const {
    getLatestContractsAddress,
} = require('../../dist/registry/registryLoader');

const providerKey = 'stats_personal';
const provider = getAlchemyRpcProvider(providerKey);

function parseData(abi, fragment, dataContent) {
    const iface = new ethers.utils.Interface(abi);
    const result = iface.decodeEventLog(fragment, dataContent);
    return result;
}

function getEventFragment(abi, eventName) {
    let result;
    const iface = new ethers.utils.Interface(abi);
    const eventFragments = Object.values(iface.events);
    for (let i = 0; i < eventFragments.length; i += 1) {
        const eventFragment = eventFragments[i];
        if (eventFragment.name === eventName) {
            result = {
                eventFragment,
                topic: iface.getEventTopic(eventFragment),
            };
            break;
        }
    }
    return result;
}

async function getMintOrBurnGToken(isPWRD, transactionHash) {
    const transactionReceipt = await provider
        .getTransactionReceipt(transactionHash)
        .catch((error) => {
            logger.error(error);
        });
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        let gtoken =
            getLatestContractsAddress()[
                ContractNames.powerD
            ].address.toLowerCase();
        const eventFragment = getEventFragment(erc20ABI, 'Transfer');
        if (eventFragment) {
            if (!isPWRD) {
                gtoken =
                    getLatestContractsAddress()[
                        ContractNames.groVault
                    ].address.toLowerCase();
            }
            for (let i = 0; i < logs.length; i += 1) {
                const { topics, address, data } = logs[i];
                if (
                    eventFragment.topic === topics[0] &&
                    gtoken === address.toLowerCase()
                ) {
                    const logData = parseData(
                        erc20ABI,
                        eventFragment.eventFragment,
                        data
                    );
                    return logData[2].toString();
                }
            }
        }
    }
    return 0;
}

async function AppendGTokenMintOrBurnAmountToLog(logs) {
    const parsePromises = [];
    logs.forEach((log) => {
        parsePromises.push(
            getMintOrBurnGToken(log.args[2], log.transactionHash)
        );
    });
    const result = await Promise.all(parsePromises);
    for (let i = 0; i < logs.length; i += 1) {
        logs[i].gtokenAmount = result[i];
    }
}

module.exports = {
    AppendGTokenMintOrBurnAmountToLog,
};
