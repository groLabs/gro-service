DELETE FROM gro."USER_NET_RETURNS"
WHERE TO_CHAR(balance_date, 'DD/MM/YYYY') >= $1
AND TO_CHAR(balance_date, 'DD/MM/YYYY') <= $2;