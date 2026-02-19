-- SaaS schema updates (workspaces, billing, usage)
-- Apply in Supabase SQL editor for existing deployments

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS primary_workspace_id UUID;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS twofa_enabled BOOLEAN DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS twofa_secret TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS twofa_verified_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code VARCHAR(50) DEFAULT 'starter',
  plan_id UUID,
  status VARCHAR(50) DEFAULT 'active',
  require_2fa BOOLEAN DEFAULT false,
  sso_enabled BOOLEAN DEFAULT false,
  sso_provider VARCHAR(100),
  sso_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'owner',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  invite_token VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE chatbots
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

CREATE TABLE IF NOT EXISTS billing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  paypal_plan_id VARCHAR(255),
  interval_unit VARCHAR(20) DEFAULT 'month',
  price_cents INTEGER,
  currency VARCHAR(10) DEFAULT 'USD',
  limits JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES billing_plans(id) ON DELETE SET NULL,
  paypal_subscription_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES billing_subscriptions(id) ON DELETE SET NULL,
  paypal_invoice_id VARCHAR(255),
  amount_cents INTEGER,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'open',
  issued_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  messages_count INTEGER DEFAULT 0,
  chatbots_count INTEGER DEFAULT 0,
  pages_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100),
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key_prefix VARCHAR(12) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) DEFAULT 'Default',
  last_used_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_type VARCHAR(50) DEFAULT 'quality',
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users
  ADD CONSTRAINT fk_users_primary_workspace
  FOREIGN KEY (primary_workspace_id)
  REFERENCES workspaces(id)
  ON DELETE SET NULL;

ALTER TABLE workspaces
  ADD CONSTRAINT fk_workspaces_plan
  FOREIGN KEY (plan_id)
  REFERENCES billing_plans(id)
  ON DELETE SET NULL;
