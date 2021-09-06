SELECT price_timestamp as "timestamp",
    spot_price as "value"
FROM gro."LBP_PRICE"
ORDER BY price_timestamp;