import { ethers } from 'ethers';
import { getFilterEvents } from '../../common/logFilter-new';
import { getConfig } from '../../common/configUtil';
import { appendEventTimestamp } from '../services/generatePersonTransaction';
import { getAlchemyRpcProvider } from '../../common/chainUtil';

import AirdropABI from '../../abi/Airdrop.json';

const providerKey = 'stats_personal';

const airdropConfig = getConfig('airdrop');
const provider = getAlchemyRpcProvider(providerKey);
const airdrop = new ethers.Contract(
    airdropConfig.address,
    AirdropABI,
    provider
);

interface IFilter extends ethers.EventFilter {
    fromBlock: any;
    toBlock: any;
}

async function getAirdropClaimEvents(
    account,
    startBlock = airdropConfig.start_block,
    endBlock
) {
    const filter = airdrop.filters.LogClaim(account) as IFilter;
    filter.fromBlock = startBlock;
    filter.toBlock = endBlock;
    const logsObject = await getFilterEvents(
        filter,
        airdrop.interface,
        providerKey
    );
    const logs = logsObject.data;
    await appendEventTimestamp(logs, provider);
    const transactions = {};
    logs.forEach((item) => {
        transactions[`${item.args[1]}`] = [item.transactionHash];
        console.log(transactions[`${item.args[1]}`]);
    });
    return transactions;
}

async function getAirdropClaimed(merkleId, account) {
    const claimed = await airdrop.isClaimed(merkleId, account);
    return claimed;
}

export { getAirdropClaimEvents, getAirdropClaimed };
