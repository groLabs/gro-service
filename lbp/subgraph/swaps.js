const swaps = (poolId, targetTimestamp) => (
  `{
      swaps (
          orderBy: timestamp
          orderDirection: desc
          where: {
              poolId: "${poolId}"
              timestamp_lte: ${targetTimestamp}
          }
      )
      {
          tokenInSym
          tokenOutSym
          tokenAmountIn
          tokenAmountOut
          timestamp
      }
  }`
);

module.exports = {
  swaps,
}
