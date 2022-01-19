import fs from 'fs';
import moment from 'moment';
import { query } from '../handler/queryHandler';
const {
    getGroVault: getGVT,
    getPowerD: getPWRD,
    // getGroDAO: getGRO,
    getUSDCeVault,
} = require('../common/contractUtil');
import {
    checkTime,
    getBalances,
} from './balanceUtil';
import {
    errorObj,
    getProvider,
    parseAmount,
    checkDateRange,
    findBlockByDate,
} from './globalUtil';
import { Base } from '../types';
import {
    QUERY_ERROR,
    QUERY_SUCCESS,
} from '../constants';
import { ICall } from '../interfaces/ICall';
import { getConfig } from '../../common/configUtil';
const statsDir = getConfig('stats_folder');

// DUMPS:
const { airdropHoldersAvax: balances } = require('../files/airdropHoldersAvax');
// const {argentHolders : balances} = require('../files/argentHolders');


const status = async (targetDate, targetTime, targetBlock) => {

    let date;
    // TODO: if targetDate/time nulls, current time
    if (targetDate && targetTime) {
        if (checkDateRange(targetDate, targetDate)) {
            const [hours, minutes, seconds] = checkTime(targetTime);
            if (hours === -1)
                return false;
            date = moment.utc(targetDate, "DD/MM/YYYY")
                .add(hours, 'hours')
                .add(minutes, 'minutes')
                .add(seconds, 'seconds');
        } else {
            return;
        }
    } else if (!targetBlock) {
        date = moment().utc();
    }

    const block = (targetBlock)
        ? targetBlock
        // @ts-ignore
        : (await findBlockByDate(date, false)).block;

    // GVT data
    const priceGVT = parseAmount(await getGVT().getPricePerShare({ blockTag: block }), Base.D18);
    const totalAssetsGVT = await getGVT().totalAssets({ blockTag: block });
    const totalAssetsGVTparsed = parseAmount(totalAssetsGVT, Base.D18);
    const totalSupplyGVT = await getGVT().totalSupply({ blockTag: block });
    const totalSupplyGVTparsed = parseAmount(totalSupplyGVT, Base.D18);

    // PWRD data
    const pricePWRD = parseAmount(await getPWRD().getPricePerShare({ blockTag: block }), Base.D18);
    const totalAssetsPWRD = await getPWRD().totalAssets({ blockTag: block });
    const totalAssetsPWRDparsed = parseAmount(totalAssetsPWRD, Base.D18);
    const totalSupplyPWRD = await getPWRD().totalSupply({ blockTag: block });
    const totalSupplyPWRDparsed = parseAmount(totalSupplyPWRD, Base.D18);

    // GRO data
    // const totalSupplyGRO = await getGRO().totalSupply({ blockTag: block });
    // const totalSupplyGROparsed = parseAmount(totalSupplyGRO, Base.D18);

    console.log(`-------------------------`);
    console.log(`block : ${block}`);
    console.log(`date : ${date.format('DD/MM/YYYY HH:mm:ss')}`);
    console.log(`----GVT------------------`);
    console.log(`price x share: ${priceGVT}`);
    console.log(`total shares: ${totalSupplyGVTparsed.toLocaleString()} [ ${totalSupplyGVTparsed} ${totalSupplyGVT.toString()} ]`);
    console.log(`total assets: $ ${totalAssetsGVTparsed.toLocaleString()} [ ${totalAssetsGVTparsed} ${totalAssetsGVT.toString()} ]`);
    console.log(`----PWRD-----------------`);
    console.log(`price x share: ${pricePWRD}`);
    console.log(`total shares: ${totalSupplyPWRDparsed.toLocaleString()} [ ${totalSupplyPWRDparsed} ${totalSupplyPWRD.toString()} ]`);
    console.log(`total assets: $ ${totalAssetsPWRDparsed.toLocaleString()} [ ${totalAssetsPWRDparsed} ${totalAssetsPWRD.toString()} ]`);
    console.log(`----GRO------------------`);
    // console.log(`total shares: ${totalSupplyGROparsed.toLocaleString()} [ ${totalSupplyGROparsed} ${totalSupplyGRO.toString()} ]`);
    console.log('before')
    const a = await getUSDCeVault().getPricePerShare();
    console.log('after:', a);
}

// input:
// output:
const isContract = async () => {
    const currentFile = `${statsDir}/gro_balances.txt`;
    const maxLength = balances.length;
    for (let i = 0; i < maxLength; i++) {
        const value = await getProvider().getCode(balances[i]);
        const result = `${balances[i]}|${(value !== '0x') ? 'Y' : 'N'}\r\n`;
        console.log(`${i} of ${maxLength} -> ${result}`);
        fs.appendFileSync(currentFile, result);
    }
}

// goal:    workaround to get combined GRO from manually added wallets to the AVAX allocance list.
// input:   ./files/airdropHoldersAvax.ts
// output:  console.log => wallet|gro_amount
const groAirdropHolders = async (targetTimestamp: number) => {
    const VOTE_AGGREGATOR_ADDRESS = '0x2c57F9067E50E819365df7c5958e2c4C14A91C2D';
    // @ts-ignore
    const block = (await findBlockByDate(moment.unix(targetTimestamp), false)).block;
    console.log(`Balances at block ${block}:`)
    const res = await getBalances(VOTE_AGGREGATOR_ADDRESS, balances, block);
    const combinedGro = res[0].amount_unstaked;
    for (let i = 0; i < balances.length; i++) {
        console.log(`${balances[i]}|${combinedGro[i]}`);
    }
}

const NO_STATUS_FOUND = '**DB: No data found (hint: see data in SYS_DB_STATUS & MD_STATUS tables)';

const getDbStatus = async (featureId: number): Promise<ICall> => {
    try {
        const q = 'select_sys_status.sql';
        const stat = await query(q, [featureId]);
        if (stat.status !== QUERY_ERROR && stat.rows.length > 0) {
            return {
                status: QUERY_SUCCESS,
                data: {
                    statusId: parseInt(stat.rows[0].status_id),
                    statusDesc: stat.rows[0].status_desc,
                }
            }
        } else {
            return errorObj(NO_STATUS_FOUND);
        }
    } catch (err) {
        console.log('Error in statusUtil.ts-getDbStatus():', err);
        return errorObj(err);
    }
}

const setDbStatus = async (featureId: number, statusId: number) => {
    try {
        const q = 'update_sys_status.sql';
        const stat = await query(q, [featureId, statusId]);
        if (stat.status === QUERY_SUCCESS) {
            const q = 'select_sys_status.sql';
            const stat = await query(q, [featureId]);
            if (stat.status !== QUERY_ERROR && stat.rows.length > 0) {
                console.log(`**DB: Updated -> new database status: ${stat.rows[0].status_desc}`);
            } else {
                console.log(NO_STATUS_FOUND);
            }
        } else {
            console.log(NO_STATUS_FOUND);
        }
    } catch (err) {
        console.log('Error in statusUtil.ts-setDbStatus():', err);
    }
}

export {
    status,
    isContract,
    getDbStatus,
    setDbStatus,
    groAirdropHolders,
}
