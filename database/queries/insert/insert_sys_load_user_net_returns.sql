INSERT INTO gro."SYS_USER_LOADS" (
		table_name,
		network_id,
		target_date,
		records_loaded,
		creation_date
	)
SELECT $1 as table_name,
	b.network_id as network_id,
	b.balance_date as target_date,
	count(1) as records_loaded,
	$4 as creation_date
FROM gro."USER_STD_FACT_NET_RETURNS" b
WHERE date(b.balance_date) BETWEEN $2 AND $3
GROUP BY b.network_id,
	b.balance_date;