SELECT a."block_number",
    a."network_id"
FROM (
        SELECT DISTINCT "block_number" as "block_number",
            "network_id" as "network_id"
        FROM gro."USER_APPROVALS_CACHE_TMP"
        WHERE "sender_address" = $1
    ) a
    LEFT OUTER JOIN (
        SELECT b."block_number" as "block_number",
            b."network_id" as "network_id"
        FROM gro."ETH_BLOCKS" b
    ) b ON a."block_number" = b."block_number"
    AND a."network_id" = b."network_id"
WHERE b."block_number" IS NULL
    AND b."network_id" IS NULL;