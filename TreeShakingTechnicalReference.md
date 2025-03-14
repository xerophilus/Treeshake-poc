# Tree-Shaking Technical Reference

This document provides a detailed technical explanation of the Babel plugin used for tree-shaking employee code in the Expo application.

## Plugin Architecture

The tree-shaking plugin uses Babel's AST (Abstract Syntax Tree) traversal to analyze and transform JavaScript code, removing elements marked with `@employee-code` comments when building customer versions.

### Core Components

The plugin is structured around several key components:

1. **AST Visitors**: Functions that handle different types of AST nodes (imports, JSX, variables, etc.)
2. **Comment Detection**: Logic to find and identify `@employee-code` comments
3. **Reference Tracking**: System to track dependencies between removed imports and their references
4. **Critical Module Protection**: Safeguards to ensure essential code is never removed

## Plugin Implementation

### Initialization

```javascript
module.exports = function(babel) {
  const { types: t } = babel;
  
  // Keep track of removed imports
  const removedImports = new Set();
  
  // Critical modules and imports that should never be removed
  const CRITICAL_MODULES = [
    'react',
    'react-native',
    'react/jsx-runtime',
    'react/jsx-dev-runtime'
  ];
  
  // Critical import specifiers
  const CRITICAL_IMPORTS = [
    'StyleSheet',
    'View',
    'Text',
    '_jsx',
    '_jsxs',
    '_jsxDEV',
    'Fragment',
    'jsx',
    'jsxs',
    'createElement'
  ];
  
  // ...plugin implementation follows
```

### Comment Detection

The plugin precisely identifies code with `@employee-code` annotations using several helper functions:

```javascript
// Check if a comment contains @employee-code
const isEmployeeCodeComment = (comment) => {
  return comment && comment.value && comment.value.includes('@employee-code');
};

// Check if any comment in an array contains @employee-code
const hasEmployeeCodeComment = (comments) => {
  if (!comments || !Array.isArray(comments)) return false;
  return comments.some(comment => isEmployeeCodeComment(comment));
};

// Track employee code comment line numbers
const findEmployeeCodeCommentLines = (path) => {
  const commentLines = new Set();
  const comments = path.hub.file.ast.comments || [];
  
  comments.forEach(comment => {
    if (isEmployeeCodeComment(comment) && comment.loc) {
      // Add only the exact line and the one after for JSX
      const lineNum = comment.loc.start.line;
      commentLines.add(lineNum);
      commentLines.add(lineNum + 1);
    }
  });
  
  return commentLines;
};
```

### Node Removal Logic

The plugin uses strict criteria to determine which nodes should be removed:

```javascript
const shouldRemoveNode = (path, employeeCodeLines) => {
  // Direct node comments - most reliable approach
  const leadingComments = path.node.leadingComments || [];
  const trailingComments = path.node.trailingComments || [];
  
  if (hasEmployeeCodeComment([...leadingComments, ...trailingComments])) {
    // Special handling for imports...
    // ...
    return true;
  }
  
  // More specific cases for different node types...
  // ...
  
  return false;
};
```

### AST Visitors

The plugin registers visitors for different node types:

```javascript
return {
  name: 'tree-shake-employee-code',
  visitor: {
    Program: { /* ... */ },
    ImportDeclaration: { /* ... */ },
    JSXElement: { /* ... */ },
    JSXExpressionContainer: { /* ... */ },
    LogicalExpression: { /* ... */ },
    FunctionDeclaration: { /* ... */ },
    VariableDeclaration: { /* ... */ },
    ExpressionStatement: { /* ... */ },
    ObjectProperty: { /* ... */ },
    ClassProperty: { /* ... */ },
    Identifier: { /* ... */ }
  }
};
```

## Enhanced Precision in Latest Version

The current implementation has been updated to be much more precise about what gets removed:

### 1. Direct Annotation Requirement

Most node types now require the `@employee-code` annotation to be directly on them:

```javascript
// Only remove variable declarations that are directly annotated
const hasDirectComment = hasEmployeeCodeComment(path.node.leadingComments) || 
                      hasEmployeeCodeComment(path.node.trailingComments);
                      
if (hasDirectComment) {
  // Track and remove the declaration
  // ...
}
```

