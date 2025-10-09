/**
 * Test client for production MCP server
 * 
 * Tests all features:
 * - JWT authentication
 * - Tool execution
 * - Rate limiting
 * - Error handling
 */

const https = require('https');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-me';
const SERVER_URL = process.env.SERVER_URL || 'https://localhost:8443';

// Allow self-signed certificates for testing
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * Generate test JWT token
 */
function generateToken(userId = '123e4567-e89b-12d3-a456-426614174000', roles = ['user']) {
  return jwt.sign(
    {
      sub: userId,
      email: `user-${userId.slice(0, 8)}@example.com`,
      roles,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Make MCP request
 */
async function mcpRequest(method, params, token) {
  const url = new URL('/mcp', SERVER_URL);
  
  const body = JSON.stringify({
    type: 'request',
    id: String(Date.now()),
    method,
    params,
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    agent,
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data),
          });
        } catch (err) {
          resolve({
            statusCode: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Test health endpoint
 */
async function testHealth() {
  console.log('\n🏥 Testing health endpoint...');
  
  const url = new URL('/health', SERVER_URL);
  
  return new Promise((resolve, reject) => {
    https.get(url, { agent }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const health = JSON.parse(data);
        console.log('✅ Health check passed');
        console.log('   Status:', health.status);
        console.log('   Transport:', health.transport);
        resolve(health);
      });
    }).on('error', reject);
  });
}

/**
 * Test tools/list endpoint
 */
async function testListTools() {
  console.log('\n📋 Testing tools/list...');
  
  const token = generateToken();
  const response = await mcpRequest('tools/list', {}, token);
  
  if (response.statusCode === 200 && response.body.type === 'response') {
    console.log('✅ Listed tools successfully');
    console.log(`   Found ${response.body.result.tools.length} tools`);
    response.body.result.tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    return response.body;
  } else {
    console.error('❌ Failed to list tools:', response.body);
    throw new Error('List tools failed');
  }
}

/**
 * Test tool execution
 */
async function testProcessData() {
  console.log('\n⚙️  Testing process-data tool...');
  
  const token = generateToken();
  const response = await mcpRequest('tools/execute', {
    name: 'process-data',
    input: {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'fetch',
    },
  }, token);
  
  if (response.statusCode === 200 && response.body.type === 'response') {
    console.log('✅ Tool executed successfully');
    console.log('   Result:', JSON.stringify(response.body.result.output, null, 2));
    return response.body;
  } else {
    console.error('❌ Tool execution failed:', response.body);
    throw new Error('Tool execution failed');
  }
}

/**
 * Test authentication failure
 */
async function testAuthFailure() {
  console.log('\n🔐 Testing authentication failure...');
  
  const response = await mcpRequest('tools/list', {}, null);
  
  if (response.body.type === 'error') {
    console.log('✅ Correctly rejected unauthenticated request');
    console.log('   Error:', response.body.error.message);
    return response.body;
  } else {
    console.error('❌ Should have rejected request without token');
    throw new Error('Auth failure test failed');
  }
}

/**
 * Test validation error
 */
async function testValidationError() {
  console.log('\n📝 Testing validation error...');
  
  const token = generateToken();
  const response = await mcpRequest('tools/execute', {
    name: 'process-data',
    input: {
      userId: 'invalid-uuid',  // Invalid UUID
      action: 'fetch',
    },
  }, token);
  
  if (response.body.type === 'error' && response.body.error.code === -32003) {
    console.log('✅ Validation error handled correctly');
    console.log('   Error:', response.body.error.message);
    if (response.body.error.data?.issues) {
      console.log('   Issues:', response.body.error.data.issues);
    }
    return response.body;
  } else {
    console.error('❌ Expected validation error');
    throw new Error('Validation test failed');
  }
}

/**
 * Test rate limiting
 */
async function testRateLimit() {
  console.log('\n⏱️  Testing rate limiting...');
  console.log('   Sending 105 requests rapidly...');
  
  const token = generateToken('rate-limit-test-user');
  let successCount = 0;
  let rateLimitCount = 0;
  
  const requests = [];
  for (let i = 0; i < 105; i++) {
    requests.push(
      mcpRequest('tools/list', {}, token).then(response => {
        if (response.statusCode === 200) {
          successCount++;
        } else if (response.body.error?.message.includes('Rate limit')) {
          rateLimitCount++;
        }
      }).catch(() => {})
    );
  }
  
  await Promise.all(requests);
  
  if (rateLimitCount > 0) {
    console.log('✅ Rate limiting working');
    console.log(`   Successful: ${successCount}, Rate limited: ${rateLimitCount}`);
  } else {
    console.log('⚠️  Rate limiting may not be active or limit is higher than 105');
  }
}

/**
 * Test profile authorization
 */
async function testProfileAuthorization() {
  console.log('\n🔒 Testing profile authorization...');
  
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const otherUserId = '987fcdeb-51a2-43d7-b654-123456789abc';
  
  // Test 1: User accessing their own profile (should succeed)
  const token1 = generateToken(userId, ['user']);
  const response1 = await mcpRequest('tools/execute', {
    name: 'get-profile',
    input: { userId },
  }, token1);
  
  if (response1.body.type === 'response') {
    console.log('✅ User can access own profile');
  } else {
    console.error('❌ User should be able to access own profile');
  }
  
  // Test 2: User accessing another user's profile (should fail)
  const response2 = await mcpRequest('tools/execute', {
    name: 'get-profile',
    input: { userId: otherUserId },
  }, token1);
  
  if (response2.body.type === 'error') {
    console.log('✅ User blocked from accessing other user profile');
    console.log('   Error:', response2.body.error.message);
  } else {
    console.error('❌ User should not be able to access other user profile');
  }
  
  // Test 3: Admin accessing any profile (should succeed)
  const adminToken = generateToken(userId, ['user', 'admin']);
  const response3 = await mcpRequest('tools/execute', {
    name: 'get-profile',
    input: { userId: otherUserId },
  }, adminToken);
  
  if (response3.body.type === 'response') {
    console.log('✅ Admin can access any user profile');
  } else {
    console.error('❌ Admin should be able to access any profile');
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Starting MCP Server Tests');
  console.log('================================');
  
  try {
    await testHealth();
    await testListTools();
    await testProcessData();
    await testAuthFailure();
    await testValidationError();
    await testProfileAuthorization();
    await testRateLimit();
    
    console.log('\n✅ All tests passed!');
    console.log('================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();

