-- DELETE FROM gro."CACHE_USER_BALANCES"
DELETE FROM gro."USER_CACHE_FACT_BALANCES"
WHERE user_address = $1;