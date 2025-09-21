import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function generateOrgId() {
  return `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (req.method === 'POST') {
      // Create organization
      const { name, description, organization_id } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Organization name is required' });
      }

      const orgId = organization_id || generateOrgId();

      // Check if organization_id already exists
      const existing = await sql`
        SELECT id FROM organizations WHERE organization_id = ${orgId}
      `;

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Organization ID already exists' });
      }

      // Create organization
      const result = await sql`
        INSERT INTO organizations (
          organization_id, name, description, owner_email, 
          admins, managers, members, member_profiles, settings, permissions
        )
        VALUES (
          ${orgId}, ${name}, ${description || ''}, ${decoded.email},
          ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[${decoded.email}]::TEXT[],
          '[]'::JSONB,
          '{"allow_public_join": false, "require_approval": true}'::JSONB,
          '{
            "owner": {
              "manage_organization": true,
              "manage_roles": true,
              "manage_members": true,
              "manage_departments": true,
              "manage_teams": true,
              "manage_tickets": true,
              "manage_channels": true,
              "view_analytics": true,
              "manage_settings": true,
              "delete_organization": true
            },
            "admin": {
              "manage_organization": false,
              "manage_roles": true,
              "manage_members": true,
              "manage_departments": true,
              "manage_teams": true,
              "manage_tickets": true,
              "manage_channels": true,
              "view_analytics": true,
              "manage_settings": true,
              "delete_organization": false
            },
            "manager": {
              "manage_organization": false,
              "manage_roles": false,
              "manage_members": true,
              "manage_departments": true,
              "manage_teams": true,
              "manage_tickets": true,
              "manage_channels": true,
              "view_analytics": false,
              "manage_settings": false,
              "delete_organization": false
            },
            "member": {
              "manage_organization": false,
              "manage_roles": false,
              "manage_members": false,
              "manage_departments": false,
              "manage_teams": false,
              "manage_tickets": true,
              "manage_channels": false,
              "view_analytics": false,
              "manage_settings": false,
              "delete_organization": false
            }
          }'::JSONB
        )
        RETURNING *
      `;

      const org = result.rows[0];

      // Update user's verified_organizations and active_organization_id
      await sql`
        UPDATE users 
        SET verified_organizations = array_append(verified_organizations, ${org.id}),
            active_organization_id = ${org.id}
        WHERE id = ${decoded.userId}
      `;

      res.status(201).json({
        id: org.id,
        organization_id: org.organization_id,
        name: org.name,
        description: org.description,
        owner_email: org.owner_email,
        admins: org.admins,
        managers: org.managers,
        members: org.members,
        member_profiles: org.member_profiles,
        settings: org.settings,
        permissions: org.permissions,
        created_date: org.created_at,
        updated_date: org.updated_at
      });

    } else if (req.method === 'GET') {
      // Get organizations for user
      const userResult = await sql`
        SELECT verified_organizations FROM users WHERE id = ${decoded.userId}
      `;

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const verifiedOrgs = userResult.rows[0].verified_organizations || [];

      if (verifiedOrgs.length === 0) {
        return res.status(200).json([]);
      }

      const orgsResult = await sql`
        SELECT * FROM organizations WHERE id = ANY(${verifiedOrgs})
      `;

      const organizations = orgsResult.rows.map(org => ({
        id: org.id,
        organization_id: org.organization_id,
        name: org.name,
        description: org.description,
        owner_email: org.owner_email,
        admins: org.admins,
        managers: org.managers,
        members: org.members,
        member_profiles: org.member_profiles,
        settings: org.settings,
        permissions: org.permissions,
        created_date: org.created_at,
        updated_date: org.updated_at
      }));

      res.status(200).json(organizations);

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Organizations API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
