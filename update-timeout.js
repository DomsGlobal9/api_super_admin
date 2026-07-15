const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres.gsriztjnocjwgqkaxhhz:Tryontobuy%40123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres' });

pool.query(`UPDATE super_admin."MicroserviceEnvironment" SET "timeoutMs" = 90000 WHERE id = '8334ccb4-28e8-4d75-b46a-dbcfb9698e56'`).then(res => {
  console.log('Updated to 90 seconds!');
  pool.end();
}).catch(console.error);
