-- SELECT t.max_transfer_date,
--     a.max_approval_date
-- FROM (
--         SELECT MAX(target_date) as max_transfer_date
--         FROM gro."SYS_TABLE_LOADS"
--         WHERE table_name = 'USER_TRANSFERS'
--     ) t,
--     (
--         SELECT MAX(target_date) as max_approval_date
--         FROM gro."SYS_TABLE_LOADS"
--         WHERE table_name = 'USER_APPROVALS'
--     ) a;
SELECT MAX(balance_date) as max_balance_date
FROM gro."USER_BALANCES"
WHERE user_address = $1;