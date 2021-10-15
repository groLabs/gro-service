SELECT block_number,
    block_timestamp,
    block_date,
    safety_check_bound,
    safety_check,
    oracle_check_tolerance,
    curve_check_tolerance
FROM gro."PROTOCOL_PRICE_CHECK_GLOBAL" pc,
    (
        SELECT "last_timestamp" as "last_timestamp"
        FROM gro."SYS_PROTOCOL_LOADS"
        WHERE "table_name" = 'PRICE_CHECK'
    ) lt
WHERE pc."block_timestamp" = lt."last_timestamp";