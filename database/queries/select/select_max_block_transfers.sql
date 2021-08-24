SELECT max(dw.block_number) as "max_block_number"
FROM (
        SELECT d.block_number
        FROM gro."USER_STD_TMP_DEPOSITS" d
        UNION ALL
        SELECT w.block_number
        FROM gro."USER_STD_TMP_WITHDRAWALS" w
    ) dw;