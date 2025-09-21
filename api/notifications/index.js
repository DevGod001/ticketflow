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
      const { title, message, type = 'info', user_email } = req.body;

      if (!title || !user_email) {
        return res.status(400).json({ error: 'Title and user email are required' });
      }

      const result = await sql`
        INSERT INTO notifications (user_email, title, message, type)
        VALUES (${user_email}, ${title}, ${message || ''}, ${type})
        RETURNING *
      `;

      const notification = result.rows[0];

      res.status(201).json({
        id: notification.id,
        user_email: notification.user_email,
        title: notification.title,
        message: notification.message,
        type: notification.type,
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
