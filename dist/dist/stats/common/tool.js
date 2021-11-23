const { getMintOrBurnGToken } = require('../../dist/common/actionDataFunder');
async function AppendGTokenMintOrBurnAmountToLog(logs) {
    const parsePromises = [];
    logs.forEach((log) => {
        parsePromises.push(getMintOrBurnGToken(log.args[2], log.transactionHash, null));
    });
    const result = await Promise.all(parsePromises);
    for (let i = 0; i < logs.length; i += 1) {
        logs[i].gtokenAmount = result[i];
    }
}
module.exports = {
    AppendGTokenMintOrBurnAmountToLog,
};
