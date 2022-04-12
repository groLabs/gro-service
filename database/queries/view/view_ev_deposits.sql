CREATE VIEW gro."V_EV_DEPOSITS" AS
SELECT d."log_index" AS "log_index",
    d."transaction_id" AS "transaction_id",
    d."contract_address" AS "contract_address",
    d."log_name" AS "log_name",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    coalesce(tx."uncled", false) AS "uncled",
    d."token_id" AS "token_id",
    coalesce(tok."name", 'unknown') AS "token_name",
    d."from" AS "from",
    coalesce(
        d."referral",
        '0x0000000000000000000000000000000000000000'
    ) AS "referral",
    d."pid" AS "pid",
    coalesce(d."allowance", 0) AS "allowance",
    coalesce(d."amount1", 0) AS "amount1",
    coalesce(d."amount2", 0) AS "amount2",
    coalesce(d."amount3", 0) AS "amount3",
    coalesce(d."value", 0) AS "value"
FROM gro."EV_DEPOSITS" d
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON dep."transaction_id" = tx."transaction_id"
    LEFT JOIN gro."MD_TOKENS" tok ON dep."token_id" = tok."token_id";