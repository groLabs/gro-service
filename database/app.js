// const { loadGroStatsDB } = require('./loader/personalLoader');
// const { loadGroStatsLiveDB } = require('./loader/personalLiveLoader');

const { etlGroStats } = require('./etl/etlGroStats');
const { etlPriceCheck } = require('./etl/etlPriceCheck');
// const { groStatsHandler } = require('./handler/groStatsHandler');
const { getPriceCheck} = require('./handler/priceCheckHandler');
const scheduler = require('./scheduler/dbStatsScheduler');


// *** TESTING ***
(async () => {
    try {
        // await etlGroStats();
        // await etlPriceCheck();
        console.log(await getPriceCheck());
    } catch (err) {
        console.log(err);
    }
})();
//loadGroStatsDB();
//loadGroStatsLiveDB('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
//groStatsHandler();
//goPrice();






/*
npm i pg
MODE_ENV=kovan BOT_ENV=STATS node ./stats_db/app.js
*/
