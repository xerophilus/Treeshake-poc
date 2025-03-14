# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Tree Shaking for Employee Code

This project implements a custom Babel plugin for "tree-shaking" code annotated with `@employee-code`. The plugin removes specific pieces of code from customer builds while keeping them in employee builds, allowing you to maintain a single codebase for both types of builds.

## Documentation

For detailed information about the tree-shaking functionality, refer to the following documents:

- [TreeShaking.md](./TreeShaking.md) - User guide with examples and best practices
- [TreeShakingTechnicalReference.md](./TreeShakingTechnicalReference.md) - Technical details of the implementation

## Overview

The tree-shaking process:
1. Identifies code explicitly annotated with `@employee-code` comments
2. Completely removes this code from the build when building for customers
3. Preserves the code when building for employees
4. Ensures no broken references remain after tree-shaking

## Usage

### Basic Configuration

1. Set up the Babel plugin in your project:

```javascript
// babel.config.js
module.exports = function(api) {
  api.cache(true);
  
  const plugins = [
    // Other plugins...
  ];
  
  // Only include the tree-shaking plugin when building for customers
  if (process.env.INCLUDE_EMPLOYEE_CODE !== 'true') {
    plugins.push('./scripts/babel-plugins/babel-plugin-tree-shake-employee-code');
  }
  
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
```

2. Run your app with the appropriate environment variable:

```bash
# For employee builds (includes employee code)
INCLUDE_EMPLOYEE_CODE=true npx expo start

# For customer builds (employee code is removed)
INCLUDE_EMPLOYEE_CODE=false npx expo start
```

### Annotating Code for Tree Shaking

You can annotate your code in different ways:

#### 1. Imports

```javascript
// @employee-code
import SensitiveComponent from './SensitiveComponent';

// Regular imports will always remain
import { View, Text } from 'react-native';
```

#### 2. JSX Elements

```jsx
<View>
  {/* Regular content */}
  <Text>This appears in all builds</Text>
  
  {/* @employee-code */}
  <Text style={styles.employee}>This only appears in employee builds</Text>
</View>
```

#### 3. Variables and Constants

```javascript
// @employee-code
const SENSITIVE_DATA = "This data will be removed in customer builds";

// This will be available in all builds
const REGULAR_DATA = "This data will be in all builds";
```

#### 4. Object Properties in StyleSheet

```javascript
const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  
  // @employee-code
  employeeSection: {
    backgroundColor: '#e3f2fd',
    padding: 10,
  },
});
```

## How It Works

### Tree Shaking Process

The Babel plugin traverses the AST (Abstract Syntax Tree) and:

1. Identifies nodes with direct `@employee-code` annotations
2. Tracks affected imports, variables, and code blocks
3. Removes the annotated code and its references
4. Preserves critical imports (React, StyleSheet, etc.)
5. Replaces references to removed code with `undefined`

### Precise Targeting

The latest implementation is much more precise:

- Only code with direct `@employee-code` annotations is removed
- Annotations must be immediately on or before the target code
- JSX elements are only removed when explicitly annotated or using employee-specific styles
- Parent-child relationships are not used for determining what to remove

### Critical Imports Protection

The plugin has safeguards to prevent removing essential imports:

```javascript
// Critical modules that are never removed
const CRITICAL_MODULES = [
  'react',
  'react-native',
  'react/jsx-runtime',
  'react/jsx-dev-runtime'
];

// Critical imports that are never removed
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
```

## Best Practices

1. **Be explicit with annotations**: Place `@employee-code` comments directly on code to be removed.

2. **Separate critical imports**: Keep React and StyleSheet imports separate from employee-only imports.

   ```javascript
   // Safe imports
   import React from 'react';
   import { View, Text, StyleSheet } from 'react-native';
   
   // @employee-code
   import SensitiveComponent from './SensitiveComponent';
   ```

3. **Avoid referencing removed code**: Don't reference employee-only variables/components in customer-visible code.

4. **Use blank lines around annotations**: For better visibility and to ensure the plugin correctly identifies them.

   ```javascript
   // Regular import
   import { View } from 'react-native';
   
   // @employee-code
   import SensitiveData from './SensitiveData';
   
   // Regular code continues
   ```

5. **Verify builds**: Always test both employee and customer builds to ensure the tree-shaking works as expected.

## Debugging

When troubleshooting, look for the logging message at the end of the build process:

```
Tree-shaking: Removed employee code components: SensitiveData, SensitiveText, etc.
```

This indicates which components and variables were removed during the tree-shaking process.

## Additional Resources

For more detailed information, refer to the documentation files mentioned above, which cover:

- Detailed usage examples
- Technical implementation details
- Edge case handling
- Performance considerations
- Advanced use cases
