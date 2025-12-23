import BigNumber from 'bignumber.js'

/**
 * Utility functions for formatting numbers, dates, and other data
 */

export const formatNumberK = (value: number | string,
  decimals: number = 2): string => {
  return formatNumber(value, decimals, 'en-US', 3)
}

export const formatNumberM = (value: number | string,
  decimals: number = 2): string => {
  return formatNumber(value, decimals, 'en-US', 3)
}

/**
 * Format a number with commas and specified decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param locale - Locale for formatting (default: 'en-US')
 * @param minAbbreviated - Minimum value to use abbreviated format (K, M, B) (default: '')
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number | string,
  decimals: number = 2,
  locale: string = 'en-US',
  minAbbreviated: number = 0, // 3:K, 2:M, 1:B
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) return '0'

  // 如果启用简写功能
  if (minAbbreviated > 0) {
    const absNum = Math.abs(num)
    if (absNum >= 1e12 && minAbbreviated >= 1) {
      return removeTrailingZeros((num / 1e12).toFixed(2)) + 'T'
    }
    if (absNum >= 1e9 && minAbbreviated >= 1) {
      return removeTrailingZeros((num / 1e9).toFixed(2)) + 'B'
    }
    if (absNum >= 1e6 && minAbbreviated >= 2) {
      return removeTrailingZeros((num / 1e6).toFixed(2)) + 'M'
    }
    if (absNum >= 1e3 && minAbbreviated >= 3) {
      return removeTrailingZeros((num / 1e3).toFixed(2)) + 'K'
    }
  }

  // 使用截取而非四舍五入
  const factor = Math.pow(10, decimals)
  const truncatedNum = Math.floor(num * factor) / factor

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(truncatedNum)

  // 如果格式化后为0但原始值不等于0，添加"<"符号
  if (formatted === '0.00' || formatted === '0' || parseFloat(formatted) === 0) {
    if (num > 0) {
      // 显示最小精度单位
      const minValue = 1 / Math.pow(10, decimals)
      const minFormatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(minValue)
      return `<${removeTrailingZeros(minFormatted)}`
    }
  }

  return removeTrailingZeros(formatted)
}

/**
 * Format a number as currency
 * @param value - The number to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number | string,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) return '$0.00'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(num)
}

/**
 * Remove trailing zeros from decimal part
 * @param numStr - Number string with potential trailing zeros
 * @returns Number string without trailing zeros
 */
const removeTrailingZeros = (numStr: string): string => {
  if (numStr.includes('.')) {
    return numStr.replace(/\.?0+$/, '')
  }
  return numStr
}

/**
 * Format a large number with K, M, B, T suffixes
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string with suffix
 */
export const formatLargeNumber = (
  value: number | string,
  decimals: number = 1
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) return '0'

  const absNum = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  if (absNum >= 1e12) {
    return sign + removeTrailingZeros(Math.floor(absNum / 1e12 * Math.pow(10, decimals)) / Math.pow(10, decimals) + '') + 'T'
  } else if (absNum >= 1e9) {
    return sign + removeTrailingZeros(Math.floor(absNum / 1e9 * Math.pow(10, decimals)) / Math.pow(10, decimals) + '') + 'B'
  } else if (absNum >= 1e6) {
    return sign + removeTrailingZeros(Math.floor(absNum / 1e6 * Math.pow(10, decimals)) / Math.pow(10, decimals) + '') + 'M'
  } else if (absNum >= 1e3) {
    return sign + removeTrailingZeros(Math.floor(absNum / 1e3 * Math.pow(10, decimals)) / Math.pow(10, decimals) + '') + 'K'
  }

  return sign + removeTrailingZeros(Math.floor(absNum * Math.pow(10, decimals)) / Math.pow(10, decimals) + '')
}

/**
 * Format a percentage
 * @param value - The decimal value (e.g., 0.05 for 5%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number | string,
  decimals: number = 2
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) return '0%'

  return (num * 100).toFixed(decimals) + '%'
}

/**
 * Format a date
 * @param date - Date to format (timestamp, Date object, or date string)
 * @param options - Intl.DateTimeFormat options
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export const formatDate = (
  date: number | Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  },
  locale: string = 'en-US'
): string => {
  let dateObj: Date

  if (typeof date === 'number') {
    dateObj = new Date(date)
  } else if (typeof date === 'string') {
    dateObj = new Date(date)
  } else {
    dateObj = date
  }

  if (isNaN(dateObj.getTime())) return 'Invalid Date'

  return new Intl.DateTimeFormat(locale, options).format(dateObj)
}

/**
 * Format a date and time
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: number | Date | string,
  locale: string = 'en-US'
): string => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }, locale)
}

/**
 * Format time ago (relative time)
 * @param date - Date to compare
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Relative time string (e.g., '2 hours ago')
 */
