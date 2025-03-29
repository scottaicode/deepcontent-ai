const fs = require('fs');
const path = require('path');

// Path to the file
const filePath = path.join(__dirname, 'src', 'components', 'ContentForm.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Define the exact text to find and replace
// First disclaimer panel (Information panel for platform selection)
const panel1Text = `            {/* Information panel for platform selection */}
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your selection will be preserved throughout the content creation flow. You'll be able to review but not change this platform during research.
                  </p>
                </div>
              </div>
            </div>`;

const panel1Replacement = `            {/* Information panel removed for cleaner UI */}`;

// Second disclaimer panel (Content type information panel)
const panel2Text = `        {/* Content type information panel */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mt-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Content Type</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                  {getContentType().replace('-', ' ')}
                </span>
              </div>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                Content type is automatically determined based on your selected platform to ensure optimal formatting.
              </p>
            </div>
          </div>
        </div>`;

const panel2Replacement = `        {/* Content type information panel removed for cleaner UI */}`;

// Replace the panels with our replacements
let newContent = content.replace(panel1Text, panel1Replacement);
newContent = newContent.replace(panel2Text, panel2Replacement);

// Write the updated content back to the file
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('ContentForm.tsx successfully updated!'); 