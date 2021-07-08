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
UNION ALL
SELECT CASE
        WHEN ca.stablecoin_id = 0 THEN 'DAI'
        WHEN ca.stablecoin_id = 1 THEN 'USDC'
        ELSE 'USDT'
    END as "token",
    ca.tx_hash as "hash",
    ca.spender_address as "spender",
    ca.block_timestamp as "timestamp",
    ca.coin_amount as "coin_amount",
    ca.coin_value as "usd_amount",
    ca.block_number as "block_number"
FROM gro."CACHE_USER_APPROVALS" ca
WHERE ca.sender_address = $1;