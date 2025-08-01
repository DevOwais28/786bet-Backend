#!/usr/bin/env node

/**
 * Backend Troubleshooting Script
 * Tests all critical endpoints and server health
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:4000';
const endpoints = [
  '/health',
  '/api/health',
  '/api/auth/test',
  '/api/auth/verify-email/test123?email=test@example.com',
  '/api/auth/register',
  '/api/auth/login'
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          endpoint,
          status: res.statusCode,
          success: res.statusCode < 400,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        endpoint,
        status: 'ERROR',
        success: false,
        error: err.message
      });
    });

    req.setTimeout(5000);
    req.end();
  });
}

async function runTests() {
  console.log('🔍 Backend Health Check Started...\n');
  
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    const result = await testEndpoint(endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint} - Status: ${result.status}`);
    } else {
      console.log(`❌ ${endpoint} - Status: ${result.status}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }
  
  console.log('🎉 Health check completed!');
}

// Run tests
runTests().catch(console.error);
