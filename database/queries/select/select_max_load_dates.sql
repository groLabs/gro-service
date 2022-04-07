-- Criteria changed: shouldn't depend on balance but the latest transfers load
-- SELECT MAX(balance_date) as max_balance_date
-- FROM gro."USER_STD_FACT_BALANCES"
-- WHERE user_address = $1;
SELECT MAX("target_date") as "max_transfer_date"
FROM gro."SYS_USER_LOADS"
WHERE "table_name" = 'USER_TRANSFERS';