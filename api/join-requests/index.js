import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET' && req.query.check_org) {
      // Allow organization lookup without authentication
      const { organization_id } = req.query;

      if (!organization_id) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      // Check if organization exists
      const orgResult = await sql`
        SELECT organization_id, name FROM organizations WHERE organization_id = ${organization_id}
      `;

      if (orgResult.rows.length === 0) {
        return res.status(404).json({ error: 'Organization not found. Please check the ID and try again.' });
      }

      const organization = orgResult.rows[0];
      return res.status(200).json({ 
        exists: true, 
        organization_id: organization.organization_id,
        name: organization.name 
      });
    }

    // For all other operations, require authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (req.method === 'POST') {
      // Create join request
      const { organization_id, message } = req.body;

      if (!organization_id) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      // First, check if organization exists
      const orgResult = await sql`
        SELECT * FROM organizations WHERE organization_id = ${organization_id}
      `;

      if (orgResult.rows.length === 0) {
        return res.status(404).json({ error: 'Organization not found. Please check the ID and try again.' });
      }

      const organization = orgResult.rows[0];

      // Check if user is already a member
      if (organization.members && organization.members.includes(decoded.email)) {
        return res.status(400).json({ error: 'You are already a member of this organization' });
      }

      // Auto-initialize join_requests table if it doesn't exist
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS join_requests (
            id SERIAL PRIMARY KEY,
            organization_id INTEGER NOT NULL,
            user_email VARCHAR(255) NOT NULL,
            message TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
      } catch (initError) {
        console.log('Join requests table already exists or creation failed:', initError.message);
      }

      // Check if there's already a pending request
      const existingRequest = await sql`
        SELECT * FROM join_requests 
        WHERE organization_id = ${organization.id} 
        AND user_email = ${decoded.email} 
        AND status = 'pending'
      `;

      if (existingRequest.rows.length > 0) {
        return res.status(400).json({ error: 'You already have a pending join request for this organization' });
      }

      // Create join request
      const result = await sql`
        INSERT INTO join_requests (organization_id, user_email, message)
        VALUES (${organization.id}, ${decoded.email}, ${message || ''})
        RETURNING *
      `;

      const joinRequest = result.rows[0];

      res.status(201).json({
        id: joinRequest.id,
        organization_id: joinRequest.organization_id,
        user_email: joinRequest.user_email,
        message: joinRequest.message,
        status: joinRequest.status,
        created_date: joinRequest.created_date,
        updated_date: joinRequest.updated_date,
        organization_name: organization.name
      });

    } else if (req.method === 'GET') {
      // Get join requests for organization
      const { organization_id } = req.query;

      if (!organization_id) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const result = await sql`
        SELECT jr.*, u.full_name, u.avatar_url, u.position
        FROM join_requests jr
        LEFT JOIN users u ON jr.user_email = u.email
        WHERE jr.organization_id = ${organization_id}
        ORDER BY jr.created_date DESC
      `;

      const joinRequests = result.rows.map(request => ({
        id: request.id,
        organization_id: request.organization_id,
        user_email: request.user_email,
        message: request.message,
        status: request.status,
        created_date: request.created_date,
        updated_date: request.updated_date,
        user_profile: {
          full_name: request.full_name,
          avatar_url: request.avatar_url,
          position: request.position
        }
      }));

      res.status(200).json(joinRequests);

    } else if (req.method === 'PUT') {
      // Update join request (approve/reject)
      const { id } = req.query;
      const { status } = req.body;

      if (!id || !status) {
        return res.status(400).json({ error: 'Request ID and status are required' });
      }

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be approved or rejected' });
      }

      // Get the join request
      const requestResult = await sql`
        SELECT * FROM join_requests WHERE id = ${id}
      `;

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ error: 'Join request not found' });
      }

      const joinRequest = requestResult.rows[0];

      // Update join request status
      await sql`
        UPDATE join_requests 
        SET status = ${status}, updated_date = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;

      // If approved, add user to organization
      if (status === 'approved') {
        // Add to organization members
        await sql`
          UPDATE organizations 
          SET members = array_append(members, ${joinRequest.user_email})
          WHERE id = ${joinRequest.organization_id}
        `;

        // Add organization to user's verified organizations
        await sql`
          UPDATE users 
          SET verified_organizations = array_append(verified_organizations, ${joinRequest.organization_id})
          WHERE email = ${joinRequest.user_email}
        `;
      }

      res.status(200).json({ success: true, status });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Join requests API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
