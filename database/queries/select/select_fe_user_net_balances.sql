SELECT b."pwrd_unstaked_amount" * tp."pwrd_value" as "pwrd",
    b."gvt_unstaked_amount" * tp."gvt_value" as "gvt",
    b."gro_total_amount" as "gro_balance_combined",
    b."usdc_e_1_0_amount" * tp."usdc_e_1_0_value" as "usdc_e_1_0",
    b."usdt_e_1_0_amount" * tp."usdt_e_1_0_value" as "usdt_e_1_0",
    b."dai_e_1_0_amount" * tp."dai_e_1_0_value" as "dai_e_1_0",
    b."usdc_e_1_5_amount" * tp."usdc_e_1_5_value" as "usdc_e_1_5",
    b."usdt_e_1_5_amount" * tp."usdt_e_1_5_value" as "usdt_e_1_5",
    b."dai_e_1_5_amount" * tp."dai_e_1_5_value" as "dai_e_1_5",
    b."usdc_e_1_6_amount" * tp."usdc_e_1_6_value" as "usdc_e_1_6",
    b."usdt_e_1_6_amount" * tp."usdt_e_1_6_value" as "usdt_e_1_6",
    b."dai_e_1_6_amount" * tp."dai_e_1_6_value" as "dai_e_1_6"
    FROM gro."USER_BALANCES_CACHE" b,
    (
        SELECT "gvt_value",
            "pwrd_value",
            "usdc_e_1_0_value",
            "usdt_e_1_0_value",
            "dai_e_1_0_value",
            "usdc_e_1_5_value",
            "usdt_e_1_5_value",
            "dai_e_1_5_value",
            "usdc_e_1_6_value",
            "usdt_e_1_6_value",
            "dai_e_1_6_value"
        FROM gro."TOKEN_PRICE"
        LIMIT 1
    ) tp
WHERE b.user_address = $1;