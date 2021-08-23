
-- @notice: any change here should be also applied to 'select_distinct_blocks_tmp_transfers.sql'
SELECT dw.block_number
FROM (
        SELECT DISTINCT d.block_number as block_number
        --FROM gro."CACHE_TMP_USER_DEPOSITS" d
        FROM gro."USER_CACHE_TMP_DEPOSITS" d
        UNION
        SELECT DISTINCT w.block_number as block_number
        --FROM gro."CACHE_TMP_USER_WITHDRAWALS" w
        FROM gro."USER_CACHE_TMP_WITHDRAWALS" w
    ) dw
    LEFT OUTER JOIN (
        SELECT b.block_number as block_number
        FROM gro."ETH_BLOCKS" b
    ) b ON dw.block_number = b.block_number
WHERE b.block_number IS NULL;