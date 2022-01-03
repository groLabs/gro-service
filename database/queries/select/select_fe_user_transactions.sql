SELECT tt."transfer_id" as "transfer_id",
    tt."token_id" as "token_id",
    tt."token" as "token",
    tt."hash" as "hash",
    tt."timestamp"::text as "timestamp",
    tt."coin_amount" as "coin_amount",
    tt."usd_amount" as "usd_amount",
    tt."block_number"::text as "block_number"
FROM (
        SELECT t."transfer_id" as "transfer_id",
            t."token_id" as "token_id",
            tok."name" as "token",
            t."tx_hash" as "hash",
            t."block_timestamp" as "timestamp",
            abs(t."amount") as "coin_amount",
            abs(t."value") as "usd_amount",
            t."block_number" as "block_number"
        FROM gro."USER_TRANSFERS" t
            LEFT JOIN gro."MD_TOKENS" tok ON t."token_id" = tok."token_id"
        WHERE t."user_address" = $1
        AND t."token_id" NOT IN (0,3)
        UNION ALL
        SELECT t."transfer_id" as "transfer_id",
            t."token_id" as "token_id",
            tok."name" as "token",
            t."tx_hash" as "hash",
            t."block_timestamp" as "timestamp",
            abs(t."amount") as "coin_amount",
            abs(t."value") as "usd_amount",
            t."block_number" as "block_number"
        FROM gro."USER_TRANSFERS_CACHE" t
            LEFT JOIN gro."MD_TOKENS" tok ON t."token_id" = tok."token_id"
        WHERE t."user_address" = $1
        AND t."token_id" NOT IN (0,3)
    ) tt;
-- SELECT
-- 	t."transfer_id" as "transfer_id",
-- 	t."token_id" as "token_id",
-- 	tok."name" as "token",
--     t."tx_hash" as "hash",
--     t."block_timestamp"::text as "timestamp",
--     t."amount" as "coin_amount",
--     t."value" as "usd_amount",
--     t."block_number"::text as "block_number"
-- FROM gro."USER_TRANSFERS" t
-- LEFT JOIN gro."MD_TOKENS" tok ON
--   t."token_id" = tok."token_id"
-- WHERE t."user_address" = $1;