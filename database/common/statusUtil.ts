import fs from 'fs';
import moment from 'moment';
const {
    getGroVault: getGVT,
    getPowerD: getPWRD,
    // getGroDAO: getGRO,
} = require('../common/contractUtil');
import { checkTime } from './balanceUtil';
import { checkDateRange } from './globalUtil';
import { parseAmount } from '../parser/personalStatsParser';
import { getProvider, findBlockByDate } from './globalUtil';
import { getConfig } from '../../common/configUtil';
const statsDir = getConfig('stats_folder');

// DUMPS:
// const { balances } = require('../files/balances_cream');
const {groHolders : balances} = require('../files/groHolders');
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
    const priceGVT = parseAmount(await getGVT().getPricePerShare({ blockTag: block }), 'USD');
    const totalAssetsGVT = await getGVT().totalAssets({ blockTag: block });
    const totalAssetsGVTparsed = parseAmount(totalAssetsGVT, 'USD');
    const totalSupplyGVT = await getGVT().totalSupply({ blockTag: block });
    const totalSupplyGVTparsed = parseAmount(totalSupplyGVT, 'USD');

    // PWRD data
    const pricePWRD = parseAmount(await getPWRD().getPricePerShare({ blockTag: block }), 'USD');
    const totalAssetsPWRD = await getPWRD().totalAssets({ blockTag: block });
    const totalAssetsPWRDparsed = parseAmount(totalAssetsPWRD, 'USD');
    const totalSupplyPWRD = await getPWRD().totalSupply({ blockTag: block });
    const totalSupplyPWRDparsed = parseAmount(totalSupplyPWRD, 'USD');

    // GRO data
    // const totalSupplyGRO = await getGRO().totalSupply({ blockTag: block });
    // const totalSupplyGROparsed = parseAmount(totalSupplyGRO, 'USD');

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

const isContract = async () => {
    console.log('balances', balances);
    const currentFile = `${statsDir}/gro_balances.txt`;
    const maxLength = balances.length;
    for (let i = 0; i < maxLength; i++) {
        const value = await getProvider().getCode(balances[i]);
        const result = `${balances[i]}|${(value !== '0x') ? 'Y' : 'N'}\r\n`;
        console.log(`${i} of ${maxLength} -> ${result}`);
        // fs.appendFileSync(currentFile, JSON.stringify(result));
        fs.appendFileSync(currentFile, result);
    }
}

export {
    status,
    isContract,
}
