const BN = require('bignumber.js');

const ETH_DECIMAL = BN(10).pow(18);
const CONTRACT_ASSET_DECIMAL = BN(10).pow(18);
const internationalNumberFormat = new Intl.NumberFormat('en-US');

function div(mol, deno, decimal) {
    return BN(mol.toString()).div(deno).toFixed(decimal);
}

function formatNumber(originalNumber, decimal, fixed) {
    const tempNum = BN(originalNumber.toString())
        .div(BN(10).pow(decimal))
        .toFixed(fixed);
    return internationalNumberFormat.format(tempNum);
}

function shortAccount(accountAddress, fixed = 6) {
    return accountAddress.substring(0, fixed);
}

module.exports = {
    ETH_DECIMAL,
    CONTRACT_ASSET_DECIMAL,
    div,
    formatNumber,
    shortAccount,
};
