import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    // Test database connection
    const result = await sql`SELECT NOW() as current_time`;
    
    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      time: result.rows[0].current_time,
      env_vars: {
        has_postgres_url: !!process.env.POSTGRES_URL,
        has_postgres_host: !!process.env.POSTGRES_POSTGRES_HOST,
        has_jwt_secret: !!process.env.JWT_SECRET,
        postgres_vars: Object.keys(process.env).filter(key => key.startsWith('POSTGRES_'))
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      env_vars: {
        has_postgres_url: !!process.env.POSTGRES_URL,
        has_postgres_host: !!process.env.POSTGRES_POSTGRES_HOST,
        has_jwt_secret: !!process.env.JWT_SECRET,
        postgres_vars: Object.keys(process.env).filter(key => key.startsWith('POSTGRES_'))
      }
    });
  }
}
