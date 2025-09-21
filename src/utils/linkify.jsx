// Utility functions for converting text to clickable links and handling rich content

/**
 * Convert URLs in text to clickable links
 * @param {string} text - The text to process
 * @returns {JSX.Element} - React element with clickable links
 */
export function linkifyText(text) {
  if (!text) return null;

  // URL regex pattern that matches http, https, www, and domain.com patterns
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.(?:[a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})(?:\/[^\s]*)?)/gi;
  
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Ensure URL has protocol
      let url = part;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors duration-200"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

/**
 * Convert email addresses in text to clickable mailto links
 * @param {string} text - The text to process
 * @returns {JSX.Element} - React element with clickable email links
 */
export function linkifyEmails(text) {
  if (!text) return null;

  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const parts = text.split(emailRegex);
  
  return parts.map((part, index) => {
    if (emailRegex.test(part)) {
      return (
        <a
          key={index}
          href={`mailto:${part}`}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors duration-200"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

/**
 * Process text to convert both URLs and emails to clickable links
 * @param {string} text - The text to process
 * @returns {JSX.Element} - React element with all links clickable
 */
export function processTextLinks(text) {
  if (!text) return null;

  // First process URLs, then emails
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.(?:[a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})(?:\/[^\s]*)?)/gi;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  
  // Split by URLs first
  const urlParts = text.split(urlRegex);
  
  return urlParts.map((urlPart, urlIndex) => {
    if (urlRegex.test(urlPart)) {
      // This is a URL
      let url = urlPart;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      return (
        <a
          key={`url-${urlIndex}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors duration-200"
        >
          {urlPart}
        </a>
      );
    } else {
      // Process this part for emails
      const emailParts = urlPart.split(emailRegex);
      return emailParts.map((emailPart, emailIndex) => {
        if (emailRegex.test(emailPart)) {
          return (
            <a
              key={`email-${urlIndex}-${emailIndex}`}
              href={`mailto:${emailPart}`}
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors duration-200"
            >
              {emailPart}
            </a>
          );
        }
        return emailPart;
      });
    }
  });
}

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type icon based on file extension
 * @param {string} filename - The filename
 * @returns {string} - Icon name for the file type
 */
export function getFileTypeIcon(filename) {
  if (!filename) return 'File';
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const iconMap = {
    // Images
    jpg: 'Image',
    jpeg: 'Image',
    png: 'Image',
    gif: 'Image',
    svg: 'Image',
    webp: 'Image',
    
    // Documents
    pdf: 'FileText',
    doc: 'FileText',
    docx: 'FileText',
    txt: 'FileText',
    rtf: 'FileText',
    
    // Spreadsheets
    xls: 'Sheet',
    xlsx: 'Sheet',
    csv: 'Sheet',
    
    // Presentations
    ppt: 'Presentation',
    pptx: 'Presentation',
    
    // Archives
    zip: 'Archive',
    rar: 'Archive',
    '7z': 'Archive',
    tar: 'Archive',
    gz: 'Archive',
    
    // Code
    js: 'Code',
    html: 'Code',
    css: 'Code',
    json: 'Code',
    xml: 'Code',
    
    // Video
    mp4: 'Video',
    avi: 'Video',
    mov: 'Video',
    wmv: 'Video',
    
    // Audio
    mp3: 'Music',
    wav: 'Music',
    flac: 'Music',
    
    // Default
    default: 'File'
  };
  
  return iconMap[extension] || iconMap.default;
}
