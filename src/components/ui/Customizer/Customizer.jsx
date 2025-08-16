
"use client"

import { useEffect, useState, useRef } from "react"
import { isUsable } from "../../../helpers/functions"
import GaTracker from "../../../trackers/ga-tracker"
import { ReaderDefault, ReaderPreferenceOptions } from "../../../config/readerTheme"

const InstantCustomizer = ({ rendition, isVisible = false }) => {
  const [readerPreferences, setReaderPreferences] = useState({
    ...ReaderDefault,
    fontFamily: ReaderDefault.fontFamily.id,
    theme: ReaderDefault.theme.id,
  })

  const renditionRef = useRef()

  useEffect(() => {
    renditionRef.current = rendition
  }, [rendition])

  const savePreferences = (readerPreferences) => {
    if (!window.localStorage) return
    window.localStorage.setItem("READER_PREFERENCES", JSON.stringify(readerPreferences))
  }

  const loadSavedPreferences = () => {
    if (!window.localStorage) return {}
    try {
      const savedItem = JSON.parse(window.localStorage.getItem("READER_PREFERENCES"))
      return savedItem || {}
    } catch (err) {
      return {}
    }
  }

  useEffect(() => {
    const {
      fontSize = ReaderDefault.fontSize,
      lineHeight = ReaderDefault.lineHeight,
      margin = ReaderDefault.margin,
      fontFamily = ReaderDefault.fontFamily.id,
      theme = ReaderDefault.theme.id,
    } = loadSavedPreferences()
    setReaderPreferences({ fontSize, lineHeight, margin, fontFamily, theme })
  }, [])

  useEffect(() => {
    if (!isUsable(rendition)) return

    try {
      let selectedTheme = ReaderPreferenceOptions.themes.find((s) => s.id === readerPreferences.theme)
      let selectedFontFamily = ReaderPreferenceOptions.fontFamily.find((s) => s.id === readerPreferences.fontFamily)
      if (!isUsable(selectedTheme)) selectedTheme = ReaderPreferenceOptions.themes[0]
      if (!isUsable(selectedFontFamily)) selectedFontFamily = ReaderPreferenceOptions.fontFamily[0]

      // Apply styles immediately to rendition
      rendition.themes.override("--font-size", readerPreferences.fontSize + "%")
      rendition.themes.override("--font-family", selectedFontFamily.value)
      rendition.themes.override("--line-height", readerPreferences.lineHeight)
      rendition.themes.override("--margin", readerPreferences.margin + "%")
      rendition.themes.override("--background-color", selectedTheme.backgroundColor)
      rendition.themes.override("--color", selectedTheme.color)

      // Apply body theme
      window.document.body.setAttribute("data-theme", selectedTheme.bodyTheme)

      // Save preferences
      savePreferences(readerPreferences)
    } catch (error) {
      console.debug("Theme application error handled:", error)
    }
  }, [readerPreferences, rendition])

  const updateFontSize = (fontSize) => {
    GaTracker("event_customizer_fontsize_" + fontSize)
    setReaderPreferences((rp) => ({ ...rp, fontSize }))
  }

  const updateLineHeight = (lineHeight) => {
    GaTracker("event_customizer_lineheight_" + lineHeight)
    setReaderPreferences((rp) => ({ ...rp, lineHeight }))
  }

const updateMargin = (margin) => {
  GaTracker("event_customizer_margin_" + margin)
  
  // Map margin values to font sizes
  let fontSizePercentage
  switch(margin) {
    case 5:
      fontSizePercentage = 80
      break
    case 10:
      fontSizePercentage = 90
      break
    case 15:
      fontSizePercentage = 100
      break
    default:
      fontSizePercentage = 80 + (margin * 1.33) // Dynamic calculation
  }
  
  setReaderPreferences((rp) => ({ 
    ...rp, 
    margin,
    fontSize: fontSizePercentage
  }))
}

  const setTheme = (theme = "reader-theme-light") => {
    GaTracker("event_customizer_theme_" + theme)
    setReaderPreferences((rp) => ({ ...rp, theme }))
  }

  const setFont = (fontFamily) => {
    GaTracker("event_customizer_font_" + fontFamily)
    setReaderPreferences((rp) => ({ ...rp, fontFamily }))
  }

  const getCurrentFontIndex = () => {
    return ReaderPreferenceOptions.fontFamily.findIndex((f) => f.id === readerPreferences.fontFamily)
  }

  const cycleFontNext = () => {
    const currentIndex = getCurrentFontIndex()
    const nextIndex = (currentIndex + 1) % ReaderPreferenceOptions.fontFamily.length
    setFont(ReaderPreferenceOptions.fontFamily[nextIndex].id)
  }

  const cycleFontPrev = () => {
    const currentIndex = getCurrentFontIndex()
    const prevIndex = currentIndex === 0 ? ReaderPreferenceOptions.fontFamily.length - 1 : currentIndex - 1
    setFont(ReaderPreferenceOptions.fontFamily[prevIndex].id)
  }

  const currentFont = ReaderPreferenceOptions.fontFamily.find((f) => f.id === readerPreferences.fontFamily)

  return (
    <div className={`panel panel__customizer--instant ${isVisible ? "panel__customizer--instant--show" : ""}`}>
      {/* Theme Selection Row */}
      <div className="compact-row compact-row--themes">
        <div className="compact-label">Theme</div>
        <div className="theme-buttons">
          {ReaderPreferenceOptions.themes.map((theme) => (
            <button
              key={theme.id}
              className={`theme-btn ${readerPreferences.theme === theme.id ? "theme-btn--active" : ""}`}
              onClick={() => setTheme(theme.id)}
              style={{
                backgroundColor: theme.backgroundColor,
                color: theme.color,
              }}
            >
              {theme.name}
            </button>
          ))}
        </div>
      </div>

      {/* Font Selection Row */}
      <div className="compact-row compact-row--font">
        <div className="compact-label">Font</div>
        <div className="font-selector">
          <button className="font-nav-btn" onClick={cycleFontPrev}>
            −
          </button>
          <div className="font-display">
            <span className="font-name" style={{ fontFamily: currentFont?.value }}>
              {currentFont?.name}
            </span>
            <div className="font-dots">
              {ReaderPreferenceOptions.fontFamily.map((_, index) => (
                <div key={index} className={`font-dot ${index === getCurrentFontIndex() ? "font-dot--active" : ""}`} />
              ))}
            </div>
          </div>
          <button className="font-nav-btn" onClick={cycleFontNext}>
            +
          </button>
        </div>
        <div className="font-size-controls">
          <button
            className="size-btn"
            onClick={() =>
              updateFontSize(Math.max(ReaderPreferenceOptions.fontSize.min, readerPreferences.fontSize - 10))
            }
          >
            −
          </button>
          <span className="size-display">{readerPreferences.fontSize}%</span>
          <button
            className="size-btn"
            onClick={() =>
              updateFontSize(Math.min(ReaderPreferenceOptions.fontSize.max, readerPreferences.fontSize + 10))
            }
          >
            +
          </button>
        </div>
      </div>

      {/* Spacing and Margins Row */}
      <div className="compact-row compact-row--spacing">
        <div className="spacing-section">
          <div className="compact-label">Line Spacing</div>
          <div className="spacing-options">
            {ReaderPreferenceOptions.lineHeight.options.map((option) => (
              <button
                key={option.id}
                className={`spacing-btn ${readerPreferences.lineHeight === option.value ? "spacing-btn--active" : ""}`}
                onClick={() => updateLineHeight(option.value)}
                title={option.label}
              >
                <div className="spacing-lines">
                  <div className="spacing-line"></div>
                  <div className="spacing-line"></div>
                  <div className="spacing-line"></div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="margin-section">
          <div className="compact-label">Margins</div>
          <div className="margin-options">
            {ReaderPreferenceOptions.margin.options.map((option) => (
              <button
                key={option.id}
                className={`margin-btn ${readerPreferences.margin === option.value ? "margin-btn--active" : ""}`}
                onClick={() => updateMargin(option.value)}
                title={option.label}
              >
                <div className="margin-preview">
                  <div className="margin-content"></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstantCustomizer
