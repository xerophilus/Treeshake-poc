// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  
  // Clear the Metro cache when in development
  config.cacheStores = [];
  
  // Log the environment variable
  console.log('Metro config - INCLUDE_EMPLOYEE_CODE:', process.env.INCLUDE_EMPLOYEE_CODE);
  
  return config;
})(); 