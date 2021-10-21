const QUERY_ERROR = 400;
const QUERY_SUCCESS = 200;
const ERC20_TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Restrict eligible tables to extract data when called from API
const TABLE_WHITELIST = [
    'MD_STABLECOINS',
    'PROTOCOL_PRICE_CHECK_DETAILED',
]


module.exports = {
    QUERY_ERROR,
    QUERY_SUCCESS,
    ERC20_TRANSFER_SIGNATURE,
    TABLE_WHITELIST,
}
