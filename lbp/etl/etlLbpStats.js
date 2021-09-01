/// Sergi to implement the Extraction/Transformation/Load of the LBP data from the bot into the DB

const etlLbpStats = async () => {
    // 1) Call /services/lbpServices.js to retrieve data from SC
    // 2) Call /loader/loadLbp.js to dump data into table/s
    console.log('excuting etlLbpStats');
}

module.exports = {
    etlLbpStats,
};