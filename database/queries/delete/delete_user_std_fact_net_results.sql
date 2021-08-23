-- DELETE FROM gro."USER_NET_RETURNS"
DELETE FROM gro."USER_STD_FACT_NET_RESULTS"
WHERE date(balance_date) >= $1
AND date(balance_date) <= $2;