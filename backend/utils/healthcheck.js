#!/usr/bin/env node

/**
 * Health Check & Monitoring Utility
 * Run: node backend/utils/healthcheck.js
 * 
 * Checks:
 * - Server health
 * - Database connection
 * - API endpoints
 * - Environment configuration
 */

const http = require('http');
const logger = require('../config/logger');

const SERVER_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const CHECKS = [
  { name: 'Health Check', endpoint: '/api/health', method: 'GET' },
  { name: 'Auth Status', endpoint: '/api/auth/profile', method: 'GET', requiresAuth: true },
  { name: 'Chatbots List', endpoint: '/api/chatbots', method: 'GET', requiresAuth: true },
];

function makeRequest(endpoint, method = 'GET', token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SERVER_URL + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function runHealthChecks() {
  console.log('\n════════════════════════════════════════════════');
  console.log('  🏥 Health Check & Monitoring');
  console.log('════════════════════════════════════════════════\n');

  logger.info('Starting health checks', { serverUrl: SERVER_URL });

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const check of CHECKS) {
    try {
      console.log(`⏳ Checking: ${check.name}...`);
      const result = await makeRequest(check.endpoint, check.method);

      if (result.status >= 200 && result.status < 300) {
        console.log(`  ✅ ${check.name}: OK (${result.status})\n`);
        results.push({
          check: check.name,
          status: 'PASS',
          statusCode: result.status,
        });
        passed++;
      } else {
        console.log(`  ⚠️  ${check.name}: WARNING (${result.status})\n`);
        results.push({
          check: check.name,
          status: 'WARN',
          statusCode: result.status,
        });
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ ${check.name}: FAILED\n     ${err.message}\n`);
      results.push({
        check: check.name,
        status: 'FAIL',
        error: err.message,
      });
      failed++;
      logger.error(`Health check failed: ${check.name}`, { error: err.message });
    }
  }

  // Summary
  console.log('════════════════════════════════════════════════');
  console.log('  📊 Summary');
  console.log('════════════════════════════════════════════════\n');

  console.log(`✅ Passed: ${passed}/${CHECKS.length}`);
  console.log(`❌ Failed: ${failed}/${CHECKS.length}`);
  console.log(`Server: ${SERVER_URL}\n`);

  // Table output
  console.log('Check Results:\n');
  console.table(results);

  // Environment Info
  console.log('\n════════════════════════════════════════════════');
  console.log('  🔧 Environment Configuration');
  console.log('════════════════════════════════════════════════\n');

  const envInfo = {
    NODE_ENV: process.env.NODE_ENV || 'not set',
    MODE: 'production-ready',
    PORT: process.env.PORT || '3000',
    LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
    'Database Configured': process.env.SUPABASE_URL ? 'Yes' : 'No',
    'Claude Configured': process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No',
    'OpenAI Configured': process.env.OPENAI_API_KEY ? 'Yes' : 'No',
  };

  console.table(envInfo);

  // Recommendations
  if (failed > 0) {
    console.log('\n⚠️  Recommendations:\n');
    if (failed === CHECKS.length) {
      console.log('  1. Ensure the server is running (npm start)');
      console.log('  2. Check if port 3000 is already in use');
      console.log('  3. Verify environment variables are set\n');
    } else {
      console.log('  1. Check the logs: tail backend/logs/error.log');
      console.log('  2. Verify API endpoint configuration');
      console.log('  3. Check authentication tokens\n');
    }
  } else {
    console.log('\n✅ All health checks passed!\n');
  }

  logger.info('Health checks completed', {
    passed,
    failed,
    total: CHECKS.length,
  });

  process.exit(failed > 0 ? 1 : 0);
}

// Run checks
runHealthChecks().catch((err) => {
  console.error('❌ Critical error:', err);
  logger.error('Health check failed', { error: err.message });
  process.exit(1);
});
