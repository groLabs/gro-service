SELECT DISTINCT t.user_address
-- FROM gro."USER_TRANSFERS" t;
FROM gro."USER_STD_FACT_TRANSFERS" t;

-- SELECT DISTINCT dw.user_address
-- FROM (
-- 		SELECT DISTINCT d.user_address
-- 		FROM gro."TMP_USER_DEPOSITS" d
-- 		UNION ALL
-- 		SELECT DISTINCT w.user_address
-- 		FROM gro."TMP_USER_WITHDRAWALS" w
-- 	) dw;