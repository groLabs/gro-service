INSERT INTO gro."USER_STD_FACT_BALANCES_POOLED" (
        "balance_date",
        "network_id",
        "user_address",
        "pool1_lp_amount",
        "pool1_gro_amount",
        "pool1_gvt_amount",
        "pool2_lp_amount",
        "pool2_gro_amount",
        "pool2_usdc_amount",
        "pool4_lp_amount",
        "pool4_pwrd_amount",
        "pool5_lp_amount",
        "pool5_gro_amount",
        "pool5_weth_amount",
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
        $13,
        $14,
        $15
    );