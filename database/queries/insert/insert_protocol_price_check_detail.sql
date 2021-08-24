INSERT INTO gro."PROTOCOL_PRICE_CHECK_DETAILED" (
   "block_number",
   "block_timestamp",
   "block_date",
   "network_id",
   "stablecoin_pair_id",
   "curve_price",
   "curve_cache_price",
   "curve_cache_diff",
   "curve_cache_check",
   "chainlink_price",
   "curve_chainlink_diff",
   "curve_chainlink_check",
   "creation_date"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13
    );