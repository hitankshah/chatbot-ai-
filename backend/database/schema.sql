-- ============================================
-- AI Customer Support Platform - Database Schema
-- PostgreSQL (Supabase)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. USERS TABLE
-- Stores customer (platform user) accounts
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',          -- free, pro, enterprise
  primary_workspace_id UUID,
  twofa_enabled BOOLEAN DEFAULT false,
  twofa_secret TEXT,
  twofa_verified_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast email lookups during login
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- 1B. WORKSPACES + MEMBERSHIPS
-- Multi-tenant organization layer
-- ============================================
CREATE TABLE workspaces (
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

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'owner', -- owner, admin, member
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE workspace_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  invite_token VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_invites_email ON workspace_invites(email);

-- ============================================
-- 2. CHATBOTS TABLE
-- Each user can create multiple chatbots
-- ============================================
CREATE TABLE chatbots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  website_url VARCHAR(500),
  description TEXT,
  welcome_message VARCHAR(500) DEFAULT 'Hi! How can I help you today?',
  primary_color VARCHAR(7) DEFAULT '#007bff',
  status VARCHAR(50) DEFAULT 'active',      -- active, paused, training
  model VARCHAR(100) DEFAULT 'claude-sonnet-4-20250514',
  max_tokens INTEGER DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fetching all chatbots by user
CREATE INDEX idx_chatbots_user_id ON chatbots(user_id);
CREATE INDEX idx_chatbots_workspace_id ON chatbots(workspace_id);
CREATE INDEX idx_chatbots_status ON chatbots(status);

-- ============================================
-- 3. CONVERSATIONS TABLE
-- Each chat session creates a conversation
-- ============================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,          -- Widget-generated session ID
  visitor_ip VARCHAR(45),
  visitor_page_url VARCHAR(500),             -- Which page the visitor is on
  status VARCHAR(50) DEFAULT 'active',       -- active, closed, archived
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fetching conversations by chatbot
CREATE INDEX idx_conversations_chatbot_id ON conversations(chatbot_id);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- ============================================
-- 4. MESSAGES TABLE
-- Individual messages within a conversation
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender VARCHAR(50) NOT NULL,               -- 'user', 'bot', 'agent' (future)
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',   -- text, image, link, system
  metadata JSONB,                             -- Extra data (confidence, sources, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fetching messages in a conversation (ordered)
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ============================================
-- 4B. CONVERSATION_FEEDBACK TABLE
-- Stores quality feedback on chatbot conversations
-- ============================================
CREATE TABLE conversation_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_type VARCHAR(50) DEFAULT 'quality',
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversation_feedback_conversation_id ON conversation_feedback(conversation_id);
CREATE INDEX idx_conversation_feedback_chatbot_id ON conversation_feedback(chatbot_id);

-- ============================================
-- 5. TRAINED_CONTENT TABLE
-- Scraped website content for RAG
-- ============================================
CREATE TABLE trained_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  training_source_id UUID,
  url VARCHAR(500) NOT NULL,
  page_title VARCHAR(500),
  content_text TEXT,                          -- Raw extracted text
  chunk_count INTEGER DEFAULT 0,             -- Number of vector chunks created
  status VARCHAR(50) DEFAULT 'pending',      -- pending, processing, completed, failed
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fetching trained content by chatbot
CREATE INDEX idx_trained_content_chatbot_id ON trained_content(chatbot_id);
CREATE INDEX idx_trained_content_status ON trained_content(status);

-- ============================================
-- 5B. TRAINING_SOURCES TABLE
-- Auto-sync sources and schedules
-- ============================================
CREATE TABLE training_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,           -- url, sitemap, raw_text, file, help_center
  source_url TEXT,
  source_label VARCHAR(255),
  settings JSONB,
  sync_interval_hours INTEGER DEFAULT 168,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  next_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_training_sources_chatbot_id ON training_sources(chatbot_id);
CREATE INDEX idx_training_sources_next_sync ON training_sources(next_sync_at);

ALTER TABLE trained_content
  ADD CONSTRAINT fk_trained_content_source
  FOREIGN KEY (training_source_id)
  REFERENCES training_sources(id)
  ON DELETE SET NULL;

-- ============================================
-- 6. DOCUMENT_CHUNKS TABLE (Supabase pgvector)
-- Stores embedding vectors for semantic retrieval
-- ============================================
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  trained_content_id UUID REFERENCES trained_content(id) ON DELETE SET NULL,
  url VARCHAR(500),
  title VARCHAR(500),
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_document_chunks_chatbot_id ON document_chunks(chatbot_id);
CREATE INDEX idx_document_chunks_created_at ON document_chunks(created_at DESC);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- 7. CHATBOT_INTEGRATIONS TABLE
-- Stores webhook/integration settings per chatbot
-- ============================================
CREATE TABLE chatbot_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL UNIQUE REFERENCES chatbots(id) ON DELETE CASCADE,
  provider VARCHAR(100) DEFAULT 'custom-webhook',  -- custom-webhook, zendesk, intercom
  webhook_url TEXT,
  webhook_secret VARCHAR(255),
  is_active BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chatbot_integrations_chatbot_id ON chatbot_integrations(chatbot_id);
CREATE INDEX idx_chatbot_integrations_active ON chatbot_integrations(is_active);

-- ============================================
-- 8. LEAD_CAPTURES TABLE
-- Stores captured leads from widget interactions
-- ============================================
CREATE TABLE lead_captures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  message TEXT,
  source VARCHAR(50) DEFAULT 'widget',
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lead_captures_chatbot_id ON lead_captures(chatbot_id);
CREATE INDEX idx_lead_captures_created_at ON lead_captures(created_at DESC);
CREATE INDEX idx_lead_captures_status ON lead_captures(status);

-- ============================================
-- 9. HANDOFF_EVENTS TABLE
-- Stores escalation requests to human support
-- ============================================
CREATE TABLE handoff_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  reason TEXT,
  transcript TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, acknowledged, resolved
  external_ticket_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_handoff_events_chatbot_id ON handoff_events(chatbot_id);
CREATE INDEX idx_handoff_events_status ON handoff_events(status);
CREATE INDEX idx_handoff_events_created_at ON handoff_events(created_at DESC);

-- ============================================
-- 10. DAILY_SUMMARIES TABLE
-- Optional persisted daily rollups for reporting
-- ============================================
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  total_escalations INTEGER DEFAULT 0,
  unresolved_escalations INTEGER DEFAULT 0,
  top_user_questions JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chatbot_id, summary_date)
);

