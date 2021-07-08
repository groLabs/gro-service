DELETE FROM gro."USER_BALANCES"
WHERE date(balance_date) >= $1
AND date(balance_date) <= $2;