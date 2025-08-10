// Error handler utility to suppress ResizeObserver errors
export const suppressResizeObserverErrors = () => {
    // Store the original console.error
    const originalError = console.error
  
    // Override console.error to filter out ResizeObserver errors
    console.error = (...args) => {
      const errorMessage = args[0]
  
      // Check if it's a ResizeObserver error
      if (
        typeof errorMessage === "string" &&
        errorMessage.includes("ResizeObserver loop completed with undelivered notifications")
      ) {
        // Silently ignore ResizeObserver errors
        return
      }
  
      // For all other errors, use the original console.error
      originalError.apply(console, args)
    }
  
    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      if (
        event.reason &&
        event.reason.message &&
        event.reason.message.includes("ResizeObserver loop completed with undelivered notifications")
      ) {
        event.preventDefault()
      }
    })
  
    // Handle general errors
    window.addEventListener("error", (event) => {
      if (event.message && event.message.includes("ResizeObserver loop completed with undelivered notifications")) {
        event.preventDefault()
        event.stopImmediatePropagation()
        return false
      }
    })
  }
  
  // Debounced resize observer utility
  export const createDebouncedResizeObserver = (callback, delay = 100) => {
    let timeoutId = null
  
    return new ResizeObserver((entries) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
  
      timeoutId = setTimeout(() => {
        try {
          callback(entries)
        } catch (error) {
          // Silently handle ResizeObserver errors
          if (!error.message?.includes("ResizeObserver loop completed with undelivered notifications")) {
            console.error("ResizeObserver error:", error)
          }
        }
      }, delay)
    })
  }
  