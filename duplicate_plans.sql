DO $$
DECLARE
    target_grp RECORD;
    src_plan RECORD;
    new_plan_id UUID;
BEGIN
    FOR target_grp IN 
        SELECT id, name FROM plan_groups 
        WHERE id != 'b0000003-0000-0000-0000-000000000002'
        ORDER BY code
    LOOP
        FOR src_plan IN 
            SELECT p.*, pp.monthly_price, pp.installation_fee, pp.activation_fee, pp.tax_percent, pp.late_fee_percent
            FROM plans p
            JOIN plan_prices pp ON p.id = pp.plan_id
            WHERE p.group_id = 'b0000003-0000-0000-0000-000000000002'
            ORDER BY p.download_kbps
        LOOP
            new_plan_id := gen_random_uuid();
            
            INSERT INTO plans (
                id, name, description, plan_type, download_kbps, upload_kbps,
                billing_cycle, grace_period_days, status, group_id, package_group,
                is_visible, created_at, updated_at
            ) VALUES (
                new_plan_id, src_plan.name, src_plan.description, src_plan.plan_type,
                src_plan.download_kbps, src_plan.upload_kbps, src_plan.billing_cycle,
                src_plan.grace_period_days, src_plan.status, target_grp.id, target_grp.name,
                src_plan.is_visible, now(), now()
            );

            INSERT INTO plan_prices (
                id, plan_id, monthly_price, installation_fee, activation_fee,
                tax_percent, late_fee_percent, currency, effective_from, created_at
            ) VALUES (
                gen_random_uuid(), new_plan_id, src_plan.monthly_price, src_plan.installation_fee,
                src_plan.activation_fee, src_plan.tax_percent, src_plan.late_fee_percent,
                'IDR', now(), now()
            );
        END LOOP;
    END LOOP;
END $$;
