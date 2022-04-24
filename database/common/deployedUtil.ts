import {
    showInfo,
    showError
} from '../handler/logHandler';
import { EventName as EV } from '../types';
import { getContractHistory } from '../../registry/registry';


//@notice   Default error object to be returned when block range is out of genesis block
const ERROR_OBJ = {
    isDeployed: false,
    fromBlock: -1,
}

///@notice  Determine if data needs to be loaded depending on the date of SC deployment
///@param   contractName The contract name
///@param   eventName The event name
///@param   fromBlock The start block to load events
///@param   toBlock The end block to load events
///@return  isDeployed: true if block range falls into a contract deployment; false otherwise
///         fromBlock: 
///         - if the <from> block is before a contract deployment but the <to> block if after the
///         contract deployment, the deployment block will be returned.
///         - If the <from> block is after a contract deployment, the same <from> block will be returned
///         Possible return combinations:
///         - isDeployed: false / fromBlock: -1 -> error
///         - isDeployed: false / fromBlock: >0 -> block range out of genesis block (no load required)
///         - isDeployed: true  / fromBlock: >0 -> block range within genesis block (load required)
const isContractDeployed = async (
    contractName: string,
    eventName: EV,
    fromBlock: number,
    toBlock: number,
): Promise<{
    isDeployed: boolean,
    fromBlock: number
}> => {
    try {
        const info = `for event <${eventName}> in contract <${contractName}>`;
        const genesisBlock = await getStartBlock(contractName);

        if (genesisBlock < 0) {
            showError(
                'deployedUtil.ts->getStartBlock()',
                `No contract config found ${info}`,
            );
            return ERROR_OBJ;
        } else if (toBlock < genesisBlock) {
            showInfo(
                `Block range [${fromBlock} to ${toBlock}] before genesis block [${genesisBlock}] ${info}`,
            );
            return {
                isDeployed: false,
                fromBlock: fromBlock,
            }
        } else if (fromBlock < genesisBlock && toBlock >= genesisBlock) {
            showInfo(
                `From block [${fromBlock}] changed to genesis block [${genesisBlock}] ${info}`
            );
            return {
                isDeployed: true,
                fromBlock: genesisBlock,
            }
        } else if (fromBlock >= genesisBlock) {
            return {
                isDeployed: true,
                fromBlock: fromBlock
            }
        } else {
            showError(
                'deployedUtil.ts->isContractDeployed()',
                `No match in block range [${fromBlock} to ${toBlock}] with genesis block [${genesisBlock}] ${info}`,
            );
            return ERROR_OBJ;
        }
    } catch (err) {
        showError('deployedUtil.ts->isContractDeployed()', err);
        return ERROR_OBJ;
    }
}

///@return:  first startBlock from a contract history
const getStartBlock = async (contractName: string): Promise<number> => {
    const contracts = await getContractHistory(contractName);
    if (contracts.length > 0) {
        const firstContract = contracts.reduce((prev, curr) => {
            return prev.startBlock < curr.startBlock ? prev : curr;
        });
        return firstContract.startBlock;
    } else {
        return -1;
    }
}

export {
    isContractDeployed,
};