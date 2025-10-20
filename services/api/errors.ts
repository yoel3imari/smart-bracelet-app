import { NetworkError, AuthError, ValidationError, ServerError } from './client';

/**
 * Centralized error handler for API errors
 */
export class ApiErrorHandler {
  /**
   * Get user-friendly error message for display
   */
  static getErrorMessage(error: Error): string {
    if (error instanceof NetworkError) {
      return error.message || 'Network connection failed. Please check your internet connection.';
    }
    
    if (error instanceof AuthError) {
      return error.message || 'Authentication failed. Please log in again.';
    }
    
    if (error instanceof ValidationError) {
      if (error.fieldErrors) {
        const fieldMessages = Object.values(error.fieldErrors).flat();
        return fieldMessages.join(', ') || error.message || 'Please check your input and try again.';
      }
      return error.message || 'Please check your input and try again.';
    }
    
    if (error instanceof ServerError) {
      return error.message || 'Server error occurred. Please try again later.';
    }
    
    // Generic error fallback
    return error.message || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Check if error is recoverable (can retry)
   */
  static isRecoverableError(error: Error): boolean {
    return error instanceof NetworkError || error instanceof ServerError;
  }

  /**
   * Check if error requires user action (like re-authentication)
   */
  static requiresUserAction(error: Error): boolean {
    return error instanceof AuthError;
  }

  /**
   * Log error for debugging purposes
   */
  static logError(error: Error, context?: string) {
    if (__DEV__) {
      console.group(`🔴 API Error${context ? ` - ${context}` : ''}`);
      console.error('Error:', error);
      console.error('Name:', error.name);
      console.error('Message:', error.message);
      
      if (error instanceof ValidationError && error.fieldErrors) {
        console.error('Field Errors:', error.fieldErrors);
      }
      
      if (error instanceof NetworkError || error instanceof ServerError) {
        console.error('Status:', error.status);
      }
      
      console.groupEnd();
    }
  }

  /**
   * Handle error with appropriate user feedback
   */
  static handleError(error: Error, context?: string): {
    message: string;
    isRecoverable: boolean;
    requiresUserAction: boolean;
  } {
    this.logError(error, context);
    
    return {
      message: this.getErrorMessage(error),
      isRecoverable: this.isRecoverableError(error),
      requiresUserAction: this.requiresUserAction(error),
    };
  }
}

/**
 * Error boundary utility for React components
 */
export class ApiErrorBoundary {
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorInfo = ApiErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      
      // For auth errors, we might want to trigger a logout
      if (errorInfo.requiresUserAction) {
        // TODO: Trigger logout or show auth modal
        console.warn('Authentication required - triggering logout flow');
      }
      
      throw errorInfo;
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    context?: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const errorInfo = ApiErrorHandler.handleError(lastError, context);
        
        // Don't retry if error is not recoverable
        if (!errorInfo.isRecoverable) {
          throw errorInfo;
        }
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw errorInfo;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

// Export error types for convenience
export { NetworkError, AuthError, ValidationError, ServerError };