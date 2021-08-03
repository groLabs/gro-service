-- dates by parameter must follow format 'MM/DD/YYYY'
SELECT apy."current_timestamp",
    apy."current_date",
    apy."network_id",
    apy."product_id",
    apy."apy_monthly"
FROM gro."PROTOCOL_APY" apy,
    (
        SELECT max(ts."current_timestamp") as ts,
            dates.days
        FROM gro."PROTOCOL_APY" ts,
            (
                SELECT DISTINCT(TO_CHAR("current_date", 'DD/MM/YYYY')) as "days"
                FROM gro."PROTOCOL_APY"
            ) dates
        WHERE TO_CHAR(ts."current_date", 'DD/MM/YYYY') = dates.days
        GROUP BY dates.days
    ) max_ts
WHERE apy."current_timestamp" = max_ts.ts
ORDER BY apy."current_timestamp" DESC;