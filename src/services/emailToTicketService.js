// Email-to-Ticket System for TicketFlow
// Handles automatic ticket creation from incoming emails

import { Organization } from '@/api/entities';
import { Ticket } from '@/api/entities';
import { Department } from '@/api/entities';
import { User } from '@/api/entities';
import { Notification } from '@/api/entities';
import { createPageUrl } from '@/utils';

export class EmailToTicketService {
  // Step 1: Generate organization email address
  static generateOrgEmail(organizationName) {
    const cleanName = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove spaces and special characters
      .substring(0, 20); // Limit length
    
    return `${cleanName}@ticketflow.dev`;
  }

  // Step 4: Analyze email content for department assignment
  static analyzeDepartment(subject, body) {
    const content = `${subject} ${body}`.toLowerCase();
    
    // Department keywords mapping
    const departmentKeywords = {
      'billing': ['billing', 'invoice', 'payment', 'charge', 'refund', 'subscription', 'cost', 'price'],
      'support': ['help', 'problem', 'error', 'broken', 'issue', 'bug', 'not working', 'crash', 'fix'],
      'sales': ['quote', 'sales', 'buy', 'purchase', 'demo', 'pricing', 'product', 'service'],
      'hr': ['hr', 'human resources', 'employee', 'hiring', 'job', 'career', 'benefits'],
      'technical': ['api', 'integration', 'development', 'code', 'technical', 'server', 'database']
    };

    // Score each department based on keyword matches
    const scores = {};
    for (const [dept, keywords] of Object.entries(departmentKeywords)) {
      scores[dept] = keywords.reduce((score, keyword) => {
        const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
        return score + matches;
      }, 0);
    }

    // Find department with highest score
    const bestMatch = Object.entries(scores).reduce((a, b) => 
      scores[a[0]] > scores[b[0]] ? a : b
    );

    // Return department name or default to 'support'
    return bestMatch[1] > 0 ? bestMatch[0] : 'support';
  }

  // Step 5: Determine ticket priority
  static analyzePriority(subject, body) {
    const content = `${subject} ${body}`.toLowerCase();
    
    const urgentKeywords = ['urgent', 'critical', 'emergency', 'asap', 'immediately', 'crisis'];
    const importantKeywords = ['important', 'soon', 'priority', 'needed', 'required'];
    
    if (urgentKeywords.some(keyword => content.includes(keyword))) {
      return 'high';
    }
    
    if (importantKeywords.some(keyword => content.includes(keyword))) {
      return 'medium';
    }
    
    return 'normal';
  }

