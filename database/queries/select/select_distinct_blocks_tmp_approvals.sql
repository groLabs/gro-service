SELECT a."block_number",
    a."network_id"
    FROM (
        SELECT DISTINCT "block_number" as "block_number",
            "network_id" as "network_id"
        FROM gro."USER_APPROVALS_TMP"
    ) a
    LEFT OUTER JOIN (
        SELECT b."block_number" as "block_number",
            b."network_id" as "network_id"
        FROM gro."ETH_BLOCKS" b
    ) b ON a."block_number" = b."block_number"
    and a."network_id" = b."network_id"
WHERE b."block_number" IS NULL
    and b."network_id" IS NULL;