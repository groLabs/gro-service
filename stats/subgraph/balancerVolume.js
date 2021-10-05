const balancerVolume = (poolId, addr) => (
    `{
        pools(
          where: {
            id: "${poolId}",
          }
        ) 
        {
          id
          address
          poolType
          factory
          name
          symbol
          swapFee
          swapsCount
          totalLiquidity
          totalShares
          totalSwapVolume
          createTime
        }
        poolShares(
            where: {
              poolId: "${poolId}"
              userAddress: "${addr}"
            }
          ) 
          {
            balance
            userAddress {
              id
            }
          }
      }`
);

module.exports = {
    balancerVolume,
}
