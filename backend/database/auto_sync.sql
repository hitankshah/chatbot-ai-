-- Auto-sync schema updates
-- Apply in Supabase SQL editor before enabling auto-sync

CREATE TABLE IF NOT EXISTS training_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_training_sources_chatbot_id ON training_sources(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_training_sources_next_sync ON training_sources(next_sync_at);

ALTER TABLE trained_content
  ADD COLUMN IF NOT EXISTS training_source_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_trained_content_source'
  ) THEN
    ALTER TABLE trained_content
      ADD CONSTRAINT fk_trained_content_source
      FOREIGN KEY (training_source_id)
      REFERENCES training_sources(id)
      ON DELETE SET NULL;
  END IF;
END$$;
