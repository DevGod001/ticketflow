// Local Comment Service for Development
class LocalCommentService {
  constructor() {
    this.COMMENTS_KEY = 'ticketflow_comments';
    this.MAX_COMMENTS = 5000; // Maximum comments to keep in localStorage
    this.CLEANUP_THRESHOLD = 0.8; // Clean up when 80% of max is reached
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.COMMENTS_KEY)) {
      localStorage.setItem(this.COMMENTS_KEY, JSON.stringify([]));
    }
    this.checkStorageQuota();
  }

  checkStorageQuota() {
    try {
      const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
      
      // If we're approaching the limit, clean up old comments
      if (comments.length > this.MAX_COMMENTS * this.CLEANUP_THRESHOLD) {
        this.cleanupOldComments();
      }
    } catch (error) {
      console.warn('Comment storage quota check failed:', error);
      // If we can't parse, reset the storage
      localStorage.setItem(this.COMMENTS_KEY, JSON.stringify([]));
    }
  }

  cleanupOldComments() {
    try {
      const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
      
      // Sort by created_date (oldest first) and keep only the most recent comments
      const sortedComments = comments.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
      
      // Keep only the most recent 70% of max comments
      const keepCount = Math.floor(this.MAX_COMMENTS * 0.7);
      const cleanedComments = sortedComments.slice(0, keepCount);
      
      localStorage.setItem(this.COMMENTS_KEY, JSON.stringify(cleanedComments));
      console.log(`Cleaned up ${comments.length - cleanedComments.length} old comments`);
    } catch (error) {
      console.error('Failed to cleanup old comments:', error);
      // If cleanup fails, reset storage
      localStorage.setItem(this.COMMENTS_KEY, JSON.stringify([]));
    }
  }

  generateId() {
    return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async create(commentData) {
    try {
      // Check storage quota before creating
      this.checkStorageQuota();
      
      const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
      
      const newComment = {
        id: this.generateId(),
        ...commentData,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        edited_at: null,
        mentions: commentData.mentions || [],
        attachments: commentData.attachments || []
      };

      comments.push(newComment);
      
      // Try to save, if it fails due to quota, clean up and try again
      try {
        localStorage.setItem(this.COMMENTS_KEY, JSON.stringify(comments));
      } catch (storageError) {
        if (storageError.name === 'QuotaExceededError' || storageError.message.includes('quota')) {
          console.warn('Comment storage quota exceeded, cleaning up...');
          this.cleanupOldComments();
          
          // Try again with cleaned up storage
          const cleanedComments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
          cleanedComments.push(newComment);
          localStorage.setItem(this.COMMENTS_KEY, JSON.stringify(cleanedComments));
        } else {
          throw storageError;
        }
      }
      
      return newComment;
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw new Error(`Failed to create comment: ${error.message}`);
    }
  }

  async filter(criteria = {}, sortBy = '-created_date', limit = null) {
    try {
      const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
      
      let filtered = comments.filter(comment => {
        // Apply filters
        for (const [key, value] of Object.entries(criteria)) {
          if (value === null || value === undefined) continue;
          
          if (key === 'ticket_id' && comment.ticket_id !== value) {
            return false;
          }
          if (key === 'id' && comment.id !== value) {
            return false;
          }
          if (key === 'author_email' && comment.author_email !== value) {
            return false;
          }
          if (key === 'parent_comment_id' && comment.parent_comment_id !== value) {
            return false;
          }
          if (key === 'organization_id' && comment.organization_id !== value) {
            return false;
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

      // Apply limit
      if (limit && limit > 0) {
        filtered = filtered.slice(0, limit);
      }

      return filtered;
    } catch (error) {
      throw new Error(`Failed to filter comments: ${error.message}`);
    }
  }

  async update(id, updateData) {
    try {
      const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
      const commentIndex = comments.findIndex(comment => comment.id === id);
      
      if (commentIndex === -1) {
        throw new Error('Comment not found');
      }

      comments[commentIndex] = {
        ...comments[commentIndex],
        ...updateData,
        updated_date: new Date().toISOString()
      };

      localStorage.setItem(this.COMMENTS_KEY, JSON.stringify(comments));
      return comments[commentIndex];
    } catch (error) {
      throw new Error(`Failed to update comment: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
      const filteredComments = comments.filter(comment => comment.id !== id);
      
      if (filteredComments.length === comments.length) {
        throw new Error('Comment not found');
      }

      localStorage.setItem(this.COMMENTS_KEY, JSON.stringify(filteredComments));
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  async get(id) {
    try {
      const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
      const comment = comments.find(comment => comment.id === id);
      
      if (!comment) {
        throw new Error('Comment not found');
      }

      return comment;
    } catch (error) {
      throw new Error(`Failed to get comment: ${error.message}`);
    }
  }

  // Get comments for a specific ticket
  async getByTicket(ticketId, includeReplies = true) {
    try {
      const criteria = { ticket_id: ticketId };
      return await this.filter(criteria, '-created_date');
    } catch (error) {
      throw new Error(`Failed to get comments for ticket: ${error.message}`);
    }
  }

  // Get replies to a specific comment
  async getReplies(parentCommentId) {
    try {
      const criteria = { parent_comment_id: parentCommentId };
      return await this.filter(criteria, 'created_date'); // Ascending order for replies
    } catch (error) {
      throw new Error(`Failed to get replies: ${error.message}`);
    }
  }

  // Get comments by author
  async getByAuthor(authorEmail, limit = null) {
    try {
      const criteria = { author_email: authorEmail };
      return await this.filter(criteria, '-created_date', limit);
    } catch (error) {
      throw new Error(`Failed to get comments by author: ${error.message}`);
    }
  }

  // Get comments with mentions of a specific user
  async getMentions(userEmail, limit = null) {
    try {
      const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
      
      const mentionedComments = comments.filter(comment => 
        comment.mentions && comment.mentions.includes(userEmail)
      );
      
      // Sort by created_date descending
      mentionedComments.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
      
      if (limit && limit > 0) {
        return mentionedComments.slice(0, limit);
      }
      
      return mentionedComments;
    } catch (error) {
      throw new Error(`Failed to get mentions: ${error.message}`);
    }
  }

  // Get comment statistics
  async getStats(ticketId = null) {
    try {
      const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
      
      let filteredComments = comments;
      if (ticketId) {
        filteredComments = comments.filter(c => c.ticket_id === ticketId);
      }
      
      const stats = {
        total: filteredComments.length,
        topLevel: filteredComments.filter(c => !c.parent_comment_id).length,
        replies: filteredComments.filter(c => c.parent_comment_id).length,
        withAttachments: filteredComments.filter(c => c.attachments && c.attachments.length > 0).length,
        withMentions: filteredComments.filter(c => c.mentions && c.mentions.length > 0).length,
        edited: filteredComments.filter(c => c.edited_at).length,
        authors: [...new Set(filteredComments.map(c => c.author_email))].length
      };
      
      return stats;
    } catch (error) {
      throw new Error(`Failed to get comment stats: ${error.message}`);
    }
  }

  // Get all comments (for debugging)
  async getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
    } catch (error) {
      throw new Error(`Failed to get all comments: ${error.message}`);
    }
  }

  // Clear all comments (for debugging)
  async clearAll() {
    try {
      localStorage.setItem(this.COMMENTS_KEY, JSON.stringify([]));
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to clear comments: ${error.message}`);
    }
  }
}

export const LocalComment = new LocalCommentService();
