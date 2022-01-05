const balancerVolume = (poolId, addr, block) => (
    `{
        pools(
          ${block
            ? `block: {
                number: ${block}
              }`
            : ''
          }
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
          totalSwapFee
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

export {
    balancerVolume,
}
