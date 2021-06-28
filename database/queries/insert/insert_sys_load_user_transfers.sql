INSERT INTO gro."SYS_TABLE_LOADS" (
		table_name,
		network_id,
		target_date,
		records_loaded,
		creation_date
	)
SELECT $1 as table_name,
	t.network_id as network_id,
	date_trunc('day', t.transfer_date) + '23:59:59',
	count(1) as records_loaded,
	$4 as creation_date
FROM gro."USER_TRANSFERS" t
WHERE date(t.transfer_date) BETWEEN $2 AND $3
GROUP BY t.network_id,
	date_trunc('day', t.transfer_date) + '23:59:59';