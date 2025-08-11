"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  FaTimes,
  FaPlay,
  FaPause,
  FaStop,
  FaVolumeUp,
  FaVolumeMute,
} from "react-icons/fa"
import "./TextToSpeechPlayer.scss"

const TextToSpeechPanel = ({ rendition, onClose, isVisible }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  const [rate, setRate] = useState(1)
  const [volume, setVolume] = useState(0.8)
  const [voice, setVoice] = useState(null)
  const [availableVoices, setAvailableVoices] = useState([])
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [speechError, setSpeechError] = useState("")

  // Refs
  const isPlayingRef = useRef(false)
  const utteranceRef = useRef(null)
  const speechSynthesisRef = useRef(null)
  const voicesLoadTimeoutRef = useRef(null)
  const textUpdateTimeoutRef = useRef(null)

  // Text selection
  const getSelectedText = useCallback(() => {
    if (!rendition) return ""
    try {
      const contents = rendition.getContents()
      for (const content of contents) {
        if (content && content.window) {
          const selection = content.window.getSelection()
          const text = selection?.toString().trim() || ""
          if (text) return text
        }
      }
      return ""
    } catch (err) {
      return ""
    }
  }, [rendition])

  // Monitor text selection
  useEffect(() => {
    if (!isVisible || !rendition) return

    const updateSelectedText = () => {
      if (textUpdateTimeoutRef.current) {
        clearTimeout(textUpdateTimeoutRef.current)
      }
      textUpdateTimeoutRef.current = setTimeout(() => {
        const text = getSelectedText()
        setSelectedText(text)
        if (isPlayingRef.current && text !== selectedText) {
          handleStop()
        }
      }, 100)
    }

    const setupMonitoring = () => {
      const contents = rendition.getContents()
      contents.forEach(content => {
        if (content && content.document) {
          const handler = () => setTimeout(updateSelectedText, 10)
          content.document.addEventListener('mouseup', handler)
          content.document.addEventListener('touchend', handler)
          content.document.addEventListener('selectionchange', handler)
          content.document.__ttsCleanup = handler
        }
      })
    }

    setupMonitoring()
    const interval = setInterval(updateSelectedText, 500)

    return () => {
      clearInterval(interval)
      if (textUpdateTimeoutRef.current) clearTimeout(textUpdateTimeoutRef.current)
      const contents = rendition.getContents()
      contents.forEach(content => {
        if (content && content.document && content.document.__ttsCleanup) {
          const handler = content.document.__ttsCleanup
          content.document.removeEventListener('mouseup', handler)
          content.document.removeEventListener('touchend', handler)
          content.document.removeEventListener('selectionchange', handler)
          delete content.document.__ttsCleanup
        }
      })
    }
  }, [isVisible, rendition, getSelectedText, selectedText])

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    speechSynthesisRef.current = window.speechSynthesis
    
    const loadVoices = () => {
      try {
        const voices = speechSynthesisRef.current.getVoices()
        if (voices.length > 0) {
          setAvailableVoices(voices)
          setVoicesLoaded(true)
          if (!voice) {
            const preferredVoice = voices.find(v => 
              (v.lang.includes('en-US') || v.lang.includes('en-GB')) && 
              (v.name.includes('Google') || v.name.includes('Microsoft') || v.default)
            ) || voices.find(v => v.default) || voices[0]
            setVoice(preferredVoice)
          }
          return true
        }
        return false
      } catch (error) {
        setVoicesLoaded(true)
        return false
      }
    }

    if (loadVoices()) return

    const handleVoicesChanged = () => loadVoices()
    speechSynthesisRef.current.addEventListener("voiceschanged", handleVoicesChanged)
    voicesLoadTimeoutRef.current = setTimeout(() => loadVoices(), 800)

    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel()
        speechSynthesisRef.current.removeEventListener("voiceschanged", handleVoicesChanged)
      }
      if (voicesLoadTimeoutRef.current) clearTimeout(voicesLoadTimeoutRef.current)
    }
  }, [voice])

  // Speech functions
  const speakText = useCallback(() => {
    if (!selectedText) {
      setSpeechError("No text selected")
      return
    }

    try {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel()
      }

      const utterance = new SpeechSynthesisUtterance(selectedText)
      utteranceRef.current = utterance
      utterance.rate = rate
      utterance.volume = volume
      if (voice) utterance.voice = voice

      utterance.onstart = () => {
        isPlayingRef.current = true
        setIsPlaying(true)
        setIsPaused(false)
        setSpeechError("")
      }

      utterance.onend = () => {
        isPlayingRef.current = false
        setIsPlaying(false)
        setIsPaused(false)
      }

      utterance.onerror = (event) => {
        isPlayingRef.current = false
        setIsPlaying(false)
        setIsPaused(false)
        setSpeechError(`Error: ${event.error || 'Unknown error'}`)
      }

      speechSynthesisRef.current.speak(utterance)
    } catch (error) {
      setSpeechError(`Error: ${error.message}`)
      isPlayingRef.current = false
    }
  }, [selectedText, voice, rate, volume])

  // Control handlers
  const handlePlay = useCallback(() => speakText(), [speakText])
  const handlePause = useCallback(() => {
    if (speechSynthesisRef.current && speechSynthesisRef.current.speaking) {
      speechSynthesisRef.current.pause()
      isPlayingRef.current = false
      setIsPaused(true)
      setIsPlaying(false)
    }
  }, [])
  const handleResume = useCallback(() => {
    if (speechSynthesisRef.current && speechSynthesisRef.current.paused) {
      speechSynthesisRef.current.resume()
      isPlayingRef.current = true
      setIsPlaying(true)
      setIsPaused(false)
    }
  }, [])
  const handleStop = useCallback(() => {
    isPlayingRef.current = false
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel()
    }
    setIsPlaying(false)
    setIsPaused(false)
    setSpeechError("")
    utteranceRef.current = null
  }, [])

  // Setting handlers
  const handleVolumeChange = useCallback((e) => {
    const newVolume = Number.parseFloat(e.target.value)
    setVolume(newVolume)
    if (utteranceRef.current && isPlayingRef.current) {
      utteranceRef.current.volume = newVolume
    }
  }, [])
  const handleRateChange = useCallback((e) => {
    const newRate = Number.parseFloat(e.target.value)
    setRate(newRate)
    if (utteranceRef.current && isPlayingRef.current) {
      utteranceRef.current.rate = newRate
    }
  }, [])
  const handleVoiceChange = useCallback((e) => {
    const selectedVoice = availableVoices.find(v => v.name === e.target.value)
    setVoice(selectedVoice)
    if (isPlayingRef.current) {
      handleStop()
      setTimeout(() => speakText(), 50)
    }
  }, [availableVoices, handleStop, speakText])

  // Cleanup
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel()
      }
      if (voicesLoadTimeoutRef.current) clearTimeout(voicesLoadTimeoutRef.current)
      if (textUpdateTimeoutRef.current) clearTimeout(textUpdateTimeoutRef.current)
      isPlayingRef.current = false
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="tts-panel">
      <div className="tts-content">
        {/* Selected text preview - CLEAN LAYOUT */}
        <div style={{ marginBottom: '15px' }}>
          <div 
            style={{ 
              background: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '8px',
              padding: '12px',
              minHeight: '60px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <div style={{ 
              fontSize: '14px',
              lineHeight: '1.4',
              color: '#666',
              fontStyle: selectedText ? 'normal' : 'italic'
            }}>
              {selectedText ? (
                selectedText.substring(0, 150) + (selectedText.length > 150 ? "..." : "")
              ) : (
                "Select text in the book to begin"
              )}
            </div>
          </div>
        </div>

        {/* Error display */}
        {speechError && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '10px'
          }}>
            {speechError}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ 
          width: '100%', 
          height: '6px', 
          background: 'rgba(0, 0, 0, 0.1)', 
          borderRadius: '3px',
          marginBottom: '15px',
          overflow: 'hidden'
        }}>
          <div 
            style={{ 
              height: '100%', 
              background: 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '3px',
              width: isPlaying ? '100%' : '0%',
              transition: 'width 0.3s ease'
            }}
          ></div>
        </div>

        {/* Controls - PROPERLY ALIGNED */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px',
          marginBottom: '20px'
        }}>
          <button
            onClick={isPlaying ? handlePause : (isPaused ? handleResume : handlePlay)}
            disabled={!selectedText}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: 'none',
              background: isPlaying ? 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)' : 'rgba(255, 255, 255, 0.8)',
              color: isPlaying ? 'white' : '#333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: selectedText ? 'pointer' : 'not-allowed',
              fontSize: '18px',
              boxShadow: '0 4px 15px rgba(100, 126, 234, 0.3)',
              transition: 'all 0.2s ease'
            }}
            title={isPlaying ? "Pause" : (isPaused ? "Resume" : "Play")}
          >
            {isPlaying ? <FaPause /> : (isPaused ? <FaPlay /> : <FaPlay />)}
          </button>

          <button
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.8)',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (isPlaying || isPaused) ? 'pointer' : 'not-allowed',
              fontSize: '18px',
              boxShadow: '0 4px 15px rgba(100, 126, 234, 0.3)',
              transition: 'all 0.2s ease'
            }}
            title="Stop"
          >
            <FaStop />
          </button>
        </div>

        {/* Settings - ORGANIZED LAYOUT */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '15px',
          marginBottom: '15px'
        }}>
          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px', 
              minWidth: '80px',
              fontSize: '14px',
              color: '#333'
            }}>
              {volume > 0 ? <FaVolumeUp size={14} /> : <FaVolumeMute size={14} />}
              <span>Volume</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                background: 'rgba(0, 0, 0, 0.1)',
                outline: 'none',
                appearance: 'none'
              }}
            />
            <div style={{ 
              minWidth: '40px', 
              textAlign: 'right', 
              fontSize: '14px',
              color: '#333'
            }}>
              {Math.round(volume * 100)}%
            </div>
          </div>

          {/* Speed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px', 
              minWidth: '80px',
              fontSize: '14px',
              color: '#333'
            }}>
              <span>Speed</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={handleRateChange}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                background: 'rgba(0, 0, 0, 0.1)',
                outline: 'none',
                appearance: 'none'
              }}
            />
            <div style={{ 
              minWidth: '40px', 
              textAlign: 'right', 
              fontSize: '14px',
              color: '#333'
            }}>
              {rate}x
            </div>
          </div>

          {/* Voice */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              minWidth: '80px',
              fontSize: '14px',
              color: '#333'
            }}>
              Voice
            </div>
            <select 
              value={voice?.name || ""} 
              onChange={handleVoiceChange}
              disabled={!voicesLoaded}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.8)',
                color: '#333',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              {!voicesLoaded && <option>Loading voices...</option>}
              {availableVoices.length === 0 && voicesLoaded && <option>No voices available</option>}
              {availableVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Close button */}
        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #ccc',
              padding: '8px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              color: '#666',
              fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default TextToSpeechPanel