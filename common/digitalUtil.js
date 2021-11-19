const BN = require('bignumber.js');
const { BigNumber } = require('ethers');

const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../${botEnv}/${botEnv}Logger`);

const ETH_DECIMAL = BN(10).pow(18);
const CONTRACT_ASSET_DECIMAL = BN(10).pow(18);
const ONE = BigNumber.from('1000000000000000000');
const ZERO = BigNumber.from('0');

function div(mol, deno, decimal) {
    return BN(mol.toString()).div(deno).toFixed(decimal);
}

function adjustDecimal(mol, deno) {
    return BN(mol.toString()).div(BN(10).pow(deno.toString()));
}

function toSum(datas) {
    let total = BN(0);
    for (let i = 0; i < datas.length; i += 1) {
        total = total.plus(datas[i]);
    }
    return total.toFormat(2);
}

function calculateDelta(diff, total) {
    let result;
    if (total.eq(BigNumber.from(0))) {
        result = BN(100);
    } else {
        result = BN(diff.toString())
            .multipliedBy(BN(100))
            .div(BN(total.toString()));
    }
    return result.toFormat(2);
}

function formatNumber(originalNumber, decimal, fixed) {
    const tempNum = BN(originalNumber.toString()).div(BN(10).pow(decimal));
    return tempNum.toFormat(fixed);
}

function formatNumber2(originalNumber, decimal, fixed) {
    const tempNum = BN(originalNumber.toString()).div(BN(10).pow(decimal));
    return tempNum.toFixed(fixed);
}

function shortAccount(accountAddress, fixed = 6) {
    return accountAddress.substring(0, fixed);
}

/// @notice Converts a float (with decimals) into BigNumber in weis (10exp18)
///         E.g.: given 34.560, it will return 34560000000000000000
/// @dev    The decimals are trimmed to 10 digits to avoid 'invalid BigNumber string' error
/// @param _value The float to be converted
/// @return BigNumber in weis
const floatToBN = (_value) => {
    try {
        if (isNaN(_value)) {
            return ZERO;
        } else {
            const value = parseFloat(_value);
            if (Math.trunc(value) !== value) {
                const integer = Math.trunc(value);
                const decimals = value.toFixed(10).split('.')[1];
                const countDecimals = decimals.length || 0;
                const result = BigNumber.from(integer.toString() + decimals)
                    .mul(ONE)
                    .div(BigNumber.from('10').pow(countDecimals.toString()));
                return result;
            } else {
                const result = BigNumber.from(value.toString()).mul(ONE);
                return result;
            }
        }
    } catch (err) {
        logger.error(`Error at digitalUtil->floatToBN(): ${err}`);
        return ZERO;
    }
};

module.exports = {
    ETH_DECIMAL,
    CONTRACT_ASSET_DECIMAL,
    div,
    adjustDecimal,
    toSum,
    formatNumber,
    formatNumber2,
    shortAccount,
    calculateDelta,
    floatToBN,
};
