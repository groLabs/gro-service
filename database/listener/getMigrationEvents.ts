// 1-off requirement to retrieve all users who migrated into the LPTokenStakerV2
import moment from 'moment';
import { ethers } from 'ethers';
import { getEvents } from '../../common/logFilter';
import { getLatestContractEventFilter, } from '../../common/filterGenerateTool';
import { ContractNames } from '../../registry/registry';
import { showError } from '../handler/logHandler';
import { EventResult } from '../../common/commonTypes';
import { ICall } from '../interfaces/ICall';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import {
    errorObj,
    getProvider,
} from '../common/globalUtil';
import { getConfig } from '../../common/configUtil';
const statsDir = getConfig('stats_folder');
import fs from 'fs';
import { getBlockData } from '../common/globalUtil';


const getMigrateEvents = async (
    fromBlock: number,
    toBlock: any,
): Promise<ICall> => {
    try {
        const eventType: string = 'LogMigrateUser';
        const contractName: string = ContractNames.LPTokenStakerV2;
        const filter = getLatestContractEventFilter(
            'default',
            contractName,
            eventType,
            fromBlock,
            toBlock,
            [null, null],
        );

        const event: EventResult = await getEvents(
            filter.filter,
            filter.interface,
            getProvider(),
        );

        if (event.status === QUERY_ERROR) {
            showError(
                'getMigrateEvents.ts->getMigrateEvents()',
                `Error while retrieving claim events: ${event.data}`
            );
            return errorObj(`Error while retrieving claim events: ${event.data}`);
        } else {
            console.log('Total records ->', event.data.length);
            const currentFile = `${statsDir}/migrations.csv`;
            const header = `block,timestamp,date,tx_hash,event,contract_address,user_address,gas_used,cumulative_gas_used,effective_gas_price,fee_wei,fee_eth\r\n`;
            fs.appendFileSync(currentFile, header);
            for (let i = 0; i < event.data.length; i++) {

                const [
                    txReceipt,
                    block
                ] = await Promise.all([
                    getProvider()
                        .getTransactionReceipt(event.data[i].transactionHash)
                        .catch((err) => {
                            showError('getMigrateEvents.ts->getMigrateEvents()', err);
                        }),
                    getBlockData(event.data[i].blockNumber)
                ]);

                // Dump data into a file
                const log1 = `${event.data[i].blockNumber},${block.timestamp},${moment.unix(block.timestamp).utc()},${event.data[i].transactionHash},${event.data[i].name}`;
                const log2 = `,${event.data[i].address},${event.data[i].args[0]}`;
                const tx = `,${txReceipt.gasUsed},${txReceipt.cumulativeGasUsed},${txReceipt.effectiveGasPrice}`;
                const fee = `,${txReceipt.gasUsed.mul(txReceipt.effectiveGasPrice)},${ethers.utils.formatEther(txReceipt.gasUsed.mul(txReceipt.effectiveGasPrice))}`;
                const output = `${log1}${log2}${tx}${fee}\r\n`;
                console.log(`#${i} -> ${output}`);

                fs.appendFileSync(currentFile, output);
            }
        }

        return {
            status: QUERY_SUCCESS,
            data: event.data,
        };

    } catch (err) {
        showError('getMigrateEvents.ts->getMigrateEvents()', err);
        return errorObj(err);
    }
}

export {
    getMigrateEvents,
}
