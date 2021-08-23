SELECT b.pwrd_value as "pwrd",
    b.gvt_value as "gvt",
    b.usd_value as "total"
-- FROM gro."CACHE_USER_BALANCES" b
FROM gro."USER_CACHE_FACT_BALANCES" b
WHERE b.user_address = $1;