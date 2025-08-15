"use client"

import { useState, useRef } from "react"
import { ReaderPreferenceOptions } from "../../../config/readerTheme"

const FontSelector = ({ selectedFont, onFontSelect }) => {
  const [currentCategory, setCurrentCategory] = useState("serif")
  const [touchStartX, setTouchStartX] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef(null)

  const categories = ["serif", "sans-serif", "monospace"]
  const categoryTitles = {
    serif: "Serif Fonts",
    "sans-serif": "Sans-serif Fonts",
    monospace: "Monospace Fonts",
  }

  const getFontsByCategory = (category) => {
    return ReaderPreferenceOptions.fontFamily.filter((font) => font.category === category)
  }

  // Separate handler for touch start to avoid passive event issues
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX)
    }
  }

  // Separate handler for touch move with preventDefault
  const handleTouchMove = (e) => {
    if (touchStartX && e.touches.length === 1) {
      // This will be called with passive: false
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e) => {
    if (!touchStartX || isTransitioning || !e.changedTouches.length) return

    const touchEndX = e.changedTouches[0].clientX
    const deltaX = touchEndX - touchStartX
    const threshold = 50

    if (Math.abs(deltaX) > threshold) {
      setIsTransitioning(true)
      const currentIndex = categories.indexOf(currentCategory)

      if (deltaX > 0 && currentIndex > 0) {
        setCurrentCategory(categories[currentIndex - 1])
      } else if (deltaX < 0 && currentIndex < categories.length - 1) {
        setCurrentCategory(categories[currentIndex + 1])
      }

      setTimeout(() => setIsTransitioning(false), 300)
    }

    setTouchStartX(null)
  }

  // Mouse event handlers for desktop
  const handleMouseDown = (e) => {
    setTouchStartX(e.clientX)
  }

  const handleMouseMove = (e) => {
    if (touchStartX !== null) {
      e.preventDefault()
    }
  }

  const handleMouseUp = (e) => {
    if (!touchStartX || isTransitioning) return

    const deltaX = e.clientX - touchStartX
    const threshold = 50

    if (Math.abs(deltaX) > threshold) {
      setIsTransitioning(true)
      const currentIndex = categories.indexOf(currentCategory)

      if (deltaX > 0 && currentIndex > 0) {
        setCurrentCategory(categories[currentIndex - 1])
      } else if (deltaX < 0 && currentIndex < categories.length - 1) {
        setCurrentCategory(categories[currentIndex + 1])
      }

      setTimeout(() => setIsTransitioning(false), 300)
    }

    setTouchStartX(null)
  }

  const currentFonts = getFontsByCategory(currentCategory)

  return (
    <div className="font-selector">
      <div className="font-selector__header">
        <div className="font-selector__category-nav">
          {categories.map((category) => (
            <button
              key={category}
              className={`font-selector__category-btn ${
                currentCategory === category ? "font-selector__category-btn--active" : ""
              }`}
              onClick={() => !isTransitioning && setCurrentCategory(category)}
              aria-label={`Switch to ${categoryTitles[category]}`}
            >
              {categoryTitles[category]}
            </button>
          ))}
        </div>
        <div className="font-selector__swipe-hint">Swipe to browse categories</div>
      </div>

      <div
        ref={containerRef}
        className={`font-selector__container ${isTransitioning ? "font-selector__container--transitioning" : ""}`}
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
              onClick={() => onFontSelect(font.id)}
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
            aria-label={`Category: ${categoryTitles[category]}`}
          />
        ))}
      </div>
    </div>
  )
}

export default FontSelector