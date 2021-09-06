SELECT max(last_block_number) as max_block,
    max(last_trade_timestamp) as max_timestamp
FROM gro."LBP_TRADES_AGGR";