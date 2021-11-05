CREATE OR REPLACE VIEW gro."USER_STD_FACT_V_BALANCES_UNSTAKED" AS
SELECT bal."balance_date",
    bal."user_address",
    bal."network_id",
    bal."gvt_amount" as "gvt_amount",
    bal."pwrd_amount" as "pwrd_amount",
    bal."gro_amount" as "gro_amount",
    bal."gvt_amount" * pri."gvt_value" as "gvt_value",
    bal."pwrd_amount" * pri."pwrd_value" as "pwrd_value",
    bal."gro_amount" * pri."gro_value" as "gro_value"
FROM gro."USER_STD_FACT_BALANCES_UNSTAKED" bal
    LEFT JOIN gro."TOKEN_PRICE" pri ON bal."balance_date" = pri."price_date";