/**
 * Script to completely clear the Metro bundler cache
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('Clearing Metro bundler cache...');

// Clear the Metro cache
try {
  // Try to delete the .metro folder
  const metroDir = path.join(os.homedir(), '.metro');
  if (fs.existsSync(metroDir)) {
    console.log(`Removing Metro cache directory: ${metroDir}`);
    execSync(`rm -rf "${metroDir}"`);
  }
  
  // Try to delete the node_modules/.cache folder
  const nodeModulesCacheDir = path.join(__dirname, '..', 'node_modules', '.cache');
  if (fs.existsSync(nodeModulesCacheDir)) {
    console.log(`Removing node_modules cache: ${nodeModulesCacheDir}`);
    execSync(`rm -rf "${nodeModulesCacheDir}"`);
  }
  
  // Clear the Expo cache but don't start Expo
  console.log('Clearing Expo cache...');
  execSync('npx expo start --clear --non-interactive --no-dev --no-minify', { stdio: 'inherit' });
  // Kill the process after a short delay (it will have created the cache by then)
  setTimeout(() => {
    console.log('Killing the Expo process...');
    process.exit(0);
  }, 2000);
  
  console.log('Metro cache cleared successfully!');
} catch (error) {
  console.error('Error clearing Metro cache:', error);
  process.exit(1);
} 