const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.gsriztjnocjwgqkaxhhz:Tryontobuy%40123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  
  const allTimeRes = await client.query('SELECT COUNT(*) FROM super_admin."RequestLog"');
  const allTimeSuccessRes = await client.query('SELECT COUNT(*) FROM super_admin."RequestLog" WHERE "statusCode" >= 200 AND "statusCode" < 400');
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const last24hRes = await client.query('SELECT COUNT(*) FROM super_admin."RequestLog" WHERE "timestamp" >= $1', [twentyFourHoursAgo]);
  
  // Also check since midnight local (server timezone, e.g. IST)
  const todayStart = new Date(new Date().setHours(0,0,0,0)).toISOString();
  const sinceMidnightLocalRes = await client.query('SELECT COUNT(*) FROM super_admin."RequestLog" WHERE "timestamp" >= $1', [todayStart]);

  console.log('--- STATS ---');
  console.log('All Time Total:', allTimeRes.rows[0].count);
  console.log('All Time Successes:', allTimeSuccessRes.rows[0].count);
  console.log('Last 24 Hours:', last24hRes.rows[0].count);
  console.log('Since Midnight Local (Server Time):', sinceMidnightLocalRes.rows[0].count);
  
  await client.end();
}

run().catch(console.error);
