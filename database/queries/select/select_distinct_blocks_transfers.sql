SELECT DISTINCT dw.block_number
FROM (
        SELECT d.block_number
        FROM gro."TMP_USER_DEPOSITS" d
        UNION ALL
        SELECT w.block_number
        FROM gro."TMP_USER_WITHDRAWALS" w
    ) dw;