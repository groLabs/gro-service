const latestPriceAndBalance = (poolId) => (
    `{
        poolTokens (
            where: {
              poolId: "${poolId}"
            }
          ) {
            symbol
            name
            priceRate
            balance
            weight
          }
        tokenPrices (
              orderBy: block
              orderDirection:desc
              first:1
            where: {
              poolId: "${poolId}"
            }
        ) {
          price
          timestamp
          block
        }
      }`
);

module.exports = {
    latestPriceAndBalance,
};
