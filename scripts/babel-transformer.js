/**
 * Custom Babel transformer for Metro
 * This ensures our tree-shaking plugin is applied correctly
 */
const babelTransformerPath = require.resolve('metro-react-native-babel-transformer');
const babelTransformer = require(babelTransformerPath);
const fs = require('fs');
const path = require('path');

// For debugging
console.log('Loading custom Babel transformer for tree shaking');

// Load our plugin
const treeShakePlugin = require('./babel-plugins/babel-plugin-tree-shake-employee-code');

// Check if employee code should be included
const includeEmployeeCode = process.env.INCLUDE_EMPLOYEE_CODE === 'true';
console.log(`INCLUDE_EMPLOYEE_CODE set to: ${process.env.INCLUDE_EMPLOYEE_CODE}`);
console.log(`Employee code will be ${includeEmployeeCode ? 'included' : 'removed'}`);

// Custom transform function that adds our plugin
function transform(props) {
  // Get the source file for debugging
  const { filename, src } = props;
  const relativePath = path.relative(process.cwd(), filename);
  
  // Only process .tsx, .ts, and .jsx files
  if (/\.(tsx|ts|jsx|js)$/.test(filename)) {
    console.log(`Transforming ${relativePath}`);
    
    // Logging for employee code in this file
    if (src && src.includes('@employee-code')) {
      console.log(`Found @employee-code in ${relativePath}`);
    }
    
    // Add our plugin if we're in customer mode
    if (!includeEmployeeCode) {
      const customOptions = {
        ...props.options,
        plugins: [
          ...(props.options.plugins || []),
          treeShakePlugin,
        ],
      };
      
      // Use the new options with our plugin
      return babelTransformer.transform({
        ...props,
        options: customOptions,
      });
    }
  }
  
  // Otherwise, use the default transform
  return babelTransformer.transform(props);
}

module.exports = {
  transform,
}; 