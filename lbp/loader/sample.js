const price = {
    "timestamp": 1619709592,
    "blockNumber": 12336132,
    "price": "44719232119764041385130138315"
}

const trades = [{
    "address": "0x29682CF1006Ad08EC6Ade56ae69Db94D4C940F86",
    "blockNumber": 12332795,
    "name": "LOG_SWAP",
    "transactionHash": "0xd24c26c5a6a3ce33545c3eaf19b2d57f68531f23de10167db583a93a0be53c75",
    "caller": "0x4c39185a078B5666C372538231cB793A0928807b",
    "tokenIn": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "tokenOut": "0x33349B282065b0284d756F0577FB39c158F935e6",
    "tokenAmountIn": "2700288769",
    "tokenAmountOut": "152760863388103192162"
}, {
    "address": "0x29682CF1006Ad08EC6Ade56ae69Db94D4C940F86",
    "blockNumber": 12332967,
    "name": "LOG_SWAP",
    "transactionHash": "0xe8db043cd19f93111bfde1ac882430f9b3cf9916d5f66af34416daca8bc86db1",
    "caller": "0x70bEfcb944275e3AD3A64a6e1C9cfeFaB48B3E2A",
    "tokenIn": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "tokenOut": "0x33349B282065b0284d756F0577FB39c158F935e6",
    "tokenAmountIn": "2694042586",
    "tokenAmountOut": "151938216725419738068"
},
];

const stats = {
    price: price,
    trades: trades,
}

module.exports = {
    stats
}
