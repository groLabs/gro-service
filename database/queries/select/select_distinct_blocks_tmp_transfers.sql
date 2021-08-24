SELECT dw.block_number
FROM (
        SELECT DISTINCT d.block_number as block_number
        FROM gro."USER_STD_TMP_DEPOSITS" d
        UNION
        SELECT DISTINCT w.block_number as block_number
        FROM gro."USER_STD_TMP_WITHDRAWALS" w
    ) dw
    LEFT OUTER JOIN (
        SELECT b.block_number as block_number
        FROM gro."ETH_BLOCKS" b
    ) b ON dw.block_number = b.block_number
WHERE b.block_number IS NULL;