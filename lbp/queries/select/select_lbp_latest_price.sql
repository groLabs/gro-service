-- Adding 'distinct' in case that no updates in timestamp are done for N calculations in a row
SELECT distinct(spot_price) AS lastest_price
FROM gro."LBP_PRICE" p,
    (
        SELECT distinct(max("price_timestamp")) AS "max_timestamp"
        FROM gro."LBP_PRICE"
    ) p_ts
WHERE p."price_timestamp" = p_ts."max_timestamp";