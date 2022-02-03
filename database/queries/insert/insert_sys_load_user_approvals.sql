INSERT INTO gro."SYS_USER_LOADS" (
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
	$3 as creation_date
FROM gro."USER_APPROVALS" a
WHERE date(a.approval_date) = $2
	AND a.network_id = ANY($4::integer [])
GROUP BY a.network_id,
	date_trunc('day', a.approval_date) + '23:59:59';