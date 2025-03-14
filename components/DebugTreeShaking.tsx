import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// @employee-code
const SensitiveData = "Employee data is present";

/**
 * A component to debug if the tree shaking plugin is working.
 * This will display different text based on whether the tree shaking 
 * plugin has run on this file.
 */
export default function DebugTreeShaking() {
  // Safe way to check if sensitive data exists
  const isEmployeeMode = typeof SensitiveData !== 'undefined';
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tree Shaking Debug</Text>
      
      <Text style={styles.regular}>
        This always appears in both builds
      </Text>
      
      {/* @employee-code */}
      <Text style={styles.employee}>
        This should only appear in employee builds
      </Text>
      
      <Text style={styles.status}>
        Status: {
          isEmployeeMode 
            ? 'EMPLOYEE MODE - Employee code is visible' 
            : 'CUSTOMER MODE - Employee code is hidden'
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  regular: {
    fontSize: 16,
    marginBottom: 10,
  },
  employee: {
    fontSize: 16,
    backgroundColor: '#ffccbc',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
}); 