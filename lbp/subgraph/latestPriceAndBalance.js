// poolTokens = get the current balance of GRO and USDC

const latestPriceAndBalance = (poolId) => (
  `{
    poolTokens (
        where: {
          poolId: "${poolId}"
        }
      ) {
        symbol
        name
        balance
        weight
      }
  }`
);

// const latestPriceAndBalance = (poolId, targetTimestamp) => (
//   `{
//     poolTokens (
//         where: {
//           poolId: "${poolId}"
//         }
//       ) {
//         symbol
//         name
//         balance
//         weight
//       }
//     tokenPrices (
//           orderBy: block
//           orderDirection: desc
//           first: 1
//         where: {
//           poolId: "${poolId}"
//           timestamp_lte: ${targetTimestamp} 
//         }
//     ) {
//       price
//       timestamp
//       block
//     }
//   }`
// );

module.exports = {
    latestPriceAndBalance,
};
