#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Add shebang and make files executable for global npm installation
const shebang = '#!/usr/bin/env node\n';
const files = ['gcf-server.js', 'gcf-client.js'];
const distDir = path.join(__dirname, 'dist');

for (const file of files) {
  const filePath = path.join(distDir, file);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Only add shebang if it doesn't already exist
    if (!content.startsWith('#!')) {
      fs.writeFileSync(filePath, shebang + content);
      console.log(`Added shebang to ${file}`);
      
      // Make file executable
      try {
        fs.chmodSync(filePath, '755');
        console.log(`Made ${file} executable`);
      } catch (error) {
        console.error(`Failed to make ${file} executable:`, error.message);
      }
    } else {
      console.log(`Shebang already exists in ${file}`);
    }
  } else {
    console.error(`File ${file} does not exist in dist directory`);
  }
}