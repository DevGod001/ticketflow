import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // First, ensure the join_requests table exists
    await sql`
      CREATE TABLE IF NOT EXISTS join_requests (
        id SERIAL PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        message TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        reviewed_by VARCHAR(255),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const { method, query, body } = req;

    switch (method) {
      case 'GET': {
        if (query.check_org === 'true') {
          // Check if organization exists
          const { organization_id } = query;
          const orgResult = await sql`
            SELECT id FROM organizations 
            WHERE organization_id = ${organization_id}
          `;
          
          return res.json({ 
            exists: orgResult.rows.length > 0,
            organization: orgResult.rows[0] || null
          });
        }

        if (query.organization_id) {
          // Get join requests for an organization
          const result = await sql`
            SELECT jr.*, u.full_name, u.avatar_url
            FROM join_requests jr
            LEFT JOIN users u ON jr.user_email = u.email
            WHERE jr.organization_id = ${query.organization_id}
            AND jr.status = 'pending'
            ORDER BY jr.created_at DESC
          `;
          
          return res.json(result.rows);
        }

        // Get all join requests (fallback)
        const allResult = await sql`
          SELECT jr.*, u.full_name, u.avatar_url
          FROM join_requests jr
          LEFT JOIN users u ON jr.user_email = u.email
          ORDER BY jr.created_at DESC
        `;
        
        return res.json(allResult.rows);
      }

      case 'POST': {
        // Create a new join request
        const { user_email, organization_id, message } = body;
        
        if (!user_email || !organization_id) {
          return res.status(400).json({ 
            error: 'user_email and organization_id are required' 
          });
        }

        // Check if request already exists
        const existingResult = await sql`
          SELECT id FROM join_requests 
          WHERE user_email = ${user_email} 
          AND organization_id = ${organization_id}
          AND status = 'pending'
        `;

        if (existingResult.rows.length > 0) {
          return res.status(400).json({ 
            error: 'A pending join request already exists for this organization' 
          });
        }

        const insertResult = await sql`
          INSERT INTO join_requests (user_email, organization_id, message, status, created_at)
          VALUES (${user_email}, ${organization_id}, ${message || ''}, 'pending', NOW())
          RETURNING *
        `;

        return res.json(insertResult.rows[0]);
      }

      case 'PUT': {
        // Update a join request (approve/decline)
        const { id } = query;
        const updates = body;
        
        if (!id) {
          return res.status(400).json({ error: 'Join request ID is required' });
        }

        // Use a simpler update approach
        const updateResult = await sql`
          UPDATE join_requests 
          SET status = ${updates.status || 'pending'},
              reviewed_by = ${updates.reviewed_by || null},
              reviewed_at = ${updates.reviewed_at || null},
              updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;

        if (updateResult.rows.length === 0) {
          return res.status(404).json({ error: 'Join request not found' });
        }

        return res.json(updateResult.rows[0]);
      }

      case 'DELETE': {
        // Delete a join request
        const { id: deleteId } = query;
        
        if (!deleteId) {
          return res.status(400).json({ error: 'Join request ID is required' });
        }

        const deleteResult = await sql`
          DELETE FROM join_requests 
          WHERE id = ${deleteId}
          RETURNING *
        `;

        if (deleteResult.rows.length === 0) {
          return res.status(404).json({ error: 'Join request not found' });
        }

        return res.json({ success: true, deleted: deleteResult.rows[0] });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Join requests API error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
