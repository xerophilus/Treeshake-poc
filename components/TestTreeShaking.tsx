import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// @employee-code
import SensitiveText from './SensitiveText';

export default function TestTreeShaking() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tree Shaking Test</Text>
      
      <Text style={styles.subtitle}>This content is always visible</Text>
      
      {/* @employee-code */}
      <SensitiveText content="This content should only be visible in employee builds" />
      
      <Text style={styles.regular}>
        The component above should be removed in customer builds.
      </Text>
      
      {/* @employee-code */}
      <View style={styles.employeeSection}>
        <Text style={styles.employeeText}>
          This entire section should be removed in customer builds.
        </Text>
        <Text style={styles.employeeText}>
          It contains multiple elements that should all be removed.
        </Text>
      </View>
    </View>
  );
}

// Regular styles
const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  regular: {
    fontSize: 16,
    marginVertical: 16,
  },
  // @employee-code
  employeeSection: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  // @employee-code
  employeeText: {
    color: '#1976d2',
    fontWeight: '500',
    marginBottom: 5,
  },
}); 