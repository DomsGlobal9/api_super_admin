const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres.gsriztjnocjwgqkaxhhz:Tryontobuy%40123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres' });

pool.query('SELECT * FROM super_admin."MicroserviceEnvironment"').then(res => {
  console.log(res.rows);
  pool.end();
}).catch(console.error);
