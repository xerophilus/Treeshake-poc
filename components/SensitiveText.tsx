import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface SensitiveTextProps {
  content?: string;
}

/**
 * A component that displays sensitive information only for employees
 */
export default function SensitiveText({ content = 'Sensitive Employee Information' }: SensitiveTextProps) {
  return (
    <Text style={styles.sensitive}>
      🔒 {content}
    </Text>
  );
}

const styles = StyleSheet.create({
  sensitive: {
    backgroundColor: '#ffebee',
    color: '#d32f2f',
    padding: 10,
    borderRadius: 5,
    fontWeight: 'bold',
  },
}); 