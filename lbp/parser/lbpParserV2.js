
// TODO: get exceptions
const parseData = (stats) => {
    let gro_balance;
    let usdc_balance;
    let gro_weight;
    let usdc_weight;

    for (const pool of stats.poolTokens) {
        if (pool.symbol === 'GRO') {
            gro_balance = pool.balance;
            gro_weight = pool.weight;
        } else if (pool.symbol === 'USDC') {
            usdc_balance = pool.balance;
            usdc_weight = pool.weight;
        }
    }
    // let gro_price = stats.tokenPrices[0].price;
    let gro_swap_timestamp = stats.tokenPrices[0].timestamp;
    return [
        parseFloat(gro_balance),
        parseFloat(usdc_balance),
        parseFloat(gro_weight),
        // parseFloat(usdc_weight),
        // parseFloat(gro_price),
        parseFloat(gro_swap_timestamp),
    ];
}

module.exports = {
    parseData,
}
