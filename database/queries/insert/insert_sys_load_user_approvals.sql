INSERT INTO gro."SYS_TABLE_LOADS" (
		table_name,
		network_id,
		target_date,
		records_loaded,
		creation_date
	)
SELECT $1 as table_name,
	a.network_id as network_id,
	date_trunc('day', a.approval_date) + '23:59:59',
	count(1) as records_loaded,
	$4 as creation_date
-- FROM gro."USER_APPROVALS" a
FROM gro."USER_STD_FACT_APPROVALS" a
WHERE date(a.approval_date) BETWEEN $2 AND $3
GROUP BY a.network_id,
	date_trunc('day', a.approval_date) + '23:59:59';