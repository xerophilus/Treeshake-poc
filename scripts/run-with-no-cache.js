/**
 * Script to run the app with clean caches and env variables
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Parse arguments
const args = process.argv.slice(2);
const isEmployee = args.includes('--employee');
const platform = args.find(arg => ['--ios', '--android', '--web'].includes(arg)) || '';

console.log(`Running in ${isEmployee ? 'EMPLOYEE' : 'CUSTOMER'} mode for ${platform.slice(2) || 'default'} platform`);

// Clean up Metro cache
const metroDir = path.join(os.homedir(), '.metro');
if (fs.existsSync(metroDir)) {
  console.log(`Removing Metro cache directory: ${metroDir}`);
  try {
    execSync(`rm -rf "${metroDir}"`);
  } catch (e) {
    console.warn('Failed to remove Metro cache directory:', e.message);
  }
}

// Clean node_modules/.cache
const nodeModulesCacheDir = path.join(__dirname, '..', 'node_modules', '.cache');
if (fs.existsSync(nodeModulesCacheDir)) {
  console.log(`Removing node_modules cache: ${nodeModulesCacheDir}`);
  try {
    execSync(`rm -rf "${nodeModulesCacheDir}"`);
  } catch (e) {
    console.warn('Failed to remove node_modules cache:', e.message);
  }
}

// Kill any running metro processes
try {
  console.log('Killing any Metro processes...');
  execSync('killall -9 node 2>/dev/null || true');
} catch (e) {
  // Ignore errors
}

// Run expo with appropriate flags
const includeEmployeeCode = isEmployee ? 'true' : 'false';
const platformFlag = platform || '';

console.log(`Starting Expo with INCLUDE_EMPLOYEE_CODE=${includeEmployeeCode}`);

try {
  // Use spawn to keep process alive until user terminates
  const command = `cross-env INCLUDE_EMPLOYEE_CODE=${includeEmployeeCode} expo start --clear ${platformFlag}`;
  console.log(`Running command: ${command}`);
  execSync(command, { stdio: 'inherit' });
} catch (error) {
  console.error('Error running expo:', error);
  process.exit(1);
} 