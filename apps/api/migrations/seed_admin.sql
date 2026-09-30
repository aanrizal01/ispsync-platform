-- Seed: Create default super admin user
-- Run this ONCE after migrations are applied.
-- 
-- Default credentials:
--   Email:    admin@isp.local
--   Password: Admin123456! (CHANGE THIS IMMEDIATELY)
--
-- Password hash below is bcrypt($2a$12$, cost=12) of "Admin123456!"
-- Re-generate with: htpasswd -nbBC 12 "" "Admin123456!" | tr -d ':\n' | sed 's/$apr1$//'
-- Or use: go run ./cmd/api create-admin

DO $$
DECLARE
    v_user_id   UUID;
    v_role_id   UUID;
BEGIN
    -- Skip if admin already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@isp.local') THEN
        RAISE NOTICE 'Admin user already exists, skipping seed.';
        RETURN;
    END IF;

    -- Insert super admin user
    -- NOTE: Replace password_hash with a freshly generated bcrypt hash before production use
    INSERT INTO users (
        email, 
        password_hash, 
        full_name, 
        phone, 
        is_active
    ) VALUES (
        'admin@isp.local',
        '$2a$12$placeholder_replace_with_real_hash_before_running',
        'System Administrator',
        NULL,
        TRUE
    ) RETURNING id INTO v_user_id;

    -- Assign super_admin role
    SELECT id INTO v_role_id FROM roles WHERE slug = 'super_admin';
    
    IF v_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES (v_user_id, v_role_id, v_user_id);
    END IF;

    -- Audit log
    INSERT INTO audit_logs (actor_type, action, entity_type, entity_id, new_values, metadata)
    VALUES (
        'SYSTEM',
        'AdminUserSeeded',
        'User',
        v_user_id::TEXT,
        jsonb_build_object('email', 'admin@isp.local', 'role', 'super_admin'),
        jsonb_build_object('source', 'seed')
    );

    RAISE NOTICE 'Super admin user created with ID: %', v_user_id;
    RAISE NOTICE 'IMPORTANT: Change the password immediately after first login!';
END;
$$;
