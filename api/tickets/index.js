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
      // Get tickets with optional filters
      const { organization_id } = req.query;

      if (!organization_id) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      // Auto-initialize tickets table if it doesn't exist
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS tickets (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(50) DEFAULT 'open',
            priority VARCHAR(50) DEFAULT 'medium',
            organization_id INTEGER NOT NULL,
            reporter_email VARCHAR(255) NOT NULL,
            assigned_to TEXT[],
            department_id INTEGER,
            tags TEXT[],
            due_date TIMESTAMP,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
      } catch (initError) {
        console.log('Tickets table already exists or creation failed:', initError.message);
      }

      const result = await sql`
        SELECT * FROM tickets 
        WHERE organization_id = ${organization_id}
        ORDER BY created_date DESC
      `;

      const tickets = result.rows.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        organization_id: ticket.organization_id,
        reporter_email: ticket.reporter_email,
        assigned_to: ticket.assigned_to,
        department_id: ticket.department_id,
        tags: ticket.tags,
        due_date: ticket.due_date,
        created_date: ticket.created_date,
        updated_date: ticket.updated_date
      }));

      res.status(200).json(tickets);

    } else if (req.method === 'POST') {
      // Create ticket
      const { title, description, priority = 'medium', organization_id, department_id, assigned_to, tags, due_date } = req.body;

      if (!title || !organization_id) {
        return res.status(400).json({ error: 'Title and organization ID are required' });
      }

      const result = await sql`
        INSERT INTO tickets (
          title, description, priority, organization_id, reporter_email, 
          department_id, assigned_to, tags, due_date
        )
        VALUES (
          ${title}, ${description || ''}, ${priority}, ${organization_id}, ${decoded.email},
          ${department_id || null}, ${assigned_to || []}, ${tags || []}, ${due_date || null}
        )
        RETURNING *
      `;

      const ticket = result.rows[0];

      res.status(201).json({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        organization_id: ticket.organization_id,
        reporter_email: ticket.reporter_email,
        assigned_to: ticket.assigned_to,
        department_id: ticket.department_id,
        tags: ticket.tags,
        due_date: ticket.due_date,
        created_date: ticket.created_date,
        updated_date: ticket.updated_date
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Tickets API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
