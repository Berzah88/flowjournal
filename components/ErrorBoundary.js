import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (__DEV__) {
      console.error('🚨 ErrorBoundary caught an error:', error.message);
      console.error('🚨 Error type:', error.name);
      console.error('🚨 Error stack:', error.stack);
      console.error('🚨 Component stack:', errorInfo.componentStack);
      console.error('🚨 Full error:', error);
      console.error('🚨 Full errorInfo:', errorInfo);
    }
    
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;
    
    if (retryCount < maxRetries) {
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        retryCount: retryCount + 1 
      });
    } else {
      // Max retries reached, show permanent error
      console.error('🚨 Max retries reached for ErrorBoundary');
    }
  };

  render() {
    if (this.state.hasError) {
      const { retryCount } = this.state;
      const maxRetries = 3;
      const canRetry = retryCount < maxRetries;
      
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. {canRetry ? 'Please try again.' : 'Please restart the app.'}
          </Text>
          {canRetry && (
            <TouchableOpacity 
              style={styles.button} 
              onPress={this.handleRetry}
              accessible={true}
              accessibilityLabel="Retry after error"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Try Again ({retryCount + 1}/{maxRetries})</Text>
            </TouchableOpacity>
          )}
          {!canRetry && (
            <Text style={styles.maxRetriesText}>
              Maximum retry attempts reached. Please restart the app.
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  maxRetriesText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
});

export default ErrorBoundary;
