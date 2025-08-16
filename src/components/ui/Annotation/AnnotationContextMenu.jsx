"use client"

import { useMemo, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { FaHighlighter, FaTimes } from "react-icons/fa"
import "../../../sass/components/ui/annotation-context-menu.scss"

const AnnotationContextMenu = ({ position, onAddAnnotation, onClose, visible = true }) => {
  const colors = useMemo(
    () => [
      { name: "Yellow", value: "#ffff00" },
      { name: "Green", value: "#00ff00" },
      { name: "Blue", value: "#00bfff" },
      { name: "Pink", value: "#ff69b4" },
      { name: "Orange", value: "#ffa500" },
    ],
    []
  )

  // iOS detection
  const isIOS = useMemo(() => {
    return typeof navigator !== 'undefined' && 
           /iPad|iPhone|iPod/.test(navigator.userAgent) && 
           !window.MSStream;
  }, [])

  // Track if the menu has been shown to iOS
  const hasBeenShownRef = useRef(false)

  // Handle escape key
  useEffect(() => {
    if (typeof document === "undefined" || !visible || !position) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose, position])

  // SSR guard + basic visibility guard
  if (typeof document === "undefined" || !visible || !position) return null

  // iOS-specific adjustments
  if (isIOS && !hasBeenShownRef.current) {
    hasBeenShownRef.current = true
    
    // Force a re-render to work around iOS rendering quirks
    setTimeout(() => {
      hasBeenShownRef.current = false
    }, 100)
  }

  // Enhanced clamping function for iOS
  const clampToViewport = (x, y, w = 360, h = 120, pad = 8) => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    
    // Adjust for iOS viewport quirks
    const safeVH = isIOS ? Math.max(vh, window.visualViewport?.height || vh) : vh
    const safeY = isIOS ? Math.min(y, safeVH - 50) : y

    const left = x - w / 2
    const top = safeY - h

    const clampedLeft = Math.max(pad, Math.min(left, vw - w - pad))
    const clampedTop = Math.max(pad, Math.min(top, safeVH - h - pad))

    return { 
      x: clampedLeft + w / 2, 
      y: clampedTop + h,
      // Add extra padding at the bottom for iOS
      bottom: isIOS ? '20px' : 'auto'
    }
  }

  const { x, y, bottom } = clampToViewport(
    Math.round(position.x ?? 0),
    Math.round(position.y ?? 0)
  )

  // Handle clicks outside the menu
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // iOS-specific style adjustments
  const menuStyle = {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    transform: "translate(-50%, -100%)",
    zIndex: 9999,
    pointerEvents: "auto",
    // Add iOS-specific adjustments
    ...(isIOS && {
      WebkitOverflowScrolling: 'touch',
      WebkitTransform: 'translateZ(0)',
      bottom: bottom,
      top: 'auto',
      transform: 'translateX(-50%)',
      maxWidth: '90vw',
    })
  }

  return createPortal(
    <div
      className="annotation-context-menu-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9998,
        // iOS-specific backdrop
        ...(isIOS && {
          backgroundColor: 'rgba(0,0,0,0.2)',
          touchAction: 'none',
        })
      }}
      onClick={handleBackdropClick}
      // Prevent iOS touch events from propagating
      onTouchMove={e => isIOS && e.preventDefault()}
    >
      <div
        className="annotation-context-menu"
        style={menuStyle}
        data-test="annotation-context-menu"
        role="dialog"
        aria-label="Annotation menu"
        onClick={(e) => e.stopPropagation()}
        // iOS-specific touch handlers
        onTouchStart={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
      >
        <div className="context-menu-header">
          <FaHighlighter className="context-menu-icon" />
          <span>Highlight</span>
          <button 
            className="close-button" 
            onClick={onClose} 
            aria-label="Close"
            type="button"
          >
            <FaTimes />
          </button>
        </div>

        <div className="color-options">
          {colors.map((color) => (
            <button
              key={color.value}
              className="color-option"
              style={{ 
                backgroundColor: color.value,
                border: '2px solid transparent',
                transition: 'all 0.2s ease',
              }}
              onClick={() => {
                onAddAnnotation(color.value)
                onClose()
              }}
              title={color.name}
              aria-label={`Highlight ${color.name}`}
              type="button"
              // iOS-specific touch feedback
              onTouchStart={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default AnnotationContextMenu