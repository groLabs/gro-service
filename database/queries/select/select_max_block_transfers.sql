SELECT max(dw."block_number") as "max_block_number"
FROM (
        SELECT d."block_number"
        FROM gro."USER_DEPOSITS_TMP" d
        UNION ALL
        SELECT w."block_number"
        FROM gro."USER_WITHDRAWALS_TMP" w
    ) dw;