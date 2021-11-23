"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALANCES_BATCH = exports.TABLE_WHITELIST = exports.ERC20_TRANSFER_SIGNATURE = exports.QUERY_SUCCESS = exports.QUERY_ERROR = void 0;
const QUERY_ERROR = 400;
exports.QUERY_ERROR = QUERY_ERROR;
const QUERY_SUCCESS = 200;
exports.QUERY_SUCCESS = QUERY_SUCCESS;
const ERC20_TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
exports.ERC20_TRANSFER_SIGNATURE = ERC20_TRANSFER_SIGNATURE;
const BALANCES_BATCH = 750;
exports.BALANCES_BATCH = BALANCES_BATCH;
// Restrict eligible tables to extract data when called from API
const TABLE_WHITELIST = [
    'MD_STABLECOINS',
    'PROTOCOL_PRICE_CHECK_DETAILED',
];
exports.TABLE_WHITELIST = TABLE_WHITELIST;
