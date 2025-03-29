// Script to remove YouTube transcript component and add a message
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/create/research/page.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Find the YouTube component section
const youtubeComponentRegex = /{\/\* YouTube Transcript Analysis.*?<\/div>\s*<\/div>\s*<\/div>\s*}/s;

// Replacement message
const replacementMessage = `              {/* YouTube transcript feature moved to first page */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">YouTube Transcript Feature</h3>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      The YouTube transcript feature is now available on the first page of the content creation process.
                      {safeContentDetails.youtubeTranscript && (
                        <> Your transcript from <strong>{safeContentDetails.youtubeUrl}</strong> has been included in your research.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>`;

// Replace the component with the message
content = content.replace(youtubeComponentRegex, replacementMessage);

// Write the modified content back to the file
fs.writeFileSync(filePath, content);

console.log('YouTube transcript component replaced successfully!'); 