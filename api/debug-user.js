import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user data directly from database
    const userResult = await sql`
      SELECT * FROM users WHERE id = ${decoded.userId}
    `;

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get organizations if user has any
    let organizations = [];
    if (user.verified_organizations && user.verified_organizations.length > 0) {
      const orgResult = await sql`
        SELECT * FROM organizations WHERE id = ANY(${user.verified_organizations})
      `;
      organizations = orgResult.rows;
    }

    // Get active organization if set
    let activeOrg = null;
    if (user.active_organization_id) {
      const activeOrgResult = await sql`
        SELECT * FROM organizations WHERE id = ${user.active_organization_id}
      `;
      if (activeOrgResult.rows.length > 0) {
        activeOrg = activeOrgResult.rows[0];
      }
    }

    res.status(200).json({
      success: true,
      debug_info: {
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        position: user.position,
        bio: user.bio,
        phone: user.phone,
        avatar_url: user.avatar_url,
        active_organization_id: user.active_organization_id,
        verified_organizations: user.verified_organizations,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        owner_email: org.owner_email
      })),
      active_organization: activeOrg ? {
        id: activeOrg.id,
        name: activeOrg.name,
        owner_email: activeOrg.owner_email
      } : null,
      issues_detected: {
        no_full_name: !user.full_name || user.full_name.trim() === '',
        no_active_org: !user.active_organization_id,
        no_verified_orgs: !user.verified_organizations || user.verified_organizations.length === 0,
        profile_incomplete: !user.bio && !user.phone && !user.avatar_url
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Debug user error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
