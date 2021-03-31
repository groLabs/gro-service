const BN = require('bignumber.js');

const ETH_DECIMAL = BN(10).pow(18);
const CONTRACT_ASSET_DECIAML = BN(10).pow(18);

const div = function (mol, deno, decimal) {
    return BN(mol.toString()).div(deno).toFixed(decimal);
};

module.exports = {
    ETH_DECIMAL,
    CONTRACT_ASSET_DECIAML,
    div,
};
