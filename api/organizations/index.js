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

      // Auto-initialize organizations table if it doesn't exist
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS organizations (
            id SERIAL PRIMARY KEY,
            organization_id VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            owner_email VARCHAR(255) NOT NULL,
            admins TEXT[],
            managers TEXT[],
            members TEXT[],
            member_profiles JSONB,
            settings JSONB,
            permissions JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
      } catch (initError) {
        console.log('Organizations table already exists or creation failed:', initError.message);
      }

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

    } else if (req.method === 'PUT') {
      // Update organization (for member profiles, etc.)
      const orgId = req.query.id || req.body.id;
      
      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      // Check if user has permission to update this organization
      const userResult = await sql`
        SELECT verified_organizations FROM users WHERE id = ${decoded.userId}
      `;

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const verifiedOrgs = userResult.rows[0].verified_organizations || [];
      
      if (!verifiedOrgs.includes(parseInt(orgId))) {
        return res.status(403).json({ error: 'Not authorized to update this organization' });
      }

      // Get current organization
      const orgResult = await sql`
        SELECT * FROM organizations WHERE id = ${orgId}
      `;

      if (orgResult.rows.length === 0) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const currentOrg = orgResult.rows[0];
      const updates = req.body;

      // Update organization
      const result = await sql`
        UPDATE organizations 
        SET 
          name = ${updates.name || currentOrg.name},
          description = ${updates.description || currentOrg.description},
          member_profiles = ${JSON.stringify(updates.member_profiles || currentOrg.member_profiles)},
          settings = ${JSON.stringify(updates.settings || currentOrg.settings)},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${orgId}
        RETURNING *
      `;

      const updatedOrg = result.rows[0];

      res.status(200).json({
        id: updatedOrg.id,
        organization_id: updatedOrg.organization_id,
        name: updatedOrg.name,
        description: updatedOrg.description,
        owner_email: updatedOrg.owner_email,
        admins: updatedOrg.admins,
        managers: updatedOrg.managers,
        members: updatedOrg.members,
        member_profiles: updatedOrg.member_profiles,
        settings: updatedOrg.settings,
        permissions: updatedOrg.permissions,
        created_date: updatedOrg.created_at,
        updated_date: updatedOrg.updated_at
      });

    } else if (req.method === 'DELETE') {
      // Delete organization (owner only)
      const orgId = req.query.id;
      
      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      // Get organization to check ownership
      const orgResult = await sql`
        SELECT * FROM organizations WHERE id = ${orgId}
      `;

      if (orgResult.rows.length === 0) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const org = orgResult.rows[0];

      // Only owner can delete organization
      if (org.owner_email !== decoded.email) {
        return res.status(403).json({ error: 'Only organization owner can delete the organization' });
      }

      // Remove organization from all users' verified_organizations
      await sql`
        UPDATE users 
        SET verified_organizations = array_remove(verified_organizations, ${parseInt(orgId)}),
            active_organization_id = CASE 
              WHEN active_organization_id = ${parseInt(orgId)} THEN NULL 
              ELSE active_organization_id 
            END
      `;

      // Delete the organization
      await sql`
        DELETE FROM organizations WHERE id = ${orgId}
      `;

      res.status(200).json({ 
        success: true, 
        message: 'Organization deleted successfully' 
      });

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
