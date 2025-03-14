# Tree Shaking Technical Details

This document provides a deep dive into how the Babel plugin for tree-shaking employee code works at a technical level.

## Core Architecture

The plugin works directly with Babel's Abstract Syntax Tree (AST) to locate, track, and remove code marked with `@employee-code`. It tracks dependencies between removed code to ensure reference integrity.

### Plugin Workflow

1. Plugin initialization
2. AST traversal and annotation detection
3. Code removal and reference cleanup
4. AST reassembly

## Key Components

### 1. Import and Reference Tracking

```javascript
// Keep track of removed imports so we can also remove their references
const removedImports = new Set();
```

This Set tracks all identifiers (variable names, component names, etc.) that have been removed. When the plugin encounters a reference to something in this Set, it knows that reference should also be removed or replaced.

### 2. Critical Import Protection

The plugin defines lists of critical modules and imports that should never be removed:

```javascript
const CRITICAL_MODULES = [
  'react',
  'react-native',
  'react/jsx-runtime',
  'react/jsx-dev-runtime'
];

const CRITICAL_IMPORTS = [
  'StyleSheet',
  'View',
  'Text',
  '_jsx',
  '_jsxs',
  '_jsxDEV',
  // ... other critical imports
];
```

The plugin uses these lists to ensure it never breaks core React/React Native functionality, even if they appear in employee-code sections.

### 3. AST Node Visitors

Babel plugins work by providing "visitors" for different types of AST nodes. Our plugin provides custom behavior for:

- ImportDeclaration: Handles import statements
- JSXElement: Handles JSX components
- VariableDeclaration: Handles variable declarations
- LogicalExpression: Handles conditions like `isEmployee && <Component/>`
- Identifier: Handles references to variables/components
- ... and more

## Technical Flow

### 1. Comment Detection

Comments are detected in three main ways:

```javascript
// Direct comments attached to a node
const leadingComments = path.node.leadingComments || [];
const trailingComments = path.node.trailingComments || [];

// Testing for @employee-code
if (hasEmployeeCodeComment([...leadingComments, ...trailingComments])) {
  // Process this node for removal
}
```

For JSX elements, the plugin also checks:
- Comments on the opening element
- Comments in parent containers
- Standalone comments near the element

### 2. Node Removal Decision Logic

The core decision function `shouldRemoveNode()` determines if a particular AST node should be removed:

```javascript
const shouldRemoveNode = (path) => {
  // Check direct comments on the node
  if (hasEmployeeCodeComment([...leadingComments, ...trailingComments])) {
    // Special case handling for imports...
    
    return true; // Remove this node
  }
  
  // Other checks for JSX, variables, etc.
  
  return false; // Keep this node
}
```

This function handles special cases like:
- Import declarations that need protection
- JSX elements with specific comment patterns
- References to already-removed imports

### 3. Reference Substitution

When a node can't be completely removed (e.g., because it's referenced elsewhere), it's substituted with a safe value:

```javascript
// For JSX expressions like {IS_EMPLOYEE_MODE && <Component/>}
if (t.isJSXExpressionContainer(path.node) && 
    t.isLogicalExpression(path.node.expression) && 
    path.node.expression.operator === '&&') {
  
  // Replace with null (renders nothing)
  path.replaceWith(t.jsxExpressionContainer(t.nullLiteral()));
}

// For variable references
if (t.isIdentifier(path.node) && removedImports.has(path.node.name)) {
  // Replace with undefined
  path.replaceWith(t.identifier('undefined'));
}
```

## Example: Processing an Import

When the plugin encounters an import like:

```javascript
// @employee-code
import SensitiveComponent from './SensitiveComponent';
```

Here's the exact flow:

1. The ImportDeclaration visitor is triggered
2. `shouldRemoveNode()` checks for @employee-code comments
3. When found, it extracts the import names (SensitiveComponent)
4. Checks if this is a critical import (it's not)
5. Adds "SensitiveComponent" to the removedImports Set
6. Removes the import statement from the AST
7. Later, when JSX like `<SensitiveComponent/>` is encountered, it will be removed because "SensitiveComponent" is in the removedImports Set

## Example: Processing a JSX Element

For JSX with a comment:

```jsx
{/* @employee-code */}
<EmployeeView>
  <Text>Employee Only</Text>
</EmployeeView>
```

1. The JSXElement visitor is triggered for the EmployeeView element
2. The plugin checks for nearby @employee-code comments
3. When found, it removes the entire element including children
4. If EmployeeView was imported with @employee-code, the import would already be tracked and removed

## Edge Cases Handled

1. **JSX comment positioning**: Because JSX comments are not directly attached to the AST node in Babel, the plugin uses location data and proximity checks to correlate comments with their JSX elements.

2. **Partial import removal**: If only some imports from a module are marked with @employee-code, only those specific imports are tracked and removed.

3. **Critical dependency protection**: Even if a critical import like StyleSheet is accidentally marked, it won't be removed.

4. **Reference chain removal**: If component A uses component B, and B is removed, references to B in A are handled properly.

## Debugging and Logging

The plugin provides a simple logging mechanism to track its activity:

```javascript
// At the end of processing
if (removedImports.size > 0) {
  console.log(`Tree-shaking: Removed employee code components: ${Array.from(removedImports).join(', ')}`);
}
```

This helps verify that the expected components were actually removed.

## How to Extend the Plugin

To add support for additional AST node types:
1. Add a new visitor to the `visitor` object
2. Implement the appropriate checks and removal logic
3. Consider adding tracking for any new identifiers

For example, to add support for class methods:

```javascript
ClassMethod(path) {
  if (shouldRemoveNode(path)) {
    path.remove();
  }
}
```

## Plugin Performance

The plugin performs a single pass over the AST with multiple visitors, making it relatively efficient. The tracking of removed imports adds minimal overhead while ensuring correct reference handling.

## Low-Level Usage

### 1. Installation

Place the plugin file in your project:
```
scripts/babel-plugins/babel-plugin-tree-shake-employee-code.js
```

### 2. Babel Configuration

Configure Babel to use the plugin conditionally:

```javascript
module.exports = function(api) {
  api.cache(true);
  
  const plugins = [];
  
  if (process.env.INCLUDE_EMPLOYEE_CODE !== 'true') {
    plugins.push('./scripts/babel-plugins/babel-plugin-tree-shake-employee-code');
  }
  
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
```

### 3. Metro Configuration (if needed)

For React Native projects, you might need to configure Metro:

```javascript
// metro.config.js
module.exports = {
  transformer: {
    babelTransformerPath: require.resolve('./scripts/custom-transformer.js'),
  },
  // other metro config options...
};

// scripts/custom-transformer.js
const { transform } = require('@babel/core');
const customBabelConfig = require('./your-babel-config');

module.exports.transform = function({ src, filename, options }) {
  return transform(src, {
    ...customBabelConfig,
    filename,
  });
};
```

### 4. Environment Variable Usage

Set the environment variable to control the tree-shaking:

```bash
# For development with employee code
INCLUDE_EMPLOYEE_CODE=true npx expo start

# For production/customer builds without employee code
INCLUDE_EMPLOYEE_CODE=false npx expo start
```

You can also set this in npm scripts:

```json
"scripts": {
  "start:employee": "INCLUDE_EMPLOYEE_CODE=true expo start",
  "start:customer": "INCLUDE_EMPLOYEE_CODE=false expo start",
  "build:customer": "INCLUDE_EMPLOYEE_CODE=false expo build"
}
``` 