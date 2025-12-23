/**
 * Error handling utilities for Web3 DApp
 */

import { ethers } from 'ethers'

/**
 * Standard error types for the application
 */
export enum ErrorType {
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_CONNECTION_FAILED = 'WALLET_CONNECTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_ALLOWANCE = 'INSUFFICIENT_ALLOWANCE',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Application error class
 */
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly code?: string | number
  public readonly details?: any
  public readonly timestamp: number

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN_ERROR,
    code?: string | number,
    details?: any
  ) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.code = code
    this.details = details
    this.timestamp = Date.now()
  }
}

/**
 * Parse ethers.js error and return user-friendly message
 * @param error - The error to parse
 * @returns Parsed error information
 */
export const parseEthersError = (error: any): {
  type: ErrorType
  message: string
  code?: string | number
  details?: any
} => {
  // User rejected transaction
  if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
    return {
      type: ErrorType.TRANSACTION_REJECTED,
      message: 'Transaction was rejected by user',
      code: error.code
    }
  }

  // Insufficient funds
  if (error.code === 'INSUFFICIENT_FUNDS' || error.reason?.includes('insufficient funds')) {
    return {
      type: ErrorType.INSUFFICIENT_BALANCE,
      message: 'Insufficient balance to complete transaction',
      code: error.code
    }
  }

  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: 'Network connection failed. Please check your internet connection.',
      code: error.code
    }
  }

  // Contract execution reverted
  if (error.reason || error.message?.includes('execution reverted')) {
    const reason = error.reason || 'Contract execution failed'
    return {
      type: ErrorType.CONTRACT_ERROR,
      message: `Contract error: ${reason}`,
      code: error.code,
      details: error.reason
    }
  }

  // Gas estimation failed
  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return {
      type: ErrorType.CONTRACT_ERROR,
      message: 'Transaction may fail. Please check your inputs and try again.',
      code: error.code
    }
  }

  // Nonce too high/low
  if (error.code === 'NONCE_EXPIRED' || error.code === 'REPLACEMENT_UNDERPRICED') {
    return {
      type: ErrorType.TRANSACTION_FAILED,
      message: 'Transaction nonce error. Please try again.',
      code: error.code
    }
  }

  // Generic transaction failure
  if (error.code === 'CALL_EXCEPTION') {
    return {
      type: ErrorType.TRANSACTION_FAILED,
      message: 'Transaction failed to execute',
      code: error.code,
      details: error.reason
    }
  }

  // Wallet not connected
  if (error.message?.includes('wallet') || error.code === 'MISSING_PROVIDER') {
    return {
      type: ErrorType.WALLET_NOT_CONNECTED,
      message: 'Please connect your wallet first',
      code: error.code
    }
  }

  // Default case
  return {
    type: ErrorType.UNKNOWN_ERROR,
    message: error.message || 'An unexpected error occurred',
    code: error.code,
    details: error
  }
}

/**
 * Parse contract error and extract revert reason
 * @param error - The contract error
 * @returns Parsed error information
 */
export const parseContractError = (error: any): {
  type: ErrorType
  message: string
  reason?: string
} => {
  let reason = ''
  let message = 'Contract execution failed'

  // Try to extract revert reason from different error formats
  if (error.reason) {
    reason = error.reason
  } else if (error.data?.message) {
    reason = error.data.message
  } else if (error.error?.message) {
    reason = error.error.message
  } else if (typeof error.data === 'string' && error.data.startsWith('0x08c379a0')) {
    // Standard revert reason
    try {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + error.data.slice(10))
      reason = decoded[0]
    } catch {
      reason = 'Execution reverted'
    }
  }

  // Map common revert reasons to user-friendly messages
  const reasonMap: Record<string, string> = {
    'insufficient balance': 'Insufficient balance for this transaction',
    'insufficient allowance': 'Insufficient token allowance. Please approve more tokens.',
    'transfer amount exceeds balance': 'Transfer amount exceeds your balance',
    'transfer amount exceeds allowance': 'Transfer amount exceeds approved allowance',
    'ERC20: transfer amount exceeds balance': 'Insufficient token balance',
    'ERC20: transfer amount exceeds allowance': 'Insufficient token allowance',
    'ERC20: insufficient allowance': 'Please approve tokens before transferring',
    'Pausable: paused': 'Contract is currently paused',
    'Ownable: caller is not the owner': 'Only contract owner can perform this action',
    'SafeMath: subtraction overflow': 'Arithmetic underflow error',
    'SafeMath: addition overflow': 'Arithmetic overflow error',
    'SafeMath: multiplication overflow': 'Arithmetic overflow error',
    'SafeMath: division by zero': 'Division by zero error'
  }

  // Check for known reasons
  const lowerReason = reason.toLowerCase()
  for (const [key, value] of Object.entries(reasonMap)) {
    if (lowerReason.includes(key.toLowerCase())) {
      message = value
      break
    }
  }

  // If we have a reason but no mapped message, use the reason
  if (reason && message === 'Contract execution failed') {
    message = `Contract error: ${reason}`
  }

  return {
    type: ErrorType.CONTRACT_ERROR,
    message,
    reason
  }
}

/**
 * Handle async errors with proper error parsing
 * @param fn - Async function to execute
 * @param fallbackMessage - Fallback error message
 * @returns Promise with parsed error handling
 */
export const handleAsyncError = async <T>(
  fn: () => Promise<T>,
  fallbackMessage: string = 'Operation failed'
): Promise<{ data?: T; error?: AppError }> => {
  try {
    const data = await fn()
    return { data }
  } catch (error: any) {
    const parsed = parseEthersError(error)
    const appError = new AppError(
      parsed.message || fallbackMessage,
      parsed.type,
      parsed.code,
      parsed.details
    )
    return { error: appError }
  }
}

/**
 * Retry function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise with retry logic
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry on user rejection or validation errors
      const parsed = parseEthersError(error)
      if (
        parsed.type === ErrorType.TRANSACTION_REJECTED ||
        parsed.type === ErrorType.VALIDATION_ERROR
      ) {
        throw error
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error
      }

      // Wait before retrying with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Log error with context information
 * @param error - The error to log
 * @param context - Additional context information
 */
export const logError = (error: any, context?: Record<string, any>): void => {
  const errorInfo = {
    message: error.message,
    type: error.type || 'unknown',
    code: error.code,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context
  }

  // In development, log to console
  if (import.meta.env.DEV) {
    console.error('Application Error:', errorInfo)
  }

  // In production, you might want to send to error tracking service
  // Example: Sentry, LogRocket, etc.
  if (import.meta.env.PROD) {
    // sendToErrorTracking(errorInfo)
  }
}

/**
 * Create error notification object
 * @param error - The error to create notification for
 * @returns Notification object
 */
export const createErrorNotification = (error: any) => {
  const parsed = parseEthersError(error)
  
  return {
    type: 'error' as const,
    title: getErrorTitle(parsed.type),
    message: parsed.message,
    duration: getErrorDuration(parsed.type),
    showClose: true
  }
}

/**
 * Get error title based on error type
 * @param type - Error type
 * @returns Error title
 */
const getErrorTitle = (type: ErrorType): string => {
  const titles: Record<ErrorType, string> = {
    [ErrorType.WALLET_NOT_CONNECTED]: 'Wallet Not Connected',
    [ErrorType.WALLET_CONNECTION_FAILED]: 'Connection Failed',
    [ErrorType.NETWORK_ERROR]: 'Network Error',
    [ErrorType.TRANSACTION_FAILED]: 'Transaction Failed',
    [ErrorType.TRANSACTION_REJECTED]: 'Transaction Rejected',
    [ErrorType.INSUFFICIENT_BALANCE]: 'Insufficient Balance',
    [ErrorType.INSUFFICIENT_ALLOWANCE]: 'Insufficient Allowance',
    [ErrorType.CONTRACT_ERROR]: 'Contract Error',
    [ErrorType.VALIDATION_ERROR]: 'Validation Error',
    [ErrorType.UNKNOWN_ERROR]: 'Error'
  }

  return titles[type] || 'Error'
}

/**
 * Get error notification duration based on error type
 * @param type - Error type
 * @returns Duration in milliseconds
 */
const getErrorDuration = (type: ErrorType): number => {
  // User rejection messages can be shorter
  if (type === ErrorType.TRANSACTION_REJECTED) {
    return 3000
  }

  // Validation errors should stay longer
  if (type === ErrorType.VALIDATION_ERROR) {
    return 6000
  }

  // Default duration
  return 5000
}

/**
 * Check if error is retryable
 * @param error - The error to check
 * @returns True if error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  const parsed = parseEthersError(error)
  
  const retryableTypes = [
    ErrorType.NETWORK_ERROR,
    ErrorType.TRANSACTION_FAILED
  ]

  return retryableTypes.includes(parsed.type)
}

/**
 * Get user-friendly error message for common Web3 errors
 * @param error - The error object
 * @returns User-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  const parsed = parseEthersError(error)
  return parsed.message
}

/**
 * Validate and throw error if validation fails
 * @param condition - Condition to validate
 * @param message - Error message if validation fails
 * @param type - Error type
 */
export const validateOrThrow = (
  condition: boolean,
  message: string,
  type: ErrorType = ErrorType.VALIDATION_ERROR
): void => {
  if (!condition) {
    throw new AppError(message, type)
  }
}