// Storage Cleanup Utilities for Development
export class StorageCleanup {
  static getStorageUsage() {
    const usage = {};
    let totalSize = 0;
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = localStorage[key].length;
        usage[key] = {
          size: size,
          sizeKB: Math.round(size / 1024 * 100) / 100,
          sizeMB: Math.round(size / (1024 * 1024) * 100) / 100
        };
        totalSize += size;
      }
    }
    
    return {
      items: usage,
      totalSize: totalSize,
      totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      itemCount: Object.keys(usage).length
    };
  }
  
  static clearTicketFlowData() {
    const ticketFlowKeys = [];
    
    for (let key in localStorage) {
      if (key.startsWith('ticketflow_') || key.includes('ticket')) {
        ticketFlowKeys.push(key);
      }
    }
    
    ticketFlowKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`Cleared ${ticketFlowKeys.length} TicketFlow storage items:`, ticketFlowKeys);
    return ticketFlowKeys;
  }
  
  static clearOldTickets(keepCount = 100) {
    try {
      const ticketsKey = 'ticketflow_tickets';
      const tickets = JSON.parse(localStorage.getItem(ticketsKey) || '[]');
      
      if (tickets.length <= keepCount) {
        console.log(`Only ${tickets.length} tickets found, no cleanup needed`);
        return 0;
      }
      
      // Sort by created_date (newest first) and keep only the most recent
      const sortedTickets = tickets.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
      
      const keptTickets = sortedTickets.slice(0, keepCount);
      const removedCount = tickets.length - keptTickets.length;
      
      localStorage.setItem(ticketsKey, JSON.stringify(keptTickets));
      
      console.log(`Cleaned up ${removedCount} old tickets, kept ${keptTickets.length} most recent`);
      return removedCount;
    } catch (error) {
      console.error('Failed to cleanup old tickets:', error);
      return 0;
    }
  }
  
  static getTicketStats() {
    try {
      const tickets = JSON.parse(localStorage.getItem('ticketflow_tickets') || '[]');
      
      const stats = {
        total: tickets.length,
        byStatus: {},
        byPriority: {},
        oldestDate: null,
        newestDate: null,
        sizeKB: Math.round(JSON.stringify(tickets).length / 1024 * 100) / 100
      };
      
      tickets.forEach(ticket => {
        // Count by status
        stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1;
        
        // Count by priority
        stats.byPriority[ticket.priority] = (stats.byPriority[ticket.priority] || 0) + 1;
        
        // Track date range
        const createdDate = new Date(ticket.created_date);
        if (!stats.oldestDate || createdDate < stats.oldestDate) {
          stats.oldestDate = createdDate;
        }
        if (!stats.newestDate || createdDate > stats.newestDate) {
          stats.newestDate = createdDate;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Failed to get ticket stats:', error);
      return { total: 0, error: error.message };
    }
  }
  
  static emergencyCleanup() {
    console.log('🚨 Emergency cleanup initiated...');
    
    // Get current usage
    const beforeUsage = this.getStorageUsage();
    console.log('Storage before cleanup:', beforeUsage);
    
    // Clear all TicketFlow data
    const clearedKeys = this.clearTicketFlowData();
    
    // Reinitialize with empty arrays
    localStorage.setItem('ticketflow_tickets', JSON.stringify([]));
    localStorage.setItem('ticketflow_organizations', JSON.stringify([]));
    localStorage.setItem('ticketflow_users', JSON.stringify([]));
    localStorage.setItem('ticketflow_departments', JSON.stringify([]));
    localStorage.setItem('ticketflow_notifications', JSON.stringify([]));
    localStorage.setItem('ticketflow_direct_messages', JSON.stringify([]));
    localStorage.setItem('ticketflow_comments', JSON.stringify([]));
    
    const afterUsage = this.getStorageUsage();
    console.log('Storage after cleanup:', afterUsage);
    
    const savedKB = beforeUsage.totalSizeKB - afterUsage.totalSizeKB;
    console.log(`✅ Emergency cleanup complete! Freed ${savedKB}KB of storage`);
    
    return {
      clearedKeys,
      savedKB,
      beforeUsage,
      afterUsage
    };
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.StorageCleanup = StorageCleanup;
}

export default StorageCleanup;
