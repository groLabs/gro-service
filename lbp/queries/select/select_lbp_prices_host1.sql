SELECT "lbp_timestamp" as "timestamp",
    spot_price as "value",
    current_balance as "volume"
FROM gro."LBP_BALANCER_HOST1"
ORDER BY "lbp_timestamp";