CREATE INDEX idx_daily_summaries_chatbot_id ON daily_summaries(chatbot_id);
CREATE INDEX idx_daily_summaries_summary_date ON daily_summaries(summary_date DESC);

-- ============================================
-- 11. JOB_QUEUE + DEAD_LETTER_JOBS
-- Reliability primitives for retries and monitoring
-- ============================================
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID REFERENCES chatbots(id) ON DELETE SET NULL,
  job_type VARCHAR(100) NOT NULL,
  payload JSONB,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  run_after TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE dead_letter_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type VARCHAR(100) NOT NULL,
  payload JSONB,
  error_message TEXT,
  source VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID REFERENCES chatbots(id) ON DELETE SET NULL,
  provider VARCHAR(100),
  webhook_url TEXT,
  event_type VARCHAR(100),
  status VARCHAR(50), -- delivered, failed
  status_code INTEGER,
  attempt_count INTEGER DEFAULT 1,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_queue_status_run_after ON job_queue(status, run_after);
CREATE INDEX idx_dead_letter_jobs_created_at ON dead_letter_jobs(created_at DESC);
CREATE INDEX idx_webhook_delivery_logs_created_at ON webhook_delivery_logs(created_at DESC);

-- ============================================
-- 12. BILLING + USAGE
-- PayPal subscriptions, invoices, and metering
-- ============================================
CREATE TABLE billing_plans (
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

CREATE TABLE billing_subscriptions (
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

CREATE TABLE billing_invoices (
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

CREATE TABLE usage_counters (
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

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100),
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_billing_plans_code ON billing_plans(plan_code);
CREATE INDEX idx_billing_subscriptions_workspace ON billing_subscriptions(workspace_id);
CREATE INDEX idx_billing_invoices_workspace ON billing_invoices(workspace_id);
CREATE INDEX idx_usage_counters_workspace ON usage_counters(workspace_id);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);

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

-- ============================================
-- RPC: match_document_chunks
-- Semantic similarity search for chatbot context retrieval
-- ============================================
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding VECTOR(1536),
  match_count INT,
  filter_chatbot_id UUID
)
RETURNS TABLE (
  id UUID,
  chatbot_id UUID,
  url VARCHAR,
  title VARCHAR,
  content TEXT,
  similarity FLOAT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    dc.id,
    dc.chatbot_id,
    dc.url,
    dc.title,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.chatbot_id = filter_chatbot_id
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================
-- 12. API_KEYS TABLE (Future - for API access)
-- ============================================
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key_prefix VARCHAR(12) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) DEFAULT 'Default',
  last_used_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_workspace_id ON api_keys(workspace_id);

-- ============================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chatbots_updated_at
  BEFORE UPDATE ON chatbots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chatbot_integrations_updated_at
  BEFORE UPDATE ON chatbot_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_plans_updated_at
  BEFORE UPDATE ON billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_subscriptions_updated_at
  BEFORE UPDATE ON billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_counters_updated_at
  BEFORE UPDATE ON usage_counters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_queue_updated_at
  BEFORE UPDATE ON job_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (Supabase)
-- Ensures users can only access their own data
-- ============================================
ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE trained_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own chatbots
CREATE POLICY "Users can manage own chatbots"
  ON chatbots FOR ALL
  USING (user_id = auth.uid());

-- Policy: Users can see conversations for their chatbots
CREATE POLICY "Users can view own conversations"
  ON conversations FOR ALL
  USING (chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid()));

-- Policy: Users can see messages for their conversations
CREATE POLICY "Users can view own messages"
  ON messages FOR ALL
  USING (conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN chatbots b ON c.chatbot_id = b.id
    WHERE b.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own feedback"
  ON conversation_feedback FOR ALL
  USING (chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own document chunks"
  ON document_chunks FOR ALL
  USING (chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own chatbot integrations"
  ON chatbot_integrations FOR ALL
  USING (chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own leads"
  ON lead_captures FOR ALL
  USING (chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own handoffs"
  ON handoff_events FOR ALL
  USING (chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own daily summaries"
  ON daily_summaries FOR ALL
  USING (chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own job queue"
  ON job_queue FOR ALL
  USING (chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own webhook logs"
  ON webhook_delivery_logs FOR ALL
  USING (chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid()));
