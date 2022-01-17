INSERT INTO gro."USER_NET_RETURNS_CACHE" (
        "balance_date",
        "network_id",
        "user_address",
        "total_unstaked_value",
        "pwrd_unstaked_value",
        "gvt_unstaked_value",
        "usdc_e_1_0_value",
        "usdt_e_1_0_value",
        "dai_e_1_0_value",
        "usdc_e_1_5_value",
        "usdt_e_1_5_value",
        "dai_e_1_5_value",
        "usdc_e_1_6_value",
        "usdt_e_1_6_value",
        "dai_e_1_6_value",
        "creation_date"
    )
SELECT now()::timestamp as balance_date,
    ub.network_id as network_id,
    ut.user_address as user_address,
    CASE
        WHEN ut.total_unstaked_value IS NULL THEN 0
        ELSE ub.total_unstaked_value - ut.total_unstaked_value
    END as total_unstaked_value,
    CASE
        WHEN ut.pwrd_unstaked_value IS NULL THEN 0
        ELSE ub.pwrd_unstaked_value - ut.pwrd_unstaked_value
    END as pwrd_unstaked_value,
    CASE
        WHEN ut.gvt_unstaked_value IS NULL THEN 0
        ELSE ub.gvt_unstaked_value - ut.gvt_unstaked_value
    END as gvt_unstaked_value,
    --v1.0
    CASE
        WHEN ut.usdc_e_1_0_value IS NULL THEN 0
        ELSE ub.usdc_e_1_0_value - ut.usdc_e_1_0_value
    END as usdc_e_1_0_value,
    CASE
        WHEN ut.usdt_e_1_0_value IS NULL THEN 0
        ELSE ub.usdt_e_1_0_value - ut.usdt_e_1_0_value
    END as usdt_e_1_0_value,
    CASE
        WHEN ut.dai_e_1_0_value IS NULL THEN 0
        ELSE ub.dai_e_1_0_value - ut.dai_e_1_0_value
    END as dai_e_1_0_value,
    --v1.5
    CASE
        WHEN ut.usdc_e_1_5_value IS NULL THEN 0
        ELSE ub.usdc_e_1_5_value - ut.usdc_e_1_5_value
    END as usdc_e_1_5_value,
    CASE
        WHEN ut.usdt_e_1_5_value IS NULL THEN 0
        ELSE ub.usdt_e_1_5_value - ut.usdt_e_1_5_value
    END as usdt_e_1_5_value,
    CASE
        WHEN ut.dai_e_1_5_value IS NULL THEN 0
        ELSE ub.dai_e_1_5_value - ut.dai_e_1_5_value
    END as dai_e_1_5_value,
    --v1.6
    CASE
        WHEN ut.usdc_e_1_6_value IS NULL THEN 0
        ELSE ub.usdc_e_1_6_value - ut.usdc_e_1_6_value
    END as usdc_e_1_6_value,
    CASE
        WHEN ut.usdt_e_1_6_value IS NULL THEN 0
        ELSE ub.usdt_e_1_6_value - ut.usdt_e_1_6_value
    END as usdt_e_1_6_value,
    CASE
        WHEN ut.dai_e_1_6_value IS NULL THEN 0
        ELSE ub.dai_e_1_6_value - ut.dai_e_1_6_value
    END as dai_e_1_6_value,
    now()::timestamp as creation_date
FROM (
        SELECT sum(ctt.total_unstaked_value) as total_unstaked_value,
            sum(ctt.pwrd_unstaked_value) as pwrd_unstaked_value,
            sum(ctt.gvt_unstaked_value) as gvt_unstaked_value,
            sum(ctt.usdc_e_1_0_value) as usdc_e_1_0_value,
            sum(ctt.usdt_e_1_0_value) as usdt_e_1_0_value,
            sum(ctt.dai_e_1_0_value) as dai_e_1_0_value,
            sum(ctt.usdc_e_1_5_value) as usdc_e_1_5_value,
            sum(ctt.usdt_e_1_5_value) as usdt_e_1_5_value,
            sum(ctt.dai_e_1_5_value) as dai_e_1_5_value,
            sum(ctt.usdc_e_1_6_value) as usdc_e_1_6_value,
            sum(ctt.usdt_e_1_6_value) as usdt_e_1_6_value,
            sum(ctt.dai_e_1_6_value) as dai_e_1_6_value,
            ctt.user_address as user_address
        FROM (
                SELECT t.value as total_unstaked_value,
                    CASE
                        WHEN t."token_id" = 1 THEN t."value"
                        ELSE 0
                    END as "pwrd_unstaked_value",
                    CASE
                        WHEN t."token_id" = 2 THEN t."value"
                        ELSE 0
                    END as "gvt_unstaked_value",
                    --v1.0
                    CASE
                        WHEN t."token_id" = 4
                        AND t."version_id" = 1 THEN t."value"
                        ELSE 0
                    END as "usdc_e_1_0_value",
                    CASE
                        WHEN t."token_id" = 5
                        AND t."version_id" = 1 THEN t."value"
                        ELSE 0
                    END as "usdt_e_1_0_value",
                    CASE
                        WHEN t."token_id" = 6
                        AND t."version_id" = 1 THEN t."value"
                        ELSE 0
                    END as "dai_e_1_0_value",
                    --v1.5
                    CASE
                        WHEN t."token_id" = 4
                        AND t."version_id" = 2 THEN t."value"
                        ELSE 0
                    END as "usdc_e_1_5_value",
                    CASE
                        WHEN t."token_id" = 5
                        AND t."version_id" = 2 THEN t."value"
                        ELSE 0
                    END as "usdt_e_1_5_value",
                    CASE
                        WHEN t."token_id" = 6
                        AND t."version_id" = 2 THEN t."value"
                        ELSE 0
                    END as "dai_e_1_5_value",
                    --v1.6
                    CASE
                        WHEN t."token_id" = 4
                        AND t."version_id" = 3 THEN t."value"
                        ELSE 0
                    END as "usdc_e_1_6_value",
                    CASE
                        WHEN t."token_id" = 5
                        AND t."version_id" = 3 THEN t."value"
                        ELSE 0
                    END as "usdt_e_1_6_value",
                    CASE
                        WHEN t."token_id" = 6
                        AND t."version_id" = 3 THEN t."value"
                        ELSE 0
                    END as "dai_e_1_6_value",
                    t.user_address as user_address
                FROM gro."USER_TRANSFERS" t
                WHERE t.user_address = $1
                    AND t.token_id IN (1, 2, 4, 5, 6)
                UNION ALL
                SELECT ct.value as total_unstaked_value,
                    CASE
                        WHEN ct."token_id" = 1 THEN ct."value"
                        ELSE 0
                    END as "pwrd_unstaked_value",
                    CASE
                        WHEN ct."token_id" = 2 THEN ct."value"
                        ELSE 0
                    END as "gvt_unstaked_value",
                    --v1.0
                    CASE
                        WHEN ct."token_id" = 4
                        AND ct."version_id" = 1 THEN ct."value"
                        ELSE 0
                    END as "usdc_e_1_0_value",
                    CASE
                        WHEN ct."token_id" = 5
                        AND ct."version_id" = 1 THEN ct."value"
                        ELSE 0
                    END as "usdt_e_1_0_value",
                    CASE
                        WHEN ct."token_id" = 6
                        AND ct."version_id" = 1 THEN ct."value"
                        ELSE 0
                    END as "dai_e_1_0_value",
                    --v1.5
                    CASE
                        WHEN ct."token_id" = 4
                        AND ct."version_id" = 2 THEN ct."value"
                        ELSE 0
                    END as "usdc_e_1_5_value",
                    CASE
                        WHEN ct."token_id" = 5
                        AND ct."version_id" = 2 THEN ct."value"
                        ELSE 0
                    END as "usdt_e_1_5_value",
                    CASE
                        WHEN ct."token_id" = 6
                        AND ct."version_id" = 2 THEN ct."value"
                        ELSE 0
                    END as "dai_e_1_5_value",
                    --v1.6
                    CASE
                        WHEN ct."token_id" = 4
                        AND ct."version_id" = 3 THEN ct."value"
                        ELSE 0
                    END as "usdc_e_1_6_value",
                    CASE
                        WHEN ct."token_id" = 5
                        AND ct."version_id" = 3 THEN ct."value"
                        ELSE 0
                    END as "usdt_e_1_6_value",
                    CASE
                        WHEN ct."token_id" = 6
                        AND ct."version_id" = 3 THEN ct."value"
                        ELSE 0
                    END as "dai_e_1_6_value",
                    ct.user_address as user_address
                FROM gro."USER_TRANSFERS_CACHE" ct
                WHERE ct.user_address = $1
                    AND ct.token_id IN (1, 2, 4, 5, 6)
            ) ctt
        GROUP BY ctt.user_address
    ) ut
    LEFT JOIN (
        SELECT b."pwrd_unstaked_amount" * tp."pwrd_price" + b."gvt_unstaked_amount" * tp."gvt_price" as "total_unstaked_value",
            b."pwrd_unstaked_amount" * tp."pwrd_price" as "pwrd_unstaked_value",
            b."gvt_unstaked_amount" * tp."gvt_price" as "gvt_unstaked_value",
            b."usdc_e_1_0_amount" * tp."usdc_e_1_0_price" as "usdc_e_1_0_value",
            b."usdt_e_1_0_amount" * tp."usdt_e_1_0_price" as "usdt_e_1_0_value",
            b."dai_e_1_0_amount" * tp."dai_e_1_0_price" as "dai_e_1_0_value",
            b."usdc_e_1_5_amount" * tp."usdc_e_1_5_price" as "usdc_e_1_5_value",
            b."usdt_e_1_5_amount" * tp."usdt_e_1_5_price" as "usdt_e_1_5_value",
            b."dai_e_1_5_amount" * tp."dai_e_1_5_price" as "dai_e_1_5_value",
            b."usdc_e_1_6_amount" * tp."usdc_e_1_6_price" as "usdc_e_1_6_value",
            b."usdt_e_1_6_amount" * tp."usdt_e_1_6_price" as "usdt_e_1_6_value",
            b."dai_e_1_6_amount" * tp."dai_e_1_6_price" as "dai_e_1_6_value",
            b."user_address" as "user_address",
            b."balance_date" as "balance_date",
            b."network_id" as "network_id"
        FROM gro."USER_BALANCES_CACHE" b,
            (
                SELECT "gvt_value" as "gvt_price",
                    "pwrd_value" as "pwrd_price",
                    "usdc_e_1_0_value" as "usdc_e_1_0_price",
                    "usdt_e_1_0_value" as "usdt_e_1_0_price",
                    "dai_e_1_0_value" as "dai_e_1_0_price",
                    "usdc_e_1_5_value" as "usdc_e_1_5_price",
                    "usdt_e_1_5_value" as "usdt_e_1_5_price",
                    "dai_e_1_5_value" as "dai_e_1_5_price",
                    "usdc_e_1_6_value" as "usdc_e_1_6_price",
                    "usdt_e_1_6_value" as "usdt_e_1_6_price",
                    "dai_e_1_6_value" as "dai_e_1_6_price"
                FROM gro."TOKEN_PRICE"
                LIMIT 1
            ) tp
        WHERE b."user_address" = $1
    ) ub ON ut.user_address = ub.user_address
    AND ut.user_address = $1;