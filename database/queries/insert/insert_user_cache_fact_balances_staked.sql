INSERT INTO gro."USER_CACHE_FACT_BALANCES_STAKED" (
        "balance_date",
        "network_id",
        "user_address",
        "pool0_amount",
        "pool1_amount",
        "pool2_amount",
        "pool3_amount",
        "pool4_amount",
        "pool5_amount",
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
        $10
    );