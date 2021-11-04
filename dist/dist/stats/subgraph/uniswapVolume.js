"use strict";
const uniswapVolume = (pairId, block) => (`{
        pair(
            id: "${pairId}",
            ${block
    ? `block: {
                    number: ${block}
                }`
    : ''} 
        )
        {
            volumeUSD
            volumeToken0
            volumeToken1
            untrackedVolumeUSD
        }
    }`);
module.exports = {
    uniswapVolume,
};
