import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (req.method === 'GET') {
      // Get departments with optional filters
      const { organization_id } = req.query;

      if (!organization_id) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      // Auto-initialize departments table if it doesn't exist
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            organization_id INTEGER NOT NULL,
            color VARCHAR(7) DEFAULT '#3B82F6',
            members TEXT[],
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
      } catch (initError) {
        console.log('Departments table already exists or creation failed:', initError.message);
      }

      const result = await sql`
        SELECT * FROM departments 
        WHERE organization_id = ${organization_id}
        ORDER BY created_date ASC
      `;

      const departments = result.rows.map(dept => ({
        id: dept.id,
        name: dept.name,
        description: dept.description,
        organization_id: dept.organization_id,
        color: dept.color,
        members: dept.members,
        created_date: dept.created_date,
        updated_date: dept.updated_date
      }));

      res.status(200).json(departments);

    } else if (req.method === 'POST') {
      // Create department
      const { name, description, organization_id, color = '#3B82F6', members = [] } = req.body;

      if (!name || !organization_id) {
        return res.status(400).json({ error: 'Name and organization ID are required' });
      }

      const result = await sql`
        INSERT INTO departments (name, description, organization_id, color, members)
        VALUES (${name}, ${description || ''}, ${organization_id}, ${color}, ${members})
        RETURNING *
      `;

      const department = result.rows[0];

      res.status(201).json({
        id: department.id,
        name: department.name,
        description: department.description,
        organization_id: department.organization_id,
        color: department.color,
        members: department.members,
        created_date: department.created_date,
        updated_date: department.updated_date
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Departments API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
