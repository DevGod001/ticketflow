// Local File Upload Service for Development with Smart Storage Management
class LocalFileUploadService {
  constructor() {
    this.UPLOADS_KEY = 'ticketflow_uploads';
    this.MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per file
    this.MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB total storage
    this.MAX_FILES = 50; // Maximum number of files
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.UPLOADS_KEY)) {
      localStorage.setItem(this.UPLOADS_KEY, JSON.stringify({}));
    }
    // Clean up old files on initialization
    this.cleanupOldFiles();
  }

  // Get storage size in bytes
  getStorageSize() {
    try {
      const uploads = JSON.parse(localStorage.getItem(this.UPLOADS_KEY) || '{}');
      const jsonString = JSON.stringify(uploads);
      return new Blob([jsonString]).size;
    } catch (error) {
      console.warn('Error calculating storage size:', error);
      return 0;
    }
  }

  // Clean up old files to free space
  cleanupOldFiles() {
    try {
      const uploads = JSON.parse(localStorage.getItem(this.UPLOADS_KEY) || '{}');
      const files = Object.values(uploads);
      
      // Sort by upload date (oldest first)
      files.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
      
      // Remove files older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      let cleaned = false;
      files.forEach(file => {
        if (new Date(file.uploadedAt) < sevenDaysAgo) {
          delete uploads[file.id];
          cleaned = true;
        }
      });
      
      // If still too many files, remove oldest ones
      const remainingFiles = Object.values(uploads);
      if (remainingFiles.length > this.MAX_FILES) {
        remainingFiles.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
        const filesToRemove = remainingFiles.slice(0, remainingFiles.length - this.MAX_FILES);
        filesToRemove.forEach(file => {
          delete uploads[file.id];
          cleaned = true;
        });
      }
      
      if (cleaned) {
        localStorage.setItem(this.UPLOADS_KEY, JSON.stringify(uploads));
        console.log('Cleaned up old uploaded files');
      }
    } catch (error) {
      console.warn('Error during file cleanup:', error);
    }
  }

  // Free up space by removing oldest files
  freeUpSpace(targetSize) {
    try {
      const uploads = JSON.parse(localStorage.getItem(this.UPLOADS_KEY) || '{}');
      const files = Object.values(uploads);
      
      // Sort by upload date (oldest first)
      files.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
      
      let currentSize = this.getStorageSize();
      let removedCount = 0;
      
      for (const file of files) {
        if (currentSize <= targetSize) break;
        
        delete uploads[file.id];
        removedCount++;
        
        // Recalculate size
        currentSize = new Blob([JSON.stringify(uploads)]).size;
      }
      
      if (removedCount > 0) {
        localStorage.setItem(this.UPLOADS_KEY, JSON.stringify(uploads));
        console.log(`Freed up space by removing ${removedCount} old files`);
      }
      
      return removedCount;
    } catch (error) {
      console.warn('Error freeing up space:', error);
      return 0;
    }
  }

  // Convert file to base64 data URL for local storage
  async fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Compress image if it's too large
  async compressImage(file) {
    if (!file.type.startsWith('image/')) {
      return file; // Don't compress non-images
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 1200px width/height)
        const maxSize = 1200;
        let { width, height } = img;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob && blob.size < file.size) {
            // Create a new file with compressed data
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Use original if compression didn't help
          }
        }, file.type, 0.8); // 80% quality
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  // Upload file and return a local URL
  async uploadFile(file) {
    try {
      // Check file size limit
      if (file.size > this.MAX_FILE_SIZE) {
        // Try to compress if it's an image
        if (file.type.startsWith('image/')) {
          file = await this.compressImage(file);
          if (file.size > this.MAX_FILE_SIZE) {
            throw new Error(`File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
          }
        } else {
          throw new Error(`File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
        }
      }

      // Clean up old files first
      this.cleanupOldFiles();
      
      // Check if we need to free up space
      const currentSize = this.getStorageSize();
      if (currentSize > this.MAX_TOTAL_SIZE * 0.8) { // Start cleanup at 80% capacity
        this.freeUpSpace(this.MAX_TOTAL_SIZE * 0.6); // Free up to 60% capacity
      }
      
      // Convert file to data URL
      const dataURL = await this.fileToDataURL(file);
      
      // Generate a unique ID for the file
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store the file data
      const uploads = JSON.parse(localStorage.getItem(this.UPLOADS_KEY) || '{}');
      uploads[fileId] = {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        dataURL: dataURL,
        uploadedAt: new Date().toISOString()
      };
      
      try {
        localStorage.setItem(this.UPLOADS_KEY, JSON.stringify(uploads));
      } catch (storageError) {
        // If storage fails, try to free up more space and retry
        console.warn('Storage full, attempting to free up space...');
        this.freeUpSpace(this.MAX_TOTAL_SIZE * 0.4); // More aggressive cleanup
        
        try {
          localStorage.setItem(this.UPLOADS_KEY, JSON.stringify(uploads));
        } catch (retryError) {
          throw new Error('Storage quota exceeded. Please try uploading a smaller file or clear some data.');
        }
      }
      
      // Return the data URL as the file_url (this will be used as src for images)
      return {
        file_url: dataURL,
        file_id: fileId,
        file_name: file.name
      };
    } catch (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  // Get file by ID (if needed)
  getFile(fileId) {
    const uploads = JSON.parse(localStorage.getItem(this.UPLOADS_KEY) || '{}');
    return uploads[fileId] || null;
  }

  // Delete file (if needed)
  deleteFile(fileId) {
    const uploads = JSON.parse(localStorage.getItem(this.UPLOADS_KEY) || '{}');
    delete uploads[fileId];
    localStorage.setItem(this.UPLOADS_KEY, JSON.stringify(uploads));
  }

  // Get all uploaded files (if needed)
  getAllFiles() {
    return JSON.parse(localStorage.getItem(this.UPLOADS_KEY) || '{}');
  }

  // Get storage statistics
  getStorageStats() {
    const uploads = JSON.parse(localStorage.getItem(this.UPLOADS_KEY) || '{}');
    const files = Object.values(uploads);
    const totalSize = this.getStorageSize();
    
    return {
      fileCount: files.length,
      totalSize: totalSize,
      maxSize: this.MAX_TOTAL_SIZE,
      usagePercent: Math.round((totalSize / this.MAX_TOTAL_SIZE) * 100),
      oldestFile: files.length > 0 ? Math.min(...files.map(f => new Date(f.uploadedAt))) : null,
      newestFile: files.length > 0 ? Math.max(...files.map(f => new Date(f.uploadedAt))) : null
    };
  }

  // Clear all uploaded files (emergency cleanup)
  clearAllFiles() {
    localStorage.setItem(this.UPLOADS_KEY, JSON.stringify({}));
    console.log('Cleared all uploaded files');
  }
}

export const localFileUpload = new LocalFileUploadService();

// Override the UploadFile function for local development
export const UploadFile = async ({ file }) => {
  return await localFileUpload.uploadFile(file);
};
