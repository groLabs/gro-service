SELECT aa."block_number" as "block_number",
    aa."timestamp" as "timestamp",
    aa."hash" as "hash",
    aa."network_id" as "network_id",
    aa."spender" as "spender",
    aa."coin_amount" as "coin_amount",
    aa."usd_amount" as "usd_amount",
    aa."token_id" as "token_id",
    aa."token" as "token"
FROM (
        SELECT a."block_number" as "block_number",
            a."block_timestamp" as "timestamp",
            a."tx_hash" as "hash",
            a."network_id" as "network_id",
            a."spender_address" as "spender",
            a."amount" as "coin_amount",
            a."value" as "usd_amount",
            a."token_id" as "token_id",
            a."version_id" as "version_id",
            tok."name" as "token"
        FROM gro."USER_APPROVALS" a
            LEFT JOIN gro."MD_TOKENS" tok ON a."token_id" = tok."token_id"
        WHERE a."sender_address" = $1
            AND a."token_id" IN (1, 2, 4, 5, 6)
        UNION ALL
        SELECT ac."block_number" as "block_number",
            ac."block_timestamp" as "timestamp",
            ac."tx_hash" as "hash",
            ac."network_id" as "network_id",
            ac."spender_address" as "spender",
            ac."amount" as "coin_amount",
            ac."value" as "usd_amount",
            ac."token_id" as "token_id",
            ac."version_id" as "version_id",
            tok."name" as "token"
        FROM gro."USER_APPROVALS_CACHE" ac
            LEFT JOIN gro."MD_TOKENS" tok ON ac."token_id" = tok."token_id"
        WHERE ac."sender_address" = $1
            AND ac."token_id" IN (1, 2, 4, 5, 6)
    ) aa;