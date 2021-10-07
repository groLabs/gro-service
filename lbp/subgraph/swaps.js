const swaps = (poolId, targetTimestamp, first, skip) => (
  `{
      swaps (
          first: ${first}
          skip: ${skip}
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
          caller
          timestamp
      }
  }`
);

module.exports = {
  swaps,
}
