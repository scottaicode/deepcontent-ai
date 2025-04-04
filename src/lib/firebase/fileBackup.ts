/**
 * File Backup Utility
 * 
 * This utility provides a way to save content as local files when 
 * Firestore operations fail. It's a fallback mechanism for when 
 * database connectivity or permissions are causing issues.
 */

/**
 * Save content to a local text file by triggering a browser download.
 * This can be used as a fallback when Firestore saves fail.
 */
export const saveContentAsLocalFile = (
  content: string,
  title: string = 'content',
  format: 'txt' | 'html' | 'md' = 'txt'
): string | void => {
  if (!content) {
    console.error('[LocalBackup] No content provided for download');
    return;
  }

  try {
    console.log('[LocalBackup] Creating local file backup for content');
    
    // Create file name with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${title.replace(/[^\w\s-]/g, '')}-${timestamp}.${format}`;
    
    // Create blob and download link
    const file = new Blob([content], { type: 'text/plain' });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    
    // Trigger download
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    console.log('[LocalBackup] File download initiated:', fileName);
    return fileName;
  } catch (error) {
    console.error('[LocalBackup] Error creating local file backup:', error);
    return;
  }
};

/**
 * Function to offer saving content as a local file
 * with a confirmation dialog
 */
export const offerLocalBackup = (
  content: string,
  title: string = 'content'
): void => {
  if (window.confirm(
    'Would you like to save your content as a local file instead? ' +
    'This can be useful when the database is unavailable.'
  )) {
    saveContentAsLocalFile(content, title);
  }
}; 