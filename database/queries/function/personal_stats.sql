CREATE OR REPLACE FUNCTION gro.personal_stats(addr CHARACTER VARYING (42)) RETURNS TABLE (
        "tx_hash" CHARACTER VARYING (66),
        "block_number" INTEGER,
        "block_timestamp" INTEGER,
        "transaction_id" CHARACTER VARYING (66),
        "contract_address" CHARACTER VARYING (42),
        "from" CHARACTER VARYING (42),
        "to" CHARACTER VARYING (42),
        "token_id" SMALLINT,
        "value" NUMERIC (20, 8),
        "action" CHARACTER VARYING (10)
    ) AS $$ WITH transfers AS (
        SELECT tra."transaction_id" AS "transaction_id",
            tra."contract_address" AS "contract_address",
            tra."from" AS "from",
            tra."to" AS "to",
            tra."token_id" AS "token_id",
            tra."value" AS "value",
            'transfer' AS "action"
        FROM gro."EV_TRANSFERS" as tra
        WHERE "addr" IN (tra."from", tra."to")
    ),
    deposits AS (
        SELECT dep."transaction_id" AS "transaction_id",
            dep."contract_address" AS "contract_address",
            dep."from" AS "from",
            dep."contract_address" as "to",
            dep."token_id" AS "token_id",
            dep."amount" AS "value",
            'deposit' AS "action"
        FROM gro."EV_LAB_DEPOSITS" as dep
        WHERE "addr" IN (dep."from")
    ),
    withdrawals AS (
        SELECT wit."transaction_id" AS "transaction_id",
            wit."contract_address" AS "contract_address",
            wit."contract_address" as "from",
            wit."from" as "to",
            wit."token_id" AS "token_id",
            wit."shares" AS "value",
            'withdrawal' AS "action"
        FROM gro."EV_LAB_WITHDRAWALS" as wit
        WHERE "addr" IN (wit."from")
    ),
    approvals AS (
        SELECT app."transaction_id" AS "transaction_id",
            app."contract_address" AS "contract_address",
            app."owner" as "from",
            app."spender" as "to",
            app."token_id" AS "token_id",
            app."value" AS "value",
            'approval' AS "action"
        FROM gro."EV_APPROVALS" as app
        WHERE "addr" IN (app."owner")
    )
SELECT txs."tx_hash",
    txs."block_number",
    txs."block_timestamp",
    pos."transaction_id",
    pos."contract_address",
    pos."from",
    pos."to",
    pos."token_id",
    pos."value",
    pos."action"
FROM (
        SELECT *
        FROM transfers
        UNION ALL
        SELECT *
        FROM deposits
        UNION ALL
        SELECT *
        FROM withdrawals
        UNION ALL
        SELECT *
        FROM approvals
    ) pos
    LEFT JOIN gro."EV_TRANSACTIONS" as txs ON pos."transaction_id" = txs."transaction_id";
$$ LANGUAGE SQL;