  // Step 6: Generate unique ticket ID
  static generateTicketId() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `TKT-${year}-${timestamp}-${random}`;
  }

  // Step 3: Find organization by email address
  static async findOrganizationByEmail(emailAddress) {
    try {
      const organizations = await Organization.getAll();
      
      return organizations.find(org => {
        const generatedEmail = this.generateOrgEmail(org.name);
        return generatedEmail === emailAddress;
      });
    } catch (error) {
      console.error('Error finding organization by email:', error);
      return null;
    }
  }

  // Step 6: Create ticket from email
  static async createTicketFromEmail(emailData) {
    try {
      const { to, from, subject, body, attachments = [], organization } = emailData;
      
      // Step 3: Use provided organization or find by email
      let targetOrg = organization;
      if (!targetOrg) {
        targetOrg = await this.findOrganizationByEmail(to);
        if (!targetOrg) {
          throw new Error(`No organization found for email: ${to}`);
        }
      }

      // Step 4: Analyze department
      const departmentName = this.analyzeDepartment(subject, body);
      
      // Find or create department
      let department = await Department.filter({
        organization_id: targetOrg.id,
        name: departmentName
      }).then(depts => depts[0]);

      if (!department) {
        // Create department if it doesn't exist
        department = await Department.create({
          name: departmentName,
          description: `Auto-created department for ${departmentName} tickets`,
          organization_id: targetOrg.id,
          head_email: targetOrg.owner_email,
          members: [targetOrg.owner_email]
        });
      }

      // Step 5: Analyze priority
      const priority = this.analyzePriority(subject, body);

      // Step 6: Generate ticket ID and create ticket
      const ticketId = this.generateTicketId();
      
      const ticket = await Ticket.create({
        ticket_id: ticketId,
        title: subject || 'Email Ticket',
        description: body || 'No content provided',
        priority,
        status: 'open',
        department_id: department.id,
        organization_id: targetOrg.id,
        requester_email: from,
        reporter_email: from, // Add this field for AllTickets compatibility
        assigned_to: null, // Will be assigned by department
        created_by: from,
        tags: ['email-generated'],
        source: 'email',
        email_thread_id: `${from}-${Date.now()}`, // For tracking email replies
        attachments: attachments.map(att => ({
          name: att.name,
          url: att.url || att.path,
          type: att.type,
          size: att.size
        }))
      });

      // Step 8: Notify department team
      await this.notifyDepartmentTeam(department, ticket, targetOrg);

      // Step 7: Send confirmation email (simulated for local development)
      await this.sendConfirmationEmail(from, ticket, department);

      return ticket;
    } catch (error) {
      console.error('Error creating ticket from email:', error);
      throw error;
    }
  }

  // Step 7: Send confirmation email to sender
  static async sendConfirmationEmail(senderEmail, ticket, department) {
    try {
      // In local development, we'll create a notification instead of sending actual email
      const confirmationMessage = `
        Thank you for contacting us!
        
        Your ticket has been created successfully:
        
        Ticket ID: ${ticket.ticket_id}
        Subject: ${ticket.title}
        Department: ${department.name}
        Priority: ${ticket.priority}
        
        Our ${department.name} team will respond within 24 hours.
        
        You can track your ticket status in our system.
      `;

      // Create a notification for the sender (if they're a user in the system)
      try {
        const users = await User.filter({ email: senderEmail });
        if (users.length > 0) {
          await Notification.create({
            user_email: senderEmail,
            title: `Ticket Created: ${ticket.ticket_id}`,
            message: confirmationMessage,
            type: 'ticket_created',
            organization_id: ticket.organization_id,
            related_id: ticket.id,
            link: createPageUrl("AllTickets", `ticket=${ticket.id}`) // Add navigation link to the ticket
          });
        }
      } catch {
        console.log('Sender not found in system, email confirmation would be sent externally');
      }

      // Log the confirmation for development
      console.log('📧 Email Confirmation Sent:', {
        to: senderEmail,
        subject: `Ticket Created: ${ticket.ticket_id}`,
        message: confirmationMessage
      });

      return true;
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      return false;
    }
  }

  // Step 8: Notify assigned department team
  static async notifyDepartmentTeam(department, ticket, organization) {
    try {
      const departmentMembers = department.members || [department.head_email];
      
      for (const memberEmail of departmentMembers) {
        await Notification.create({
          user_email: memberEmail,
          title: `New Ticket Assigned: ${ticket.ticket_id}`,
          message: `A new ticket has been assigned to the ${department.name} department.\n\nTitle: ${ticket.title}\nPriority: ${ticket.priority}\nFrom: ${ticket.requester_email}`,
          type: 'ticket_assigned',
          organization_id: organization.id,
          related_id: ticket.id,
          link: createPageUrl("AllTickets", `ticket=${ticket.id}`) // Add navigation link to the ticket
        });
      }

      console.log('🔔 Department Team Notified:', {
        department: department.name,
        members: departmentMembers,
        ticket: ticket.ticket_id
      });

      return true;
    } catch (error) {
      console.error('Error notifying department team:', error);
      return false;
    }
  }

  // Step 9: Handle email replies (check if email is a reply to existing ticket)
  static async handleEmailReply(emailData) {
    try {
      const { from, subject, body } = emailData;
      
      // Look for ticket ID in subject line
      const ticketIdMatch = subject.match(/TKT-\d{4}-\d{6}-[A-Z0-9]{3}/);
      
      if (ticketIdMatch) {
        const ticketId = ticketIdMatch[0];
        
        // Find existing ticket
        const tickets = await Ticket.filter({ ticket_id: ticketId });
        if (tickets.length > 0) {
          const ticket = tickets[0];
          
          // Add reply as comment to existing ticket
          const Comment = (await import('@/api/entities')).Comment;
          await Comment.create({
            ticket_id: ticket.id,
            content: body,
            author_email: from,
            organization_id: ticket.organization_id,
            type: 'email_reply'
          });

          // Update ticket status if it was closed
          if (ticket.status === 'closed') {
            await Ticket.update(ticket.id, { 
              status: 'open',
              updated_at: new Date().toISOString()
            });
          }

          console.log('💬 Email Reply Added to Ticket:', {
            ticketId: ticket.ticket_id,
            from,
            commentAdded: true
          });

          return { isReply: true, ticket };
        }
      }

      return { isReply: false };
    } catch (error) {
      console.error('Error handling email reply:', error);
      return { isReply: false };
    }
  }

  // Step 2 & 10: Process incoming email (main entry point)
  static async processIncomingEmail(emailData) {
    try {
      console.log('📨 Processing Incoming Email:', {
        to: emailData.to,
        from: emailData.from,
        subject: emailData.subject,
        organization: emailData.organization?.name
      });

      // Step 9: Check if this is a reply to existing ticket
      const replyResult = await this.handleEmailReply(emailData);
      if (replyResult.isReply) {
        return {
          success: true,
          type: 'reply',
          ticket: replyResult.ticket,
          message: 'Email reply added to existing ticket'
        };
      }

      // Step 6: Create new ticket
      const ticket = await this.createTicketFromEmail(emailData);

      // Step 10: Log everything
      console.log('✅ Email-to-Ticket Processing Complete:', {
        ticketId: ticket.ticket_id,
        organization: ticket.organization_id,
        department: ticket.department_id,
        priority: ticket.priority,
        from: emailData.from
      });

      return {
        success: true,
        type: 'new_ticket',
        ticket,
        message: 'New ticket created successfully'
      };

    } catch (error) {
      console.error('❌ Email Processing Failed:', error);
      
      // Step 10: Log errors
      return {
        success: false,
        error: error.message,
        emailData: {
          to: emailData.to,
          from: emailData.from,
          subject: emailData.subject
        }
      };
    }
  }

  // Utility: Get organization email address
  static async getOrganizationEmail(organizationId) {
    try {
      const organization = await Organization.get(organizationId);
      return this.generateOrgEmail(organization.name);
    } catch (error) {
      console.error('Error getting organization email:', error);
      return null;
    }
  }

  // Utility: Test email processing with sample data
  static async testEmailProcessing() {
    const sampleEmails = [
      {
        to: 'acme@ticketflow.dev',
        from: 'customer@example.com',
        subject: 'URGENT: Billing issue with my account',
        body: 'I have been charged twice for my subscription this month. Please help me resolve this billing problem immediately.',
        attachments: []
      },
      {
        to: 'techcorp@ticketflow.dev',
        from: 'user@company.com',
        subject: 'Help needed with login problem',
        body: 'I cannot log into my account. The system shows an error message when I try to sign in.',
        attachments: []
      },
      {
        to: 'startup@ticketflow.dev',
        from: 'prospect@business.com',
        subject: 'Sales inquiry about your product',
        body: 'I am interested in purchasing your software for my team. Can you provide a quote for 50 users?',
        attachments: []
      }
    ];

    console.log('🧪 Testing Email-to-Ticket System...');
    
    for (const email of sampleEmails) {
      const result = await this.processIncomingEmail(email);
      console.log('Test Result:', result);
    }
  }
}
