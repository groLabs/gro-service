DELETE FROM gro."USER_STD_FACT_BALANCES_STAKED"
WHERE date(balance_date) >= $1
AND date(balance_date) <= $2;