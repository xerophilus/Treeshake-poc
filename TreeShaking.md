# Employee Code Tree-Shaking

This document explains how to use the employee code tree-shaking functionality in this Expo application. The tree-shaking plugin allows you to maintain a single codebase while producing different builds for internal employee use and external customer use.

## Overview

The tree-shaking plugin removes code annotated with `@employee-code` when building customer-facing versions of the app. This allows you to:

- Maintain a single codebase for both employee and customer versions
- Include sensitive features, debugging tools, or internal functionality in employee builds only
- Create smaller, more secure builds for customer distribution
- Keep sensitive code entirely out of customer bundles (not just conditionally hidden)

## How It Works

The plugin uses Babel AST traversal to detect and remove code marked with `@employee-code` comments. The implementation is designed to be precise - only removing code that is explicitly marked for employee use.

### Key Features

- **Precise Targeting**: Only code explicitly marked with `@employee-code` is removed
- **Style Handling**: Detects and removes styled components that use employee-specific styles
- **Reference Tracking**: Ensures references to removed code are also handled properly
- **Critical Import Protection**: Preserves core React/React Native functionality regardless of annotations

## Usage

### 1. Marking Code for Removal

Add an `@employee-code` comment directly above or on the same line as code that should be removed in customer builds:

```javascript
// Import statements
// @employee-code
import SensitiveComponent from './SensitiveComponent';

// Variables and constants
// @employee-code
const INTERNAL_API_KEY = 'secret-key-1234';

// Style definitions
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  // @employee-code
  employeeSection: {
    backgroundColor: 'blue',
    padding: 8,
    marginVertical: 10,
  },
});

// Components/JSX
return (
  <View style={styles.container}>
    <Text>Always visible</Text>
    
    {/* @employee-code */}
    <View style={styles.employeeSection}>
      <Text>Employee-only section</Text>
    </View>
  </View>
);
```

### 2. Building Different Versions

Use the `INCLUDE_EMPLOYEE_CODE` environment variable to control which version to build:

```bash
# For employee builds (includes employee code)
INCLUDE_EMPLOYEE_CODE=true npx expo start

# For customer builds (removes employee code)
INCLUDE_EMPLOYEE_CODE=false npx expo start
```

## What Gets Removed

The plugin removes the following when marked with `@employee-code`:

1. **Import statements**: Both default and named imports
2. **Variable and constant declarations**: Variables, objects, and functions
3. **JSX elements**: Any JSX with an `@employee-code` comment directly on it
4. **Style definitions**: Properties in StyleSheet.create marked with `@employee-code`
5. **Components using employee styles**: Any component using a style marked for removal

## Best Practices

### DO:

- ✅ Place `@employee-code` comments directly on or immediately before the code to be removed
- ✅ Use comments on style definitions to remove both the style and components using it
- ✅ Add comments to each import that should be removed
- ✅ Test both employee and customer builds regularly

### DON'T:

- ❌ Mark critical React or React Native imports with `@employee-code`
- ❌ Expect code to be removed just because it's near an `@employee-code` comment
- ❌ Rely on parent-child relationships for removal (each element needs its own annotation)
- ❌ Add `@employee-code` comments in the middle of multi-line expressions

## Examples

### Example 1: Employee-only Component

```jsx
// @employee-code
import EmployeeTools from './EmployeeTools';

export default function MyScreen() {
  return (
    <View style={styles.container}>
      <Text>Regular content</Text>
      
      {/* @employee-code */}
      <EmployeeTools />
    </View>
  );
}
```

### Example 2: Employee-only Styles

```jsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // @employee-code
  debugSection: {
    backgroundColor: 'red',
    borderWidth: 2,
  },
});

// The following will be removed in customer builds because it uses an employee-only style
<View style={styles.debugSection}>
  <Text>Debug info here</Text>
</View>
```

### Example 3: Mixed Content

```jsx
function ProfileScreen() {
  return (
    <ScrollView>
      <UserHeader />
      <PublicDetails />
      
      {/* @employee-code */}
      <View>
        <Text>Internal employee notes:</Text>
        <AdminControls />
      </View>
      
      <Footer />
    </ScrollView>
  );
}
```

## Troubleshooting

If you're experiencing issues with tree-shaking:

1. **Code not being removed**: Ensure your `@employee-code` comment is directly on or immediately before the code
2. **App crashing in customer builds**: Check for references to removed code that might not be properly handled
3. **Too much code removed**: Make sure your comments are precisely placed and not affecting nearby code

## Technical Details

The implementation uses Babel's AST traversal to analyze and transform the code:

- Each AST node is checked for `@employee-code` comments directly on it
- For JSX elements, additional checks are made for the element's opening tag
- Style properties are tracked so components using employee-only styles can be removed
- References to removed imports are tracked and replaced with `undefined`
- Critical React and React Native imports are protected even if marked as employee code 