import fs from 'fs';
import moment from 'moment';
const {
    getGroVault: getGVT,
    getPowerD: getPWRD,
    // getGroDAO: getGRO,
} = require('../common/contractUtil');
import {
    checkTime,
    getBalances,
} from './balanceUtil';
import {
    getProvider,
    findBlockByDate,
    checkDateRange,
    parseAmount,
} from './globalUtil';
import { Base } from '../types';
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

export {
    status,
    isContract,
    groAirdropHolders,
}
