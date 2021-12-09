INSERT INTO gro."USER_STD_FACT_BALANCES" (
        "balance_date",
        "network_id",
        "user_address",
        "gvt_unstaked_amount",
        "pwrd_unstaked_amount",
        "gro_unstaked_amount",
        "gro_total_amount",
        "pool0_lp_staked_amount",
        "pool1_lp_pooled_amount",
        "pool1_lp_staked_amount",
        "pool1_gvt_amount",
        "pool1_gro_amount",
        "pool2_lp_pooled_amount",
        "pool2_lp_staked_amount",
        "pool2_gro_amount",
        "pool2_usdc_amount",
        "pool3_lp_staked_amount",
        "pool4_lp_pooled_amount",
        "pool4_lp_staked_amount",
        "pool4_pwrd_amount",
        "pool5_lp_pooled_amount",
        "pool5_lp_staked_amount",
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
        $15,
        $16,
        $17,
        $18,
        $19,
        $20,
        $21,
        $22,
        $23,
        $24,
        $25
    );