import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  // Parse the URL to get the pathname
  let pathname;
  try {
    pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  } catch (error) {
    // Fallback for cases where URL parsing fails
    pathname = req.url.split('?')[0];
  }
  
  // Route to appropriate handler based on pathname
  if (pathname.includes('/tickets')) {
    return handleTickets(req, res);
  } else if (pathname.includes('/notifications')) {
    return handleNotifications(req, res);
  } else if (pathname.includes('/departments')) {
    return handleDepartments(req, res);
  } else if (pathname.includes('/join-requests')) {
    return handleJoinRequests(req, res);
  } else if (pathname.includes('/test-connection')) {
    return handleTestConnection(req, res);
  } else if (pathname.includes('/debug-auth')) {
    return handleDebugAuth(req, res);
  }
  
  return res.status(404).json({ error: 'Endpoint not found', pathname, url: req.url });
}

// Test connection handler
function handleTestConnection(req, res) {
  try {
    res.status(200).json({ 
      success: true, 
      message: 'API connection working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Debug auth handler
function handleDebugAuth(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    res.status(200).json({
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      authHeader: authHeader ? authHeader.substring(0, 20) + '...' : null,
      allHeaders: Object.keys(req.headers),
      method: req.method,
      url: req.url
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      hasAuthHeader: !!req.headers.authorization
    });
  }
}

// Join requests handler
async function handleJoinRequests(req, res) {
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

    if (req.method === 'GET') {
      // Get join requests for organization
      const { organization_id } = req.query;

      if (!organization_id) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      // Auto-initialize join_requests table if it doesn't exist
      try {
        // First, try to alter the existing table to fix the schema
        try {
          await sql`ALTER TABLE join_requests ALTER COLUMN organization_id TYPE VARCHAR(255)`;
          console.log('Successfully altered join_requests table schema');
        } catch (alterError) {
          console.log('Table alteration failed, trying to create table:', alterError.message);
          // If alter fails, try to create the table (it might not exist)
          await sql`
            CREATE TABLE IF NOT EXISTS join_requests (
              id SERIAL PRIMARY KEY,
              organization_id VARCHAR(255) NOT NULL,
              user_email VARCHAR(255) NOT NULL,
              message TEXT,
              status VARCHAR(50) DEFAULT 'pending',
              created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `;
        }
      } catch (initError) {
        console.log('Join requests table initialization failed:', initError.message);
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

    } else if (req.method === 'POST') {
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
        // First, try to alter the existing table to fix the schema
        try {
          await sql`ALTER TABLE join_requests ALTER COLUMN organization_id TYPE VARCHAR(255)`;
          console.log('Successfully altered join_requests table schema');
        } catch (alterError) {
          console.log('Table alteration failed, trying to create table:', alterError.message);
          // If alter fails, try to create the table (it might not exist)
          await sql`
            CREATE TABLE IF NOT EXISTS join_requests (
              id SERIAL PRIMARY KEY,
              organization_id VARCHAR(255) NOT NULL,
              user_email VARCHAR(255) NOT NULL,
              message TEXT,
              status VARCHAR(50) DEFAULT 'pending',
              created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `;
        }
      } catch (initError) {
        console.log('Join requests table initialization failed:', initError.message);
      }

      // Check if there's already a pending request
      const existingRequest = await sql`
        SELECT * FROM join_requests 
        WHERE organization_id = ${organization.organization_id} 
        AND user_email = ${decoded.email} 
        AND status = 'pending'
      `;

      if (existingRequest.rows.length > 0) {
        return res.status(400).json({ error: 'You already have a pending join request for this organization' });
      }

      // Create join request
      const result = await sql`
        INSERT INTO join_requests (organization_id, user_email, message)
        VALUES (${organization.organization_id}, ${decoded.email}, ${message || ''})
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

// Tickets handler
async function handleTickets(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (req.method === 'GET') {
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

// Notifications handler
async function handleNotifications(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (req.method === 'GET') {
      // Auto-initialize notifications table if it doesn't exist
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            type VARCHAR(50) DEFAULT 'info',
            read BOOLEAN DEFAULT false,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
      } catch (initError) {
        console.log('Notifications table already exists or creation failed:', initError.message);
      }

      const result = await sql`
        SELECT * FROM notifications 
        WHERE user_email = ${decoded.email}
        ORDER BY created_date DESC
        LIMIT 50
      `;

      const notifications = result.rows.map(notification => ({
        id: notification.id,
        user_email: notification.user_email,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.read,
        created_date: notification.created_date
      }));

      res.status(200).json(notifications);

    } else if (req.method === 'POST') {
      // Create notification
      const { user_email, title, message, type, link, organization_id, from_user_email } = req.body;

      if (!user_email || !title) {
        return res.status(400).json({ error: 'user_email and title are required' });
      }

      // Auto-initialize notifications table if it doesn't exist
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            type VARCHAR(50) DEFAULT 'info',
            link VARCHAR(500),
            organization_id VARCHAR(255),
            from_user_email VARCHAR(255),
            read BOOLEAN DEFAULT false,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
      } catch (initError) {
        console.log('Notifications table already exists or creation failed:', initError.message);
      }

      const result = await sql`
        INSERT INTO notifications (user_email, title, message, type, link, organization_id, from_user_email)
        VALUES (${user_email}, ${title}, ${message || ''}, ${type || 'info'}, ${link || null}, ${organization_id || null}, ${from_user_email || null})
        RETURNING *
      `;

      const notification = result.rows[0];

      res.status(201).json({
        id: notification.id,
        user_email: notification.user_email,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        organization_id: notification.organization_id,
        from_user_email: notification.from_user_email,
        read: notification.read,
        created_date: notification.created_date
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Notifications API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Departments handler
async function handleDepartments(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (req.method === 'GET') {
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
