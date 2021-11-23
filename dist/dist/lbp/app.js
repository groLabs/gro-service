const { getLbpStatsDB, getLbpStatsFile, } = require('./handler/lbpHandler');
const { etlLbpStats, etlLbpStatsHDL, etlRecovery, } = require('./etl/etlLbpStats');
const { etlLbpStatsV2, etlLbpStatsV2_vol, etlLbpStatsHDLV2, getSwaps, } = require('./etl/etlLbpStatsV2');
const { loadContractInfoFromRegistry } = require('../registry/registryLoader');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../${botEnv}/${botEnv}Logger`);
// testing
const moment = require('moment');
const { getProvider } = require('../database/common/globalUtil');
const { findBlockByDate } = require('../database/common/globalUtil');
const { LBP_TX_1 } = require('./files/lbp_tx_1');
const { LBP_TX_2 } = require('./files/lbp_tx_2');
(async () => {
    try {
        const params = process.argv.slice(2);
        if (params.length > 0) {
            switch (params[0]) {
                case 'etlLbpStatsHDL':
                    if (params.length === 5) {
                        await etlLbpStatsHDLV2(parseInt(params[1]), // start timestamp
                        parseInt(params[2]), // end timestamp
                        parseInt(params[3]), // time interval in seconds
                        params[4]);
                    }
                    else {
                        console.log('Wrong parameters for LBP stats HDL - e.g.: etlLbpStatsHDL 1626825600 1626912000 3600');
                    }
                    break;
                default:
                    console.log(`Unknown parameter/s: ${params}`);
                    break;
            }
            process.exit(0);
        }
        // Testing LBP
        // 1) Testing normal ETL load
        // await etlLbpStats();
        // await etlLbpStatsV2();
        // await etlLbpStatsHDLV2(1631703600, 1631736000, 3600, false); //
        // await etlLbpStatsHDLV2(1631631600, 1631890800, 3600, false);  //aKlima
        // await etlLbpStatsHDLV2(1631876400, 1632135600, 3600, true);  //Gro v2 rinkeby
        // await new Promise(resolve => setTimeout(resolve, 1000));
        // 2) Testing historical ETL load
        // await etlLbpStatsHDL(1631035645, 1631036145, 300);
        // 3) Testing API request
        // console.log(await getLbpStatsDB());
        // 4) Find a file
        // console.log(findFile('../stats', 'json'));
        // findFile('../stats', 'json');
        // 5) Serve from files
        // console.log(await getLbpStatsFile());
        // 6) Recovery
        // await etlRecovery();
        // Get block data
        // const a = (await getProvider().getBlock());
        // console.log('block:', a);
        // Get block given a timestamp
        // const block = (await findBlockByDate(moment.unix(1631318400).utc(), true)).block;
        // console.log(block);
        // Dump swaps into file
        // let result = '';
        // const swaps = await getSwaps(
        //     moment().unix(),
        //     0,
        //     []
        // );
        // for (const swap of swaps) {
        //     result += `${swap.caller}| ${swap.timestamp}| ${swap.tokenInSym}| ${swap.tokenOutSym}| ${swap.tokenAmountIn}| ${swap.tokenAmountOut}| ${swap.tx} \n`;
        // }
        // const fs = require('fs');
        // fs.writeFileSync('swaps.csv', result, function (err) {
        //     if (err) {
        //         console.log(err);
        //         return;
        //     }
        // });
        // Check Argent stuff
        const TX = LBP_TX_2;
        for (const item of TX) {
            const txReceipt = await getProvider()
                .getTransactionReceipt(item)
                .catch((err) => {
                console.log(err);
            });
            if (txReceipt.logs.length > 5)
                console.log(`from: ${txReceipt.from} -> tx: ${item}`);
        }
        // const txReceipt = await getProvider()
        //     .getTransactionReceipt('0x6404ee69955a591b6c7394b5249fabe86b87e7e9f81796f9c7fb10dedfdd83be')
        //     // .getTransactionReceipt('0x3495dd90cc9a1e968d1fec0246208724bd3e3327b439a703bd686f1d46ab20d6')
        //     .catch((err) => {
        //         console.log(err);
        //     });
        // console.log(txReceipt.logs.length);
        process.exit(0);
    }
    catch (err) {
        console.log(err);
    }
})();
