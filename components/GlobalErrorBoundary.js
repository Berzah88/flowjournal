import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

class GlobalErrorBoundary extends React.Component {
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
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Critical error logging
    console.error('🚨 CRITICAL ERROR:', error);
    console.error('🚨 Error Info:', errorInfo);
    console.error('🚨 Component Stack:', errorInfo.componentStack);
    
    // Production'da crash reporting service'e gönder
    if (!__DEV__) {
      // crashlytics().recordError(error);
      // analytics().logEvent('app_crash', {
      //   error_message: error.message,
      //   error_stack: error.stack,
      //   component_stack: errorInfo.componentStack
      // });
    }
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    if (newRetryCount <= 3) {
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        retryCount: newRetryCount 
      });
    } else {
      // Max retries reached, show permanent error
      console.error('🚨 Max retries reached for ErrorBoundary');
    }
  };

  handleRestart = () => {
    // Force app restart (in production, you might want to use a restart library)
    if (Platform.OS === 'android') {
      // Android restart logic
      console.log('🔄 Restarting app...');
    } else {
      // iOS restart logic
      console.log('🔄 Restarting app...');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning-outline" size={64} color="#dc3545" />
          </View>
          
          <Text style={styles.title}>Bir hata oluştu</Text>
          
          <Text style={styles.message}>
            Uygulama beklenmeyen bir hata ile karşılaştı. Lütfen tekrar deneyin.
          </Text>
          
          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Hata Detayları:</Text>
              <Text style={styles.errorText}>{this.state.error.message}</Text>
              {this.state.errorInfo && (
                <Text style={styles.errorStack}>
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.retryButton]}
              onPress={this.handleRetry}
              disabled={this.state.retryCount >= 3}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {this.state.retryCount >= 3 ? 'Max Deneme' : 'Tekrar Dene'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.restartButton]}
              onPress={this.handleRestart}
            >
              <Ionicons name="reload" size={20} color="#fff" />
              <Text style={styles.buttonText}>Uygulamayı Yeniden Başlat</Text>
            </TouchableOpacity>
          </View>
          
          {this.state.retryCount > 0 && (
            <Text style={styles.retryInfo}>
              Deneme sayısı: {this.state.retryCount}/3
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
    backgroundColor: '#f8f9fa',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#6c757d',
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    maxHeight: 200,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    color: '#adb5bd',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#007bff',
  },
  restartButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  retryInfo: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default GlobalErrorBoundary;