export const formatTimeAgo = (
  date: number | Date | string,
  locale: string = 'en-US'
): string => {
  let dateObj: Date

  if (typeof date === 'number') {
    dateObj = new Date(date)
  } else if (typeof date === 'string') {
    dateObj = new Date(date)
  } else {
    dateObj = date
  }

  if (isNaN(dateObj.getTime())) return 'Invalid Date'

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second')
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute')
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour')
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day')
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month')
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year')
  }
}

/**
 * Format an Ethereum address
 * @param address - The address to format
 * @param startLength - Number of characters to show at start (default: 6)
 * @param endLength - Number of characters to show at end (default: 4)
 * @returns Formatted address string
 */
export const formatAddress = (
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string => {
  if (!address || address.length < startLength + endLength) {
    return address || ''
  }

  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

/**
 * Format a transaction hash
 * @param hash - The transaction hash
 * @param length - Number of characters to show (default: 10)
 * @returns Formatted hash string
 */
export const formatTxHash = (
  hash: string,
  length: number = 10
): string => {
  if (!hash || hash.length <= length) {
    return hash || ''
  }

  const halfLength = Math.floor(length / 2)
  return `${hash.slice(0, halfLength)}...${hash.slice(-halfLength)}`
}

/**
 * Format token amount with proper decimals
 * @param amount - The amount in wei or smallest unit
 * @param decimals - Token decimals (default: 18)
 * @param displayDecimals - Number of decimals to display (default: 4)
 * @returns Formatted token amount
 */
export const formatTokenAmount = (
  amount: string | number,
  decimals: number = 18,
  displayDecimals: number = 4
): string => {
  const amountStr = typeof amount === 'number' ? amount.toString() : amount

  if (!amountStr || amountStr === '0') return '0'

  const divisor = Math.pow(10, decimals)
  const value = parseFloat(amountStr) / divisor

  return formatNumber(value, displayDecimals)
}

/**
 * Format gas price in Gwei
 * @param gasPrice - Gas price in wei
 * @returns Formatted gas price string
 */
export const formatGasPrice = (gasPrice: string | number): string => {
  const gasPriceStr = typeof gasPrice === 'number' ? gasPrice.toString() : gasPrice

  if (!gasPriceStr || gasPriceStr === '0') return '0 Gwei'

  const gwei = parseFloat(gasPriceStr) / 1e9
  return `${formatNumber(gwei, 2)} Gwei`
}

/**
 * Format file size
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string
 */
export const formatFileSize = (
  bytes: number,
  decimals: number = 2
): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated text
 */
export const truncateText = (
  text: string,
  maxLength: number = 50
): string => {
  if (!text || text.length <= maxLength) {
    return text || ''
  }

  return text.slice(0, maxLength) + '...'
}

/**
 * Format duration in human readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    const remainingMinutes = Math.floor((seconds % 3600) / 60)
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  } else {
    const days = Math.floor(seconds / 86400)
    const remainingHours = Math.floor((seconds % 86400) / 3600)
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
}

/**
 * Calculate percentage of a balance with high precision (supports 18 decimal places)
 * Uses ethers.js utilities for precise calculations to avoid floating point precision issues
 * @param balance - The total balance as string
 * @param percentage - The percentage (0-100)
 * @param decimals - Number of decimal places to return (default: 6)
 * @returns Calculated amount as string
 */
export const calculatePercentageAmount = (
  balance: string,
  percentage: number,
  decimals: number = 18
): string => {
  if (!balance || balance === '0' || percentage === 0) {
    return '0'
  }

  try {
    const bigAmout = new BigNumber(balance)
    return bigAmout.multipliedBy(percentage).dividedBy(100).toFixed(decimals);
  } catch (error) {
    console.error('Error calculating percentage amount:', error)
    return '0'
  }
}