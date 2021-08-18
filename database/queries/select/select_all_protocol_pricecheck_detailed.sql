SELECT pc."block_number",
    pc."block_timestamp",
    scp."name" as "pair_name",
    pc."curve_price",
    pc."curve_cache_price",
    pc."curve_cache_diff",
    pc."curve_cache_check",
    pc."chainlink_price",
    pc."curve_chainlink_diff",
    pc."curve_chainlink_check"
FROM gro."PROTOCOL_PRICE_CHECK_DETAILED" pc
    LEFT JOIN gro."MD_STABLECOIN_PAIRS" scp ON pc.stablecoin_pair_id = scp.pair_id,
    (
        SELECT "last_timestamp" as "last_timestamp"
        FROM gro."SYS_PROTOCOL_LOADS"
        WHERE "table_name" = 'PRICE_CHECK'
    ) lt
WHERE pc."block_timestamp" = lt."last_timestamp"
ORDER BY pc.stablecoin_pair_id;