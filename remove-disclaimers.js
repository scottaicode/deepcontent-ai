const fs = require('fs');
const path = require('path');

// Path to the file
const filePath = path.join(__dirname, 'src', 'components', 'ContentForm.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Define the patterns for the two sections to remove
const platformDisclaimerStart = '            {/* Information panel for platform selection */}';
const platformDisclaimerEnd = '            </div>';

const contentTypeDisclaimerStart = '        {/* Content type information panel */}';
const contentTypeDisclaimerEnd = '        </div>';

// Find the position of the first disclaimer
const platformDisclaimerStartIndex = content.indexOf(platformDisclaimerStart);
if (platformDisclaimerStartIndex === -1) {
  console.error('Could not find platform disclaimer start');
  process.exit(1);
}

// Find the end of the first disclaimer section
let platformDisclaimerEndIndex = -1;
let searchIndex = platformDisclaimerStartIndex + platformDisclaimerStart.length;
let divCount = 1; // We're already inside one div

while (searchIndex < content.length && divCount > 0) {
  const openDivIndex = content.indexOf('<div', searchIndex);
  const closeDivIndex = content.indexOf('</div>', searchIndex);
  
  // If we find an opening div before a closing div, increment the count
  if (openDivIndex !== -1 && (closeDivIndex === -1 || openDivIndex < closeDivIndex)) {
    divCount++;
    searchIndex = openDivIndex + 4;
  } 
  // If we find a closing div, decrement the count
  else if (closeDivIndex !== -1) {
    divCount--;
    searchIndex = closeDivIndex + 6;
    if (divCount === 0) {
      platformDisclaimerEndIndex = closeDivIndex + 6;
    }
  } else {
    // Something went wrong
    console.error('Could not find matching divs for platform disclaimer');
    process.exit(1);
  }
}

// Now find the position of the second disclaimer
const contentTypeDisclaimerStartIndex = content.indexOf(contentTypeDisclaimerStart);
if (contentTypeDisclaimerStartIndex === -1) {
  console.error('Could not find content type disclaimer start');
  process.exit(1);
}

// Find the end of the second disclaimer section
let contentTypeDisclaimerEndIndex = -1;
searchIndex = contentTypeDisclaimerStartIndex + contentTypeDisclaimerStart.length;
divCount = 1; // We're already inside one div

while (searchIndex < content.length && divCount > 0) {
  const openDivIndex = content.indexOf('<div', searchIndex);
  const closeDivIndex = content.indexOf('</div>', searchIndex);
  
  // If we find an opening div before a closing div, increment the count
  if (openDivIndex !== -1 && (closeDivIndex === -1 || openDivIndex < closeDivIndex)) {
    divCount++;
    searchIndex = openDivIndex + 4;
  } 
  // If we find a closing div, decrement the count
  else if (closeDivIndex !== -1) {
    divCount--;
    searchIndex = closeDivIndex + 6;
    if (divCount === 0) {
      contentTypeDisclaimerEndIndex = closeDivIndex + 6;
    }
  } else {
    // Something went wrong
    console.error('Could not find matching divs for content type disclaimer');
    process.exit(1);
  }
}

// Remove the first disclaimer
const contentBeforeFirstDisclaimer = content.substring(0, platformDisclaimerStartIndex);
const contentBetweenDisclaimers = content.substring(platformDisclaimerEndIndex, contentTypeDisclaimerStartIndex);
const contentAfterSecondDisclaimer = content.substring(contentTypeDisclaimerEndIndex);

// Create the new content with both disclaimers removed
const newContent = 
  contentBeforeFirstDisclaimer + 
  contentBetweenDisclaimers + 
  contentAfterSecondDisclaimer;

// Write the result back to the file
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('Disclaimers successfully removed!'); 