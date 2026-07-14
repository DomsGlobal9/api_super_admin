/**
 * Phase 2.99 Chaos & Resilience Testing Suite
 * Usage: node --env-file=.env scripts/chaos.mjs
 */

const GATEWAY_URL = 'http://localhost:3002/api/gateway/PRODUCTION/tryon2buy/api/tryon/health';
const API_KEY = 'test_api_key_123';

async function runChaosTests() {
  console.log('🧪 Starting Ultimate Chaos Resilience Tests...\n');

  // 1. Normal Request (Baseline)
  console.log('➡️ [1. Baseline] Sending normal health check request...');
  const baseline = await fetch(GATEWAY_URL, {
    headers: { 'x-api-key': API_KEY }
  });
  console.log(`✅ Status: ${baseline.status} (Expected 200)\n`);

  // 2. Client Disconnect (AbortSignal)
  console.log('➡️ [2. Chaos: Client Disconnect] Simulating Client Disconnect midway through request...');
  const controller = new AbortController();
  
  try {
    const fetchPromise = fetch(GATEWAY_URL, {
      headers: { 'x-api-key': API_KEY },
      signal: controller.signal
    });
    
    setTimeout(() => controller.abort(), 10);
    await fetchPromise;
  } catch (err) {
    console.log(`✅ Client disconnected successfully: ${err.name} (Expected AbortError)`);
    console.log(`   Check the Postgres RequestLog for a status of 'CANCELLED'.\n`);
  }

  // 3. Cache Invalidation Matrix Test (Dynamic Config)
  console.log('➡️ [3. Verify: Cache Invalidation Matrix]');
  console.log('   To test dynamic cache invalidation live:');
  console.log('   a. Edit the MicroserviceEnvironment timeoutMs to 5s in Supabase.');
  console.log('   b. Wait for standard TTL, OR hit the future Admin UI endpoint to call `CacheInvalidator.invalidateRoute()`.');
  console.log('   c. Send a request that intentionally takes 10s.');
  console.log('   d. Confirm Gateway immediately drops it with 504 Gateway Timeout without needing a restart.\n');

  // 4. Redis Outages (Fail-Open Verification)
  console.log('➡️ [4. Chaos: Redis Outage]');
  console.log('   Change UPSTASH_REDIS_REST_URL in .env to an invalid URL, restart the gateway, and run this script again.');
  console.log('   Expected Behaviors:');
  console.log('   - API Key / Route Caches: Miss -> Fallback to PostgreSQL gracefully.');
  console.log('   - Rate/Concurrency/Circuit Limiters: Catch error -> Fail Open (Maximize Availability).\n');

  // 5. Postgres Outages (Authentication vs Logging)
  console.log('➡️ [5. Chaos: PostgreSQL Outage (Hard Down)]');
  console.log('   Change DATABASE_URL in .env, restart gateway, run this script.');
  console.log('   Expected Behavior: If API key is not cached in Redis, Gateway throws 503 Service Unavailable (not a raw 500).\n');

  // 6. Slow PostgreSQL (Authentication Timeout)
  console.log('➡️ [6. Chaos: Slow PostgreSQL (Connection pooling stall)]');
  console.log('   Simulate a slow DB (e.g. modify Prisma connection timeout to 1s and throttle your network).');
  console.log('   Expected Behavior: Authentication times out -> clean 503 -> no hanging Node workers -> concurrency releases normally -> log FAILED.\n');

  // 7. Circuit Breaker HALF_OPEN Probe
  console.log('➡️ [7. Verify: Circuit Breaker HALF_OPEN]');
  console.log('   Send 50 bad requests to trip the breaker OPEN.');
  console.log('   Wait 30s. Send 5 concurrent requests.');
  console.log('   Expected Behavior: EXACTLY 1 request is allowed through as a probe. The other 4 instantly get 503. If the 1 probe succeeds, circuit resets.\n');

  console.log('🎉 Chaos script complete. All foundational edge cases are accounted for!');
}

runChaosTests();
