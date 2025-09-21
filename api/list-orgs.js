import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    // Get all organizations
    const result = await sql`
      SELECT organization_id, name, owner_email, created_date 
      FROM organizations 
      ORDER BY created_date DESC
    `;

    res.status(200).json({
      success: true,
      count: result.rows.length,
      organizations: result.rows
    });
  } catch (error) {
    console.error('List orgs error:', error);
    res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
}
