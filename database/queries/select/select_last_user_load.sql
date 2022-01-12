SELECT MAX("target_date") as "max_user_date"
FROM gro."SYS_USER_LOADS"
WHERE table_name = 'USER_TRANSFERS';