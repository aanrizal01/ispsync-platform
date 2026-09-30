-- Migration Down: 000005 — Plan, Pricing, Subscription, Access Account Domain

ALTER TABLE customer_devices DROP CONSTRAINT IF EXISTS fk_customer_devices_access_account;

DROP TABLE IF EXISTS access_accounts;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS plan_prices;
DROP TABLE IF EXISTS plans;
