SELECT CASE
        WHEN a.stablecoin_id = 0 THEN 'DAI'
        WHEN a.stablecoin_id = 1 THEN 'USDC'
        ELSE 'USDT'
    END as "token",
    a.tx_hash as "hash",
    a.spender_address as "spender",
    a.block_timestamp as "timestamp",
    a.coin_amount as "coin_amount",
    a.coin_value as "usd_amount",
    a.block_number as "block_number"
FROM gro."USER_APPROVALS" a
WHERE a.sender_address = $1
AND TO_CHAR(a.approval_date, 'DD/MM/YYYY') <= $2;