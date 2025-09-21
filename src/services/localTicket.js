// Local Ticket Service for Development
class LocalTicketService {
  constructor() {
    this.TICKETS_KEY = 'ticketflow_tickets';
    this.MAX_TICKETS = 1000; // Maximum tickets to keep in localStorage
    this.CLEANUP_THRESHOLD = 0.8; // Clean up when 80% of max is reached
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.TICKETS_KEY)) {
      localStorage.setItem(this.TICKETS_KEY, JSON.stringify([]));
    }
    this.checkStorageQuota();
  }

  checkStorageQuota() {
    try {
      const tickets = JSON.parse(localStorage.getItem(this.TICKETS_KEY) || '[]');
      
      // If we're approaching the limit, clean up old tickets
      if (tickets.length > this.MAX_TICKETS * this.CLEANUP_THRESHOLD) {
        this.cleanupOldTickets();
      }
    } catch (error) {
      console.warn('Storage quota check failed:', error);
      // If we can't parse, reset the storage
      localStorage.setItem(this.TICKETS_KEY, JSON.stringify([]));
    }
  }

  cleanupOldTickets() {
    try {
      const tickets = JSON.parse(localStorage.getItem(this.TICKETS_KEY) || '[]');
      
      // Sort by created_date (oldest first) and keep only the most recent tickets
      const sortedTickets = tickets.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
      
      // Keep only the most recent 70% of max tickets
      const keepCount = Math.floor(this.MAX_TICKETS * 0.7);
      const cleanedTickets = sortedTickets.slice(0, keepCount);
      
      localStorage.setItem(this.TICKETS_KEY, JSON.stringify(cleanedTickets));
      console.log(`Cleaned up ${tickets.length - cleanedTickets.length} old tickets`);
    } catch (error) {
      console.error('Failed to cleanup old tickets:', error);
      // If cleanup fails, reset storage
      localStorage.setItem(this.TICKETS_KEY, JSON.stringify([]));
    }
  }

  checkStorageSpace() {
    try {
      // Test if we can write to localStorage
      const testKey = 'storage_test';
      const testData = 'x'.repeat(1024); // 1KB test
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  generateId() {
    return `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async create(ticketData) {
    try {
      // Check storage quota before creating
      this.checkStorageQuota();
      
      const tickets = JSON.parse(localStorage.getItem(this.TICKETS_KEY) || '[]');
      
      const newTicket = {
        id: this.generateId(),
        ...ticketData,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        status: ticketData.status || 'open',
        priority: ticketData.priority || 'medium',
        assigned_to: Array.isArray(ticketData.assigned_to) ? ticketData.assigned_to : (ticketData.assigned_to ? [ticketData.assigned_to] : []),
        tags: ticketData.tags || [],
        attachments: ticketData.attachments || [],
        watchers: ticketData.watchers || [],
        comments: []
      };

      tickets.push(newTicket);
      
      // Try to save, if it fails due to quota, clean up and try again
      try {
        localStorage.setItem(this.TICKETS_KEY, JSON.stringify(tickets));
      } catch (storageError) {
        if (storageError.name === 'QuotaExceededError' || storageError.message.includes('quota')) {
          console.warn('Storage quota exceeded, cleaning up old tickets...');
          this.cleanupOldTickets();
          
          // Try again with cleaned up storage
          const cleanedTickets = JSON.parse(localStorage.getItem(this.TICKETS_KEY) || '[]');
          cleanedTickets.push(newTicket);
          localStorage.setItem(this.TICKETS_KEY, JSON.stringify(cleanedTickets));
        } else {
          throw storageError;
        }
      }
      
      return newTicket;
    } catch (error) {
      console.error('Failed to create ticket:', error);
      throw new Error(`Failed to create ticket: ${error.message}`);
    }
  }

  async filter(criteria = {}, sortBy = '-created_date') {
    try {
      const tickets = JSON.parse(localStorage.getItem(this.TICKETS_KEY) || '[]');
      
      let filtered = tickets.filter(ticket => {
        // Apply filters
        for (const [key, value] of Object.entries(criteria)) {
          if (value === null || value === undefined) continue;
          
          if (key === 'organization_id' && ticket.organization_id !== value) {
            return false;
          }
          if (key === 'id' && ticket.id !== value) {
            return false;
          }
          if (key === 'status' && ticket.status !== value) {
            return false;
          }
          if (key === 'priority' && ticket.priority !== value) {
            return false;
          }
          if (key === 'department_id' && ticket.department_id !== value) {
            return false;
          }
          if (key === 'reporter_email' && ticket.reporter_email !== value) {
            return false;
          }
          if (key === 'assigned_to') {
            if (Array.isArray(ticket.assigned_to)) {
              if (!ticket.assigned_to.includes(value)) {
                return false;
              }
            } else if (ticket.assigned_to !== value) {
              return false;
            }
          }
        }
        return true;
      });

      // Apply sorting
      if (sortBy) {
        const isDescending = sortBy.startsWith('-');
        const sortField = isDescending ? sortBy.substring(1) : sortBy;
        
        filtered.sort((a, b) => {
          let aVal = a[sortField];
          let bVal = b[sortField];
          
          // Handle date sorting
          if (sortField.includes('date')) {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
          }
          
          if (aVal < bVal) return isDescending ? 1 : -1;
          if (aVal > bVal) return isDescending ? -1 : 1;
          return 0;
        });
      }

      return filtered;
    } catch (error) {
      throw new Error(`Failed to filter tickets: ${error.message}`);
    }
  }

  async update(id, updateData) {
    try {
      const tickets = JSON.parse(localStorage.getItem(this.TICKETS_KEY) || '[]');
      const ticketIndex = tickets.findIndex(ticket => ticket.id === id);
      
      if (ticketIndex === -1) {
        throw new Error('Ticket not found');
      }

      tickets[ticketIndex] = {
        ...tickets[ticketIndex],
        ...updateData,
        updated_date: new Date().toISOString()
      };

      localStorage.setItem(this.TICKETS_KEY, JSON.stringify(tickets));
      return tickets[ticketIndex];
    } catch (error) {
      throw new Error(`Failed to update ticket: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const tickets = JSON.parse(localStorage.getItem(this.TICKETS_KEY) || '[]');
      const filteredTickets = tickets.filter(ticket => ticket.id !== id);
      
      if (filteredTickets.length === tickets.length) {
        throw new Error('Ticket not found');
      }

      localStorage.setItem(this.TICKETS_KEY, JSON.stringify(filteredTickets));
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete ticket: ${error.message}`);
    }
  }

  async get(id) {
    try {
      const tickets = JSON.parse(localStorage.getItem(this.TICKETS_KEY) || '[]');
      const ticket = tickets.find(ticket => ticket.id === id);
      
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      return ticket;
    } catch (error) {
      throw new Error(`Failed to get ticket: ${error.message}`);
    }
  }

  // Add comment to ticket
  async addComment(ticketId, commentData) {
    try {
      const tickets = JSON.parse(localStorage.getItem(this.TICKETS_KEY) || '[]');
      const ticketIndex = tickets.findIndex(ticket => ticket.id === ticketId);
      
      if (ticketIndex === -1) {
        throw new Error('Ticket not found');
      }

      const newComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...commentData,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      };

      if (!tickets[ticketIndex].comments) {
        tickets[ticketIndex].comments = [];
      }

      tickets[ticketIndex].comments.push(newComment);
      tickets[ticketIndex].updated_date = new Date().toISOString();

      localStorage.setItem(this.TICKETS_KEY, JSON.stringify(tickets));
      return newComment;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  // Get all tickets (for debugging)
  async getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.TICKETS_KEY) || '[]');
    } catch (error) {
      throw new Error(`Failed to get all tickets: ${error.message}`);
    }
  }

  // Clear all tickets (for debugging)
  async clearAll() {
    try {
      localStorage.setItem(this.TICKETS_KEY, JSON.stringify([]));
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to clear tickets: ${error.message}`);
    }
  }
}

export const LocalTicket = new LocalTicketService();
