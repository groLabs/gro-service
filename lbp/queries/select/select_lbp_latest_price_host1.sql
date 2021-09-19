-- Adding 'distinct' in case that no updates in timestamp are done for N calculations in a row
SELECT distinct(spot_price) AS lastest_price
FROM gro."LBP_BALANCER_HOST1" p,
    (
        SELECT distinct(max("lbp_timestamp")) AS "max_timestamp"
        FROM gro."LBP_BALANCER_HOST1"
    ) p_ts
WHERE p."lbp_timestamp" = p_ts."max_timestamp";