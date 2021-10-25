const { BigNumber } = require('ethers');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { parseAmount } = require('../parser/personalStatsParser');
const { getConfig } = require('../../common/configUtil');
const {
    getGroVault,
    getPowerD,
    getTokenCounter,
} = require('../common/contractUtil');
const ONE = BigNumber.from('1000000000000000000');

const GRO_ADDRESS = getConfig('staker_pools.contracts.gro_address');
const UNI_POOL_GVT_GRO_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_gvt_pool_address');
const UNI_POOL_GVT_USDC_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_usdc_pool_address');
const CRV_POOL_PWRD_ADDRESS = getConfig('staker_pools.contracts.curve_pwrd3crv_pool_address');
const BAL_POOL_GRO_WETH_ADDRESS = getConfig('staker_pools.contracts.balancer_gro_weth_pool_address');


const getBalances = async (tokenAddress, userAddresses, blockNumber) => {
    try {
        let balances;
        let result = [];
        const blockTag = { blockTag: blockNumber };

        const GVT_ADDRESS = getGroVault().address;
        const PWRD_ADDRESS = getPowerD().address;

        // Retrieve token amounts
        switch (tokenAddress) {
            case GVT_ADDRESS:
            case PWRD_ADDRESS:
            case GRO_ADDRESS:
                // TODO: perhaps to be replaced by:
                // const [result_unstaked, result_staked] = balances;
                balances = await getTokenCounter().getTokenAmounts(
                    tokenAddress,
                    userAddresses,
                    blockTag,
                );
                break;
            case UNI_POOL_GVT_GRO_ADDRESS:
            case UNI_POOL_GVT_USDC_ADDRESS:
                balances = await getTokenCounter().getLpAmountsUni(
                    tokenAddress,
                    userAddresses,
                    blockTag,
                );
                break;
            case BAL_POOL_GRO_WETH_ADDRESS:
                balances = await getTokenCounter().getLpAmountsBalancer(
                    tokenAddress,
                    userAddresses,
                    blockTag,
                );
                break;
            case CRV_POOL_PWRD_ADDRESS:
                balances = await getTokenCounter().getCurvePwrd(
                    tokenAddress,
                    userAddresses,
                    blockTag,
                );
                break;
            default:
                console.log('Unrecognised token address');
                break;
        }

        // Calc value (when necessary)
        // TODO: probably better to replace it by if GVT, do this, else, do that
        switch (tokenAddress) {
            case GVT_ADDRESS:
                const pricePerShareGVT = await getGroVault().getPricePerShare(blockTag);
                for (const balance of balances) {
                    const value = BigNumber.from(balance).mul(BigNumber.from(pricePerShareGVT)).div(ONE);
                    result.push(value);
                }
                break;
            case PWRD_ADDRESS:
            case GRO_ADDRESS:
            case CRV_POOL_PWRD_ADDRESS:
                result = balances;
                break;
            default:
                break;
        }

        // Parse values to floats
        return result.map(value => parseAmount(value, 'USD'));

    } catch (err) {
        logger.error(`**DB: Error in balanceUtil.js->getBalances(): ${err}`);
    }
}

module.exports = {
    getBalances,
}
