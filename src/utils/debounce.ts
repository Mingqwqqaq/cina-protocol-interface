/**
 * Debounce utility function
 * Delays the execution of a function until after a specified delay has elapsed
 * since the last time it was invoked.
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @param immediate - If true, trigger the function on the leading edge instead of trailing
 * @returns The debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(later, wait)
    
    if (callNow) {
      func(...args)
    }
  }
}

/**
 * Creates a debounced function that returns a Promise
 * Useful for async operations that need to be debounced
 * 
 * @param func - The async function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns The debounced async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeout: NodeJS.Timeout | null = null
  let resolvePromise: ((value: Awaited<ReturnType<T>>) => void) | null = null
  let rejectPromise: ((reason?: any) => void) | null = null
  
  return function executedFunction(...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
    return new Promise((resolve, reject) => {
      if (timeout) {
        clearTimeout(timeout)
        if (rejectPromise) {
          rejectPromise(new Error('Debounced call cancelled'))
        }
      }
      
      resolvePromise = resolve
      rejectPromise = reject
      
      timeout = setTimeout(async () => {
        try {
          const result = await func(...args)
          if (resolvePromise) {
            resolvePromise(result)
          }
        } catch (error) {
          if (rejectPromise) {
            rejectPromise(error)
          }
        } finally {
          timeout = null
          resolvePromise = null
          rejectPromise = null
        }
      }, wait)
    })
  }
}

/**
 * Throttle utility function
 * Ensures a function is called at most once per specified time period
 * 
 * @param func - The function to throttle
 * @param limit - The time limit in milliseconds
 * @returns The throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Creates a debounced ref watcher for Vue 3
 * Useful for watching reactive values with debouncing
 * 
 * @param callback - The callback function to execute
 * @param wait - The number of milliseconds to delay
 * @returns The debounced callback function
 */
export function debouncedWatch<T>(
  callback: (newValue: T, oldValue: T) => void,
  wait: number
): (newValue: T, oldValue: T) => void {
  return debounce(callback, wait)
}

/**
 * Creates a debounced input handler
 * Specifically designed for handling user input events
 * 
 * @param handler - The input handler function
 * @param delay - The debounce delay in milliseconds (default: 300)
 * @returns The debounced input handler
 */
export function debounceInput(
  handler: (value: string) => void,
  delay: number = 300
): (event: Event) => void {
  const debouncedHandler = debounce(handler, delay)
  
  return (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target) {
      debouncedHandler(target.value)
    }
  }
}

/**
 * Creates a debounced search function
 * Useful for search inputs that trigger API calls
 * 
 * @param searchFunction - The search function to debounce
 * @param delay - The debounce delay in milliseconds (default: 500)
 * @returns The debounced search function
 */
export function debounceSearch<T>(
  searchFunction: (query: string) => Promise<T>,
  delay: number = 500
): (query: string) => Promise<T> {
  return debounceAsync(searchFunction, delay)
}

/**
 * Creates a debounced resize handler
 * Useful for handling window resize events
 * 
 * @param handler - The resize handler function
 * @param delay - The debounce delay in milliseconds (default: 250)
 * @returns The debounced resize handler
 */
export function debounceResize(
  handler: () => void,
  delay: number = 250
): () => void {
  return debounce(handler, delay)
}

/**
 * Creates a debounced scroll handler
 * Useful for handling scroll events
 * 
 * @param handler - The scroll handler function
 * @param delay - The debounce delay in milliseconds (default: 100)
 * @returns The debounced scroll handler
 */
export function debounceScroll(
  handler: (event: Event) => void,
  delay: number = 100
): (event: Event) => void {
  return debounce(handler, delay)
}