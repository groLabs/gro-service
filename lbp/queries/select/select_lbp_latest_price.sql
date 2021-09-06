SELECT spot_price AS lastest_price
FROM gro."LBP_FACT_PRICE" p,
    (
        SELECT max("price_timestamp") AS "max_timestamp"
        FROM gro."LBP_FACT_PRICE"
    ) p_ts
WHERE p."price_timestamp" = p_ts."max_timestamp";