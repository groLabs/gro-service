SELECT MAX(balance_date) as max_balance_date
FROM gro."USER_STD_FACT_BALANCES"
WHERE user_address = $1;