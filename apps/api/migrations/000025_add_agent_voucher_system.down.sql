-- Migration Rollback: 000025
ALTER TABLE vouchers 
    DROP COLUMN IF EXISTS agent_commission,
    DROP COLUMN IF EXISTS discount_amount,
    DROP COLUMN IF EXISTS promo_code,
    DROP COLUMN IF EXISTS agent_id;

DROP TABLE IF EXISTS agent_daily_promos;
DROP TABLE IF EXISTS agent_topup_requests;
DROP TABLE IF EXISTS agent_balance_mutations;
DROP TABLE IF EXISTS agents;
