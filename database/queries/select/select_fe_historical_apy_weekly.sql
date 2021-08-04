-- dates by parameter must follow format 'MM/DD/YYYY'
SELECT apy."current_timestamp",
    apy."current_date",
    apy."network_id",
    apy."product_id",
    apy."apy_last7d",
    apy."apy_last24h",
    apy."apy_daily",
    apy."apy_weekly",
    apy."apy_monthly",
    apy."apy_all_time",
    apy."apy_current"
FROM gro."PROTOCOL_APY" apy,
    (
        SELECT max(ts."current_timestamp") as ts,
            dates.days
        FROM gro."PROTOCOL_APY" ts,
            (
                SELECT DISTINCT(TO_CHAR("current_date", 'DD/MM/YYYY')) as "days"
                FROM gro."PROTOCOL_APY"
                WHERE date("current_date") BETWEEN $1 AND $2
            ) dates
        WHERE TO_CHAR(ts."current_date", 'DD/MM/YYYY') = dates.days
        GROUP BY dates.days
    ) max_ts
WHERE apy."current_timestamp" = max_ts.ts
    AND extract(
        isodow
        from "current_date"
    ) = extract(
        isodow
        from $2
    )
ORDER BY apy."current_timestamp" DESC;