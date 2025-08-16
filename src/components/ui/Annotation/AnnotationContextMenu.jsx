"use client"

import { useMemo, useEffect, useRef, useState } from "react"
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

  const [finalPosition, setFinalPosition] = useState(position)
  const menuRef = useRef(null)
  
  // Enhanced Safari detection including iOS
  const isSafari = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    
    const ua = navigator.userAgent;
    return (
      /^((?!chrome|android).)*safari/i.test(ua) ||
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }, [])

  // Handle escape key
  useEffect(() => {
    if (!visible || !position) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose, position])

  // Enhanced positioning for all browsers
  useEffect(() => {
    if (!visible || !menuRef.current) return
    
    const calculatePosition = () => {
      if (!position) return;
      
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      let adjustedX = position.x;
      let adjustedY = position.y;
      const padding = 10;
      
      // Adjust for Safari viewport quirks
      const visualVH = window.visualViewport?.height || vh;
      const visualVW = window.visualViewport?.width || vw;
      
      // Right edge check
      if (position.x + rect.width/2 > visualVW) {
        adjustedX = visualVW - rect.width/2 - padding;
      }
      // Left edge check
      else if (position.x - rect.width/2 < 0) {
        adjustedX = rect.width/2 + padding;
      }
      
      // Bottom edge check (Safari-specific)
      if (isSafari && position.y - rect.height < 0) {
        adjustedY = visualVH - rect.height - padding;
      }
      // Standard top edge check
      else if (!isSafari && position.y - rect.height < 0) {
        adjustedY = rect.height + padding;
      }
      
      setFinalPosition({ x: adjustedX, y: adjustedY });
    };
    
    // Safari needs extra calculation time
    const timer = setTimeout(calculatePosition, isSafari ? 100 : 0);
    return () => clearTimeout(timer);
  }, [position, visible, isSafari]);

  // SSR guard + visibility check
  if (typeof document === "undefined" || !visible || !position) return null;

  // Handle clicks outside the menu
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  }

  // Safari-specific styles
  const safariStyles = {
    backdrop: {
      WebkitTapHighlightColor: "transparent",
      WebkitTouchCallout: "none",
      backgroundColor: "rgba(0,0,0,0.15)"
    },
    menu: {
      WebkitTransform: "translateZ(0)",
      willChange: "transform",
      WebkitOverflowScrolling: "touch",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      border: "1px solid rgba(0,0,0,0.1)",
      maxWidth: "90vw",
      zIndex: 2147483647 // Max z-index for Safari
    },
    colorOption: {
      WebkitTapHighlightColor: "transparent"
    }
  };

  return createPortal(
    <div
      className="annotation-context-menu-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2147483646, // Just below menu
        ...(isSafari && safariStyles.backdrop)
      }}
      onClick={handleBackdropClick}
      onTouchMove={e => e.preventDefault()}
    >
      <div
        ref={menuRef}
        className="annotation-context-menu"
        style={{
          position: "fixed",
          left: `${finalPosition.x}px`,
          top: `${finalPosition.y}px`,
          transform: "translate(-50%, -100%)",
          pointerEvents: "auto",
          ...(isSafari && safariStyles.menu)
        }}
        role="dialog"
        aria-label="Annotation menu"
        onClick={(e) => e.stopPropagation()}
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
                transition: 'transform 0.2s ease',
                ...(isSafari && safariStyles.colorOption)
              }}
              onClick={() => {
                onAddAnnotation(color.value);
                onClose();
              }}
              title={color.name}
              aria-label={`Highlight ${color.name}`}
              type="button"
              onTouchStart={e => {
                e.currentTarget.style.transform = 'scale(1.15)';
                e.currentTarget.style.transition = 'transform 0.1s ease';
              }}
              onTouchEnd={e => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AnnotationContextMenu;
