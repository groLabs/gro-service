-- @notice: any change here should be also applied to 'select_distinct_blocks_tmp_approvals.sql'
SELECT a.block_number
FROM (
        SELECT DISTINCT block_number as block_number
        FROM gro."USER_APPROVALS_TMP_CACHE"
    ) a
    LEFT OUTER JOIN (
        SELECT b.block_number as block_number
        FROM gro."ETH_BLOCKS" b
    ) b ON a.block_number = b.block_number
WHERE b.block_number IS NULL;