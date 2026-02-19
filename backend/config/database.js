// backend/config/database.js
// PostgreSQL connection via Supabase client

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let supabase = null;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const hasValidCredentials =
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project') &&
  supabaseKey !== 'your-service-role-key';

if (hasValidCredentials) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err.message);
    supabase = null;
  }
} else {
  console.warn('Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
}

/**
 * Test database connection
 * Call this on server startup to verify DB is reachable
 */
async function testConnection() {
  if (!supabase) {
    console.warn('Supabase not initialized — skipping DB connection test');
    return false;
  }

  try {
    const { error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      console.error('Database connection issue:', error.message);
      return false;
    }
    console.log('✅ Database connected successfully');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

module.exports = { supabase, testConnection };
