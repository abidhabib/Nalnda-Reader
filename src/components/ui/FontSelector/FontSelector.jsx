"use client"

import { useState, useRef, useEffect } from "react"
import { ReaderPreferenceOptions } from "../../../config/readerTheme"

const FontSelector = ({ selectedFont, onFontSelect }) => {
  const [currentCategory, setCurrentCategory] = useState("serif")
  const containerRef = useRef(null)
  const touchStartXRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const categories = ["serif", "sans-serif", "monospace"]
  const categoryTitles = {
    serif: "Serif Fonts",
    "sans-serif": "Sans-serif Fonts",
    monospace: "Monospace Fonts",
  }

  const getFontsByCategory = (category) => {
    return ReaderPreferenceOptions.fontFamily.filter((font) => font.category === category)
  }

  // Handle category navigation with buttons (always works)
  const goToCategory = (direction) => {
    const currentIndex = categories.indexOf(currentCategory)
    if (direction === 'next' && currentIndex < categories.length - 1) {
      setCurrentCategory(categories[currentIndex + 1])
    } else if (direction === 'prev' && currentIndex > 0) {
      setCurrentCategory(categories[currentIndex - 1])
    }
  }

  // Simple touch handlers that work on iOS
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX
      setIsDragging(true)
    }
  }

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return
    
    const touchX = e.touches[0].clientX
    const deltaX = touchX - touchStartXRef.current
    
    // Only prevent default for significant horizontal movement
    if (Math.abs(deltaX) > 10) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e) => {
    if (!isDragging) return
    
    let swipeDetected = false;
    
    if (e.changedTouches.length > 0) {
      const touchEndX = e.changedTouches[0].clientX
      const deltaX = touchEndX - touchStartXRef.current
      const threshold = 30 // Lower threshold for better mobile UX

      // Check if touch started on a control element
      const startedOnControl = e.target.closest('.font-selector__category-btn, .font-selector__nav-arrow, .font-selector__indicator');
      
      if (Math.abs(deltaX) > threshold && !startedOnControl) {
        swipeDetected = true;
        if (deltaX > 0) {
          goToCategory('prev')
        } else {
          goToCategory('next')
        }
      } else if (!swipeDetected) {
        // Handle font selection
        const touch = e.changedTouches[0]
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY)
        
        if (targetElement) {
          const fontItem = targetElement.closest('.font-selector__font')
          if (fontItem) {
            const fontId = fontItem.dataset.fontId
            onFontSelect(fontId)
          }
        }
      }
    }
    
    setIsDragging(false)
  }

  // Mouse handlers for desktop
  const handleMouseDown = (e) => {
    touchStartXRef.current = e.clientX
    setIsDragging(true)
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    e.preventDefault()
  }

  const handleMouseUp = (e) => {
    if (!isDragging) return
    
    const deltaX = e.clientX - touchStartXRef.current
    const threshold = 30

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        goToCategory('prev')
      } else {
        goToCategory('next')
      }
    } else {
      // Handle font selection
      const fontItem = e.target.closest('.font-selector__font')
      if (fontItem) {
        const fontId = fontItem.dataset.fontId
        onFontSelect(fontId)
      }
    }
    
    setIsDragging(false)
  }

  const currentFonts = getFontsByCategory(currentCategory)

  return (

   <>
   
   
    <div className="font-selector">
      <div className="font-selector__header">
        <div className="font-selector__category-nav">
          {categories.map((category) => (
            <button
              key={category}
              className={`font-selector__category-btn ${
                currentCategory === category ? "font-selector__category-btn--active" : ""
              }`}
              onClick={() => setCurrentCategory(category)}
              aria-label={`Switch to ${categoryTitles[category]}`}
            >
              {categoryTitles[category]}
            </button>
          ))}
        </div>
        <div className="font-selector__swipe-hint">Swipe or use arrows to browse</div>
      </div>

      {/* Navigation arrows for better UX */}
      <div className="font-selector__nav-arrows">
        <button 
          className="font-selector__nav-arrow font-selector__nav-arrow--prev"
          onClick={() => goToCategory('prev')}
          disabled={categories.indexOf(currentCategory) === 0}
          aria-label="Previous category"
        >
          ‹
        </button>
        <button 
          className="font-selector__nav-arrow font-selector__nav-arrow--next"
          onClick={() => goToCategory('next')}
          disabled={categories.indexOf(currentCategory) === categories.length - 1}
          aria-label="Next category"
        >
          ›
        </button>
      </div>

      <div
        ref={containerRef}
        className="font-selector__container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="font-selector__fonts">
          {currentFonts.map((font) => (
            <div
              key={font.id}
              className={`font-selector__font ${selectedFont === font.id ? "font-selector__font--selected" : ""}`}
              style={{ fontFamily: font.value }}
              data-font-id={font.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onFontSelect(font.id)
                }
              }}
            >
              <div className="font-selector__font__demo">The quick brown fox jumps</div>
              <div className="font-selector__font__name">{font.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="font-selector__indicators">
        {categories.map((category) => (
          <div
            key={category}
            className={`font-selector__indicator ${
              currentCategory === category ? "font-selector__indicator--active" : ""
            }`}
            onClick={() => setCurrentCategory(category)}
            aria-label={`Go to ${categoryTitles[category]}`}
            role="button"
            tabIndex={0}
          />
        ))}
      </div>
    </div>
   
   </>
  )
}

export default FontSelector