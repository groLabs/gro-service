CREATE OR REPLACE VIEW gro."USER_STD_FACT_V_BALANCES_UNSTAKED" AS
SELECT bal."balance_date",
    bal."user_address",
    bal."network_id",
    bal."gvt_unstaked_amount" as "gvt_unstaked_amount",
    bal."pwrd_unstaked_amount" as "pwrd_unstaked_amount",
    bal."gro_unstaked_amount" as "gro_unstaked_amount",
    bal."gvt_unstaked_amount" * pri."gvt_value" as "gvt_unstaked_value",
    bal."pwrd_unstaked_amount" * pri."pwrd_value" as "pwrd_unstaked_value",
    bal."gro_unstaked_amount" * pri."gro_value" as "gro_unstaked_value"
FROM gro."USER_STD_FACT_BALANCES" bal
    LEFT JOIN gro."TOKEN_PRICE" pri ON bal."balance_date" = pri."price_date";