### 2. Style Property Handling

The plugin tracks style properties that are marked as employee-only:

```javascript
// Find employee-only styles in StyleSheet.create
CallExpression(callPath) {
  if (callPath.node.callee &&
      t.isMemberExpression(callPath.node.callee) &&
      callPath.node.callee.object.name === 'StyleSheet' &&
      callPath.node.callee.property.name === 'create') {
    
    // Check for object properties with @employee-code comments
    const styleObj = callPath.node.arguments[0];
    if (t.isObjectExpression(styleObj)) {
      styleObj.properties.forEach(prop => {
        if (hasEmployeeCodeComment(prop.leadingComments || []) ||
            hasEmployeeCodeComment(prop.trailingComments || [])) {
          // Track these style names to remove elements using them
          if (prop.key && prop.key.name) {
            removedImports.add('styles.' + prop.key.name);
          }
        }
      });
    }
  }
}
```

### 3. JSX Element Handling

JSX elements with style props that reference employee-only styles are also removed:

```javascript
// Check for style references like styles.employeeSection
if (t.isMemberExpression(expr) && 
    expr.object.name === 'styles' && 
    removedImports.has('styles.' + expr.property.name)) {
  path.remove();
  break;
}
```

## Environment Variable Control

The plugin is controlled by the `INCLUDE_EMPLOYEE_CODE` environment variable:

- When `INCLUDE_EMPLOYEE_CODE=true`: The plugin is disabled, and all code is included
- When `INCLUDE_EMPLOYEE_CODE=false`: The plugin removes all code marked with `@employee-code`

## Edge Cases and Special Handling

### 1. Critical Import Protection

The plugin ensures that core React and React Native functionality is never removed, even if marked:

```javascript
// Never remove critical imports
if (isCriticalImport(importSource, importedNames)) {
  return false;
}
```

### 2. Reference Substitution

References to removed imports are replaced with `undefined`:

```javascript
// Only replace identifiers that we know are from removed imports
if (removedImports.has(path.node.name) && 
    !t.isImportSpecifier(path.parent) && 
    !t.isImportDefaultSpecifier(path.parent)) {
  path.replaceWith(t.identifier('undefined'));
}
```

### 3. Logical Expression Replacement

Logical expressions using employee mode checks are replaced with `false`:

```javascript
// Only remove logical expressions with IS_EMPLOYEE_MODE if explicitly annotated
if (hasDirectComment && 
    path.node.operator === '&&' && 
    t.isIdentifier(path.node.left) && 
    path.node.left.name === 'IS_EMPLOYEE_MODE') {
  path.replaceWith(t.booleanLiteral(false));
}
```

## Performance Considerations

The plugin is designed to be precise but efficient:

1. **AST Traversal**: The plugin uses Babel's traversal system to efficiently walk the AST
2. **Minimal Scope**: Comment checking only happens when needed
3. **Reference Tracking**: Only necessary identifiers are tracked
4. **Precise Targeting**: The plugin now only checks directly annotated nodes to reduce overhead

## Integration with Metro

The plugin integrates with Expo's Metro bundler through the Babel configuration:

```javascript
// Example metro.config.js integration
const babelConfig = {
  plugins: [
    process.env.INCLUDE_EMPLOYEE_CODE !== 'false' 
      ? null 
      : require('./scripts/babel-plugins/babel-plugin-tree-shake-employee-code')
  ].filter(Boolean)
};
```

## Debugging and Logging

The plugin includes minimal logging to show what's being removed:

```javascript
exit(path) {
  if (removedImports.size > 0) {
    console.log(`Tree-shaking: Removed employee code components: ${Array.from(removedImports).join(', ')}`);
  }
}
```

## Extending the Plugin

To extend the plugin with new capabilities:

1. **Add New Node Type Visitors**: For handling additional syntax elements
2. **Enhance Comment Detection**: To support different annotation formats
3. **Add New Tracking for Dependencies**: To handle more complex code relationships
4. **Implement Additional Protection Mechanisms**: For safeguarding other critical code 