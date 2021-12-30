-- @notice: any change here should be also applied to 'select_distinct_blocks_tmp_transfers.sql'
SELECT dw."block_number",
    dw."network_id"
FROM (
        SELECT DISTINCT d."block_number" as "block_number",
            d."network_id" as "network_id"
        FROM gro."USER_DEPOSITS_CACHE" d
        UNION
        SELECT DISTINCT w."block_number" as "block_number",
            w."network_id" as "network_id"
        FROM gro."USER_WITHDRAWALS_CACHE" w
    ) dw
    LEFT OUTER JOIN (
        SELECT b."block_number" as "block_number",
            b."network_id" as "network_id"
        FROM gro."ETH_BLOCKS" b
    ) b ON dw."block_number" = b."block_number"
    and dw."network_id" = b."network_id"
WHERE b."block_number" IS NULL
    and b."network_id" IS NULL;