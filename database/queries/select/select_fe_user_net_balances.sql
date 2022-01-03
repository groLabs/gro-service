SELECT b."pwrd_unstaked_amount" * tp."pwrd_value" as "pwrd",
    b."gvt_unstaked_amount" * tp."gvt_value" as "gvt",
    b."gro_total_amount" as "gro_balance_combined",
    b."usdc_e_amount" * tp."usdc_e_value" as "usdc_e",
    b."usdt_e_amount" * tp."usdt_e_value" as "usdt_e",
    b."dai_e_amount" * tp."dai_e_value" as "dai_e"
FROM gro."USER_BALANCES_CACHE" b,
    (
        SELECT "gvt_value",
            "pwrd_value",
            "usdc_e_value",
            "usdt_e_value",
            "dai_e_value"
        FROM gro."TOKEN_PRICE"
        LIMIT 1
    ) tp
WHERE b.user_address = $1;