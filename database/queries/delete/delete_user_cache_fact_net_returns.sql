-- DELETE FROM gro."CACHE_USER_NET_RETURNS"
DELETE FROM gro."USER_CACHE_FACT_NET_RETURNS"
WHERE user_address = $1;