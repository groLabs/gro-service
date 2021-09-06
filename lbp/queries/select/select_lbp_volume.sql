SELECT T."last_trade_date",
   T."last_trade_timestamp",
   T."last_block_number",
   T."usdc_amount_in",
   T."gro_amount_out"
FROM gro."LBP_TRADES_AGGR" T,
(SELECT max(creation_date) as max_date FROM gro."LBP_TRADES_AGGR") MD
WHERE T."creation_date" = MD."max_date";