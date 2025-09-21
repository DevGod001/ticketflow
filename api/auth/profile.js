import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const { full_name, position, bio, phone, avatar_url } = req.body;

    // Update user profile
    const result = await sql`
      UPDATE users 
      SET 
        full_name = ${full_name || ''},
        position = ${position || ''},
        bio = ${bio || ''},
        phone = ${phone || ''},
        avatar_url = ${avatar_url || ''},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${decoded.userId}
      RETURNING id, email, full_name, position, bio, phone, avatar_url, 
               active_organization_id, verified_organizations, created_at, updated_at
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.status(200).json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      position: user.position,
      bio: user.bio,
      phone: user.phone,
      avatar_url: user.avatar_url,
      active_organization_id: user.active_organization_id,
      verified_organizations: user.verified_organizations,
      created_date: user.created_at,
      updated_date: user.updated_at
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
