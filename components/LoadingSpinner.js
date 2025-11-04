import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LoadingSpinner = ({ message = 'Loading...', size = 'large', color }) => {
  const { theme } = useTheme();
  const spinnerColor = color || (theme.name === 'dark' ? '#FFFFFF' : '#6C63FF');

  return (
    <View style={[styles.container, { backgroundColor: theme.name === 'dark' ? '#0B0B0B' : '#f5f5f5' }]}>
      <ActivityIndicator
        size={size}
        color={spinnerColor}
        accessibilityLabel={message}
      />
      <Text style={[styles.message, { color: theme.name === 'dark' ? '#DDD' : '#666' }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    textAlign: 'center',
  },
});

export default React.memo(LoadingSpinner);
