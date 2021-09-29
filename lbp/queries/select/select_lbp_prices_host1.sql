SELECT "lbp_timestamp" as "timestamp",
    spot_price as "value",
    trading_volume as "volume"
FROM gro."LBP_BALANCER_HOST1"
ORDER BY "lbp_timestamp";