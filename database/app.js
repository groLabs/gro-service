// const { loadGroStatsDB } = require('./loader/personalLoader');
// const { loadGroStatsLiveDB } = require('./loader/personalLiveLoader');
const { etlGroStats } = require('./etl/etlGroStats');
// const { groStatsHandler } = require('./handler/groStatsHandler');
//const { groStatsCall } = require('./common/groStatsCall');


//loadGroStatsDB();
//loadGroStatsLiveDB('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
// etlGroStats();
//groStatsHandler();

(async () => {
    try {
        console.log('before etlGroStats()')
        await etlGroStats();
    } catch (e) {
        console.log(e);
    }
})();

// (async () => {
//     try {
//         var text = await groStatsCall();
//         console.log(text);
//     } catch (e) {
//         console.log(e);
//     }
// })();



/*
npm i pg
MODE_ENV=kovan BOT_ENV=STATS node ./stats_db/app.js
*/
