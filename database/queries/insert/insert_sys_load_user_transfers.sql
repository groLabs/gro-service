INSERT INTO gro."SYS_USER_LOADS" (
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
	$3 as creation_date
FROM gro."USER_TRANSFERS" t
WHERE date(t.transfer_date) = $2
GROUP BY t.network_id,
	date_trunc('day', t.transfer_date) + '23:59:59';