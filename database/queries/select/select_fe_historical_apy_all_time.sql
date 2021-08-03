-- dates by parameter must follow format 'MM/DD/YYYY'
SELECT apy."current_timestamp",
    apy."current_date",
    apy."network_id",
    apy."apy_monthly"
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
        from date $2
    )
ORDER BY apy."current_timestamp" DESC;