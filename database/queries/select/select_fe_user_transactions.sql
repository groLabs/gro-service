SELECT CASE
        WHEN t.gvt_value = 0 THEN 'pwrd'
        ELSE 'gvt'
    END as "token",
    t.tx_hash as "hash",
    t.block_timestamp as "timestamp",
    t.usd_value as "usd_amount",
    t.block_number as "block_number"
FROM gro."USER_TRANSFERS" t
WHERE t.user_address = $1
    AND t.transfer_type = $2
    AND TO_CHAR(t.transfer_date, 'DD/MM/YYYY') <= $3; -- is this to_char working properly?