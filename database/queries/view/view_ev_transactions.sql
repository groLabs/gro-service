CREATE VIEW gro."V_EV_TRANSACTIONS" AS
SELECT t."transaction_id" AS "transaction_id",
    t."block_number" AS "block_number",
    t."block_timestamp" AS "block_timestamp",
    t."block_date" AS "block_date",
    t."network_id" AS "network_id",
    t."tx_hash" AS "tx_hash",
    t."block_hash" AS "block_hash",
    coalesce(t."uncled",false) AS "uncled"
FROM gro."EV_TRANSACTIONS" t;