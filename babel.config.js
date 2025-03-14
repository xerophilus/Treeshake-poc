module.exports = function(api) {
  api.cache(true);
  
  // Check if we should include employee code
  const includeEmployeeCode = process.env.INCLUDE_EMPLOYEE_CODE === 'true';
    
  const plugins = [];
  
  // Only add the tree-shaking plugin if we're NOT including employee code
  if (!includeEmployeeCode) {
    plugins.push('./scripts/babel-plugins/babel-plugin-tree-shake-employee-code');
  }
  
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
}; 