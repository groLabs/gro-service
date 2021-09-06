INSERT INTO gro."LBP_TRADES_AGGR" (
        last_trade_date,
        last_trade_timestamp,
        last_block_number,
        network_id,
        usdc_amount_in,
        gro_amount_out,
        creation_date
    )
SELECT max("trade_date") as "last_trade_date",
    max("trade_timestamp") as "last_trade_timestamp",
    max("block_number") as "last_block_number",
    "network_id" as "network_id",
    sum(
        CASE
            WHEN tx_type = 'SWAP_IN' THEN parsed_target_amount
            ELSE 0
        END
    ) as usdc_amount_in,
    sum(
        CASE
            WHEN tx_type = 'SWAP_OUT' THEN parsed_target_amount
            ELSE 0
        END
    ) as gro_amount_out,
    now() as creation_date
FROM gro."LBP_TRADES_USER"
GROUP BY "network_id";