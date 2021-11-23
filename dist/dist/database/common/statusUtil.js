"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.status = void 0;
const moment_1 = __importDefault(require("moment"));
const { getGroVault: getGVT, getPowerD: getPWRD,
// getGroDAO: getGRO,
 } = require('../common/contractUtil');
const balanceUtil_1 = require("./balanceUtil");
const globalUtil_1 = require("./globalUtil");
const personalStatsParser_1 = require("../parser/personalStatsParser");
const globalUtil_2 = require("./globalUtil");
const status = async (targetDate, targetTime, targetBlock) => {
    let date;
    // TODO: if targetDate/time nulls, current time
    if (targetDate && targetTime) {
        if ((0, globalUtil_1.checkDateRange)(targetDate, targetDate)) {
            const [hours, minutes, seconds] = (0, balanceUtil_1.checkTime)(targetTime);
            if (hours === -1)
                return false;
            date = moment_1.default.utc(targetDate, "DD/MM/YYYY")
                .add(hours, 'hours')
                .add(minutes, 'minutes')
                .add(seconds, 'seconds');
        }
        else {
            return;
        }
    }
    else if (!targetBlock) {
        date = (0, moment_1.default)().utc();
    }
    const block = (targetBlock)
        ? targetBlock
        // @ts-ignore
        : (await (0, globalUtil_2.findBlockByDate)(date, false)).block;
    // GVT data
    const priceGVT = (0, personalStatsParser_1.parseAmount)(await getGVT().getPricePerShare({ blockTag: block }), 'USD');
    const totalAssetsGVT = await getGVT().totalAssets({ blockTag: block });
    const totalAssetsGVTparsed = (0, personalStatsParser_1.parseAmount)(totalAssetsGVT, 'USD');
    const totalSupplyGVT = await getGVT().totalSupply({ blockTag: block });
    const totalSupplyGVTparsed = (0, personalStatsParser_1.parseAmount)(totalSupplyGVT, 'USD');
    // PWRD data
    const pricePWRD = (0, personalStatsParser_1.parseAmount)(await getPWRD().getPricePerShare({ blockTag: block }), 'USD');
    const totalAssetsPWRD = await getPWRD().totalAssets({ blockTag: block });
    const totalAssetsPWRDparsed = (0, personalStatsParser_1.parseAmount)(totalAssetsPWRD, 'USD');
    const totalSupplyPWRD = await getPWRD().totalSupply({ blockTag: block });
    const totalSupplyPWRDparsed = (0, personalStatsParser_1.parseAmount)(totalSupplyPWRD, 'USD');
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
    // for (let i=0; i < balances.length; i++) {
    //     const value = await getProvider().getCode(balances[i]);
    //     console.log(`${balances[i]}|${(value  !== '0x') ? 'Y' : 'N'}`);
    // }
};
exports.status = status;
