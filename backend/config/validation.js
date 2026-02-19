const logger = require('./logger');

const REQUIRED_VARS = [
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
];

const PLACEHOLDER_PATTERNS = [
  'your-project',
  'your-anon-key',
  'your-service-role-key',
  'your-super-secret-jwt-key',
  'sk-ant-your-key-here',
  'sk-your-openai-key-here',
];

function validateEnvironment() {
  logger.info('Validating environment configuration...');

  const errors = [];

  REQUIRED_VARS.forEach((varName) => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      errors.push(`${varName} is required and not set`);
    }
  });

  const isDemoMode = process.env.DEMO_MODE === 'true';
  if (isDemoMode) {
    errors.push('DEMO_MODE=true is not allowed in this production configuration. Set DEMO_MODE=false');
  }

  REQUIRED_VARS.forEach((varName) => {
    const value = process.env[varName] || '';
    if (PLACEHOLDER_PATTERNS.some((pattern) => value.includes(pattern))) {
      errors.push(`${varName} still contains a placeholder value`);
    }
  });

  // Log results
  if (errors.length > 0) {
    logger.error('❌ Environment validation failed', {
      errors,
      count: errors.length,
    });
    errors.forEach((err) => logger.error(`  - ${err}`));
    throw new Error('Environment validation failed');
  }

  logger.info('✅ Environment configuration is valid');

  // Log key configuration
  logger.info('Configuration Summary', {
    nodeEnv: process.env.NODE_ENV || 'development',
    demoMode: false,
    port: process.env.PORT || 3000,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    logLevel: process.env.LOG_LEVEL || 'debug',
    vectorDb: 'supabase-pgvector',
  });
}

module.exports = {
  validateEnvironment,
};
