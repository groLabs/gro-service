DELETE FROM gro."USER_NET_RETURNS"
WHERE date("balance_date") >= $1
AND date("balance_date") <= $2;