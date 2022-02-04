SELECT tt."transfer_id" as "transfer_id",
    tt."token_id" as "token_id",
    tt."token" as "token",
    tt."hash" as "hash",
    tt."version_id" as "version_id",
    tt."timestamp"::text as "timestamp",
    tt."coin_amount" as "coin_amount",
    tt."usd_amount" as "usd_amount",
    tt."block_number"::text as "block_number"
FROM (
        SELECT t."transfer_id" as "transfer_id",
            t."token_id" as "token_id",
            tok."name" as "token",
            t."tx_hash" as "hash",
            t."version_id" as "version_id",
            t."block_timestamp" as "timestamp",
            abs(t."amount") as "coin_amount",
            abs(t."value") as "usd_amount",
            t."block_number" as "block_number"
        FROM gro."USER_TRANSFERS" t
            LEFT JOIN gro."MD_TOKENS" tok ON t."token_id" = tok."token_id"
        WHERE t."user_address" = $1
            AND t."token_id" IN (1, 2, 4, 5, 6)
        UNION ALL
        SELECT tc."transfer_id" as "transfer_id",
            tc."token_id" as "token_id",
            tok."name" as "token",
            tc."tx_hash" as "hash",
            tc."version_id" as "version_id",
            tc."block_timestamp" as "timestamp",
            abs(tc."amount") as "coin_amount",
            abs(tc."value") as "usd_amount",
            tc."block_number" as "block_number"
        FROM gro."USER_TRANSFERS_CACHE" tc
            LEFT JOIN gro."MD_TOKENS" tok ON tc."token_id" = tok."token_id"
        WHERE tc."user_address" = $1
            AND tc."token_id" IN (1, 2, 4, 5, 6)
    ) tt;