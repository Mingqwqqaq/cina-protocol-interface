/**
 * Validation utility functions for Web3 DApp
 */

import { ethers } from 'ethers'

/**
 * Validate Ethereum address
 * @param address - The address to validate
 * @returns True if valid Ethereum address
 */
export const isValidAddress = (address: string): boolean => {
  if (!address) return false
  
  try {
    return ethers.isAddress(address)
  } catch {
    return false
  }
}

/**
 * Validate transaction hash
 * @param hash - The transaction hash to validate
 * @returns True if valid transaction hash
 */
export const isValidTxHash = (hash: string): boolean => {
  if (!hash) return false
  
  // Transaction hash should be 66 characters long (0x + 64 hex characters)
  const txHashRegex = /^0x[a-fA-F0-9]{64}$/
  return txHashRegex.test(hash)
}

/**
 * Validate private key
 * @param privateKey - The private key to validate
 * @returns True if valid private key
 */
export const isValidPrivateKey = (privateKey: string): boolean => {
  if (!privateKey) return false
  
  try {
    // Remove 0x prefix if present
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey
    
    // Private key should be 64 hex characters
    if (cleanKey.length !== 64) return false
    
    // Check if it's valid hex
    const hexRegex = /^[a-fA-F0-9]+$/
    if (!hexRegex.test(cleanKey)) return false
    
    // Try to create a wallet with it
    new ethers.Wallet(privateKey)
    return true
  } catch {
    return false
  }
}

/**
 * Validate amount input
 * @param amount - The amount to validate
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @param decimals - Maximum decimal places (default: 18)
 * @returns Validation result with error message if invalid
 */
export const validateAmount = (
  amount: string,
  min?: number,
  max?: number,
  decimals: number = 18
): { isValid: boolean; error?: string } => {
  if (!amount || amount.trim() === '') {
    return { isValid: false, error: 'Amount is required' }
  }
  
  // Check if it's a valid number
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Invalid number format' }
  }
  
  // Check if positive
  if (numAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' }
  }
  
  // Check minimum value
  if (min !== undefined && numAmount < min) {
    return { isValid: false, error: `Amount must be at least ${min}` }
  }
  
  // Check maximum value
  if (max !== undefined && numAmount > max) {
    return { isValid: false, error: `Amount must not exceed ${max}` }
  }
  
  // Check decimal places
  const decimalPart = amount.split('.')[1]
  if (decimalPart && decimalPart.length > decimals) {
    return { isValid: false, error: `Maximum ${decimals} decimal places allowed` }
  }
  
  return { isValid: true }
}

/**
 * Validate percentage input
 * @param percentage - The percentage to validate
 * @param min - Minimum percentage (default: 0)
 * @param max - Maximum percentage (default: 100)
 * @returns Validation result
 */
export const validatePercentage = (
  percentage: string,
  min: number = 0,
  max: number = 100
): { isValid: boolean; error?: string } => {
  const result = validateAmount(percentage, min, max, 2)
  
  if (!result.isValid) {
    return result
  }
  
  const numPercentage = parseFloat(percentage)
  if (numPercentage < min || numPercentage > max) {
    return { isValid: false, error: `Percentage must be between ${min}% and ${max}%` }
  }
  
  return { isValid: true }
}

/**
 * Validate email address
 * @param email - The email to validate
 * @returns True if valid email
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate URL
 * @param url - The URL to validate
 * @returns True if valid URL
 */
export const isValidUrl = (url: string): boolean => {
  if (!url) return false
  
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate chain ID
 * @param chainId - The chain ID to validate
 * @returns True if valid chain ID
 */
export const isValidChainId = (chainId: number | string): boolean => {
  const id = typeof chainId === 'string' ? parseInt(chainId) : chainId
  return !isNaN(id) && id > 0
}

/**
 * Validate gas limit
 * @param gasLimit - The gas limit to validate
 * @returns Validation result
 */
export const validateGasLimit = (
  gasLimit: string
): { isValid: boolean; error?: string } => {
  if (!gasLimit || gasLimit.trim() === '') {
    return { isValid: false, error: 'Gas limit is required' }
  }
  
  const numGasLimit = parseInt(gasLimit)
  if (isNaN(numGasLimit)) {
    return { isValid: false, error: 'Invalid gas limit format' }
  }
  
  if (numGasLimit <= 0) {
    return { isValid: false, error: 'Gas limit must be greater than 0' }
  }
  
  // Reasonable gas limit range (21000 to 10M)
  if (numGasLimit < 21000) {
    return { isValid: false, error: 'Gas limit too low (minimum 21000)' }
  }
  
  if (numGasLimit > 10000000) {
    return { isValid: false, error: 'Gas limit too high (maximum 10M)' }
  }
  
  return { isValid: true }
}

/**
 * Validate gas price (in Gwei)
 * @param gasPrice - The gas price to validate
 * @returns Validation result
 */
export const validateGasPrice = (
  gasPrice: string
): { isValid: boolean; error?: string } => {
  if (!gasPrice || gasPrice.trim() === '') {
    return { isValid: false, error: 'Gas price is required' }
  }
  
  const numGasPrice = parseFloat(gasPrice)
  if (isNaN(numGasPrice)) {
    return { isValid: false, error: 'Invalid gas price format' }
  }
  
  if (numGasPrice <= 0) {
    return { isValid: false, error: 'Gas price must be greater than 0' }
  }
  
  // Reasonable gas price range (0.1 to 1000 Gwei)
  if (numGasPrice < 0.1) {
    return { isValid: false, error: 'Gas price too low (minimum 0.1 Gwei)' }
  }
  
  if (numGasPrice > 1000) {
    return { isValid: false, error: 'Gas price too high (maximum 1000 Gwei)' }
  }
  
  return { isValid: true }
}

/**
 * Validate slippage tolerance
 * @param slippage - The slippage percentage to validate
 * @returns Validation result
 */
export const validateSlippage = (
  slippage: string
): { isValid: boolean; error?: string } => {
  const result = validatePercentage(slippage, 0.1, 50)
  
  if (!result.isValid) {
    return result
  }
  
  const numSlippage = parseFloat(slippage)
  
  // Warn about high slippage
  if (numSlippage > 10) {
    return { 
      isValid: true, 
      error: 'High slippage tolerance may result in unfavorable trades' 
    }
  }
  
  return { isValid: true }
}

/**
 * Validate deadline (in minutes)
 * @param deadline - The deadline to validate
 * @returns Validation result
 */
export const validateDeadline = (
  deadline: string
): { isValid: boolean; error?: string } => {
  if (!deadline || deadline.trim() === '') {
    return { isValid: false, error: 'Deadline is required' }
  }
  
  const numDeadline = parseInt(deadline)
  if (isNaN(numDeadline)) {
    return { isValid: false, error: 'Invalid deadline format' }
  }
  
  if (numDeadline <= 0) {
    return { isValid: false, error: 'Deadline must be greater than 0' }
  }
  
  // Reasonable deadline range (1 minute to 24 hours)
  if (numDeadline < 1) {
    return { isValid: false, error: 'Deadline too short (minimum 1 minute)' }
  }
  
  if (numDeadline > 1440) { // 24 hours
    return { isValid: false, error: 'Deadline too long (maximum 24 hours)' }
  }
  
  return { isValid: true }
}

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns Validation result with strength score
 */
export const validatePassword = (
  password: string
): { isValid: boolean; strength: number; error?: string } => {
  if (!password) {
    return { isValid: false, strength: 0, error: 'Password is required' }
  }
  
  let strength = 0
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[^\w\s]/.test(password)
  }
  
  // Calculate strength
  Object.values(checks).forEach(check => {
    if (check) strength += 20
  })
  
  // Additional points for length
  if (password.length >= 12) strength += 10
  if (password.length >= 16) strength += 10
  
  const errors = []
  if (!checks.length) errors.push('at least 8 characters')
  if (!checks.lowercase) errors.push('lowercase letters')
  if (!checks.uppercase) errors.push('uppercase letters')
  if (!checks.numbers) errors.push('numbers')
  if (!checks.symbols) errors.push('special characters')
  
  const isValid = strength >= 60 // Require at least 3 criteria
  const error = errors.length > 0 ? `Password must contain ${errors.join(', ')}` : undefined
  
  return { isValid, strength: Math.min(100, strength), error }
}

/**
 * Validate mnemonic phrase
 * @param mnemonic - The mnemonic phrase to validate
 * @returns True if valid mnemonic
 */
export const isValidMnemonic = (mnemonic: string): boolean => {
  if (!mnemonic) return false
  
  try {
    return ethers.Mnemonic.isValidMnemonic(mnemonic.trim())
  } catch {
    return false
  }
}

/**
 * Validate token symbol
 * @param symbol - The token symbol to validate
 * @returns True if valid token symbol
 */
export const isValidTokenSymbol = (symbol: string): boolean => {
  if (!symbol) return false
  
  // Token symbols are typically 2-6 characters, alphanumeric
  const symbolRegex = /^[A-Za-z0-9]{2,6}$/
  return symbolRegex.test(symbol)
}

/**
 * Validate token name
 * @param name - The token name to validate
 * @returns True if valid token name
 */
export const isValidTokenName = (name: string): boolean => {
  if (!name) return false
  
  // Token names should be 1-50 characters, allow letters, numbers, spaces, and common symbols
  const nameRegex = /^[A-Za-z0-9\s\-\.]{1,50}$/
  return nameRegex.test(name.trim())
}

/**
 * Validate contract address and check if it's a contract
 * @param address - The contract address to validate
 * @param provider - Ethereum provider (optional)
 * @returns Promise resolving to validation result
 */
export const validateContractAddress = async (
  address: string,
  provider?: ethers.Provider
): Promise<{ isValid: boolean; isContract?: boolean; error?: string }> => {
  if (!isValidAddress(address)) {
    return { isValid: false, error: 'Invalid address format' }
  }
  
  if (!provider) {
    return { isValid: true }
  }
  
  try {
    const code = await provider.getCode(address)
    const isContract = code !== '0x'
    
    return { isValid: true, isContract }
  } catch (error) {
    return { isValid: false, error: 'Failed to verify contract address' }
  }
}