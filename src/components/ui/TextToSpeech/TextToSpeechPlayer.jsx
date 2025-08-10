// TextToSpeechPlayer.jsx — full updated file (replace existing)
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  FaTimes,
  FaPlay,
  FaPause,
  FaStop,
  FaStepForward,
  FaStepBackward,
  FaVolumeUp,
  FaVolumeMute,
} from "react-icons/fa"
import "./TextToSpeechPlayer.scss" // Import the SCSS file

const TextToSpeechPanel = ({ rendition, currentLocationCFI, onClose, isVisible }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentText, setCurrentText] = useState("")
  const [progress, setProgress] = useState(0)
  const [rate, setRate] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [volume, setVolume] = useState(0.8)
  const [voice, setVoice] = useState(null)
  const [availableVoices, setAvailableVoices] = useState([])

  // Refs for continuous reading control
  const isPlayingRef = useRef(false) // toggled when user presses Play / Stop
  const isSpeakingPageRef = useRef(false) // true while we are speaking chunks of the current page
  const utteranceRef = useRef(null)
  const speechSynthesisRef = useRef(null)
  const speechTimeoutRef = useRef(null) // For debouncing page text extraction

  // Setup voices
  useEffect(() => {
    speechSynthesisRef.current = window.speechSynthesis
    const loadVoices = () => {
      const voices = speechSynthesisRef.current.getVoices()
      setAvailableVoices(voices)
      if (voices.length > 0 && !voice) {
        setVoice(voices[0])
      }
    }

    loadVoices()
    speechSynthesisRef.current.addEventListener("voiceschanged", loadVoices)

    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel()
        speechSynthesisRef.current.removeEventListener("voiceschanged", loadVoices)
      }
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
      }
    }
  }, [voice])

  // ---------- PAGE-WISE TEXT EXTRACTION (uses page CFIs stored in window.__bookLocations) ----------
// Track the current visible contents
const extractTextFromCurrentPage = useCallback(() => {
  try {
    const iframe = document.querySelector("#book__reader iframe");
    if (!iframe) return "";

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    if (!doc) return "";

    // This is the actual column container epub.js scrolls
    const scroller = doc.querySelector(".epub-view") || doc.body;
    const pageWidth = scroller.clientWidth;
    const scrollLeft = scroller.scrollLeft;

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
    const visibleNodes = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeValue.trim()) {
        const rects = node.parentElement?.getClientRects?.();
        if (
          rects &&
          [...rects].some(r =>
            r.left >= scrollLeft &&
            r.right <= scrollLeft + pageWidth &&
            r.width > 0 &&
            r.height > 0
          )
        ) {
          visibleNodes.push(node.nodeValue);
        }
      }
    }

    return visibleNodes.join(" ").replace(/\s+/g, " ").trim();
  } catch (err) {
    console.error("Error extracting current column text:", err);
    return "";
  }
}, []);




  // ---------- keep preview currentText in sync but DO NOT auto-cancel/restart speech ----------
  useEffect(() => {
    if (!isVisible || !rendition) return

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
    }
    speechTimeoutRef.current = setTimeout(async () => {
      try {
        const text = await extractTextFromCurrentPage()
        // update preview only
        if (text !== currentText) {
          setCurrentText(text)
        }
      } catch (err) {
        console.debug("Preview extraction failed:", err)
      }
    }, 200)

    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current)
    }
    // intentionally include currentText so preview updates but we avoid cancelling/respeaking
  }, [currentLocationCFI, rendition, extractTextFromCurrentPage, isVisible, currentText])

  // ---------- speakPage: speak whole page in sequential chunks, then advance to next page ----------
  const speakPage = useCallback(async () => {
  const text = await extractTextFromCurrentPage();
  if (!text) {
    console.warn("No text found on current page to read.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;

  utterance.onend = () => {
    if (isPlayingRef.current) {
      rendition.next();
      // Delay slightly so the new page renders before reading
      setTimeout(() => {
        speakPage();
      }, 300);
    }
  };

  window.speechSynthesis.speak(utterance);
}, [extractTextFromCurrentPage, rendition]);


  // ---------- when a page finishes rendering, if the user asked to keep reading, start reading ----------
  useEffect(() => {
    if (!rendition) return

    const onRendered = () => {
      // only start when user is in continuous read mode and we aren't already speaking the page
      if (isPlayingRef.current && !isSpeakingPageRef.current && !speechSynthesisRef.current.speaking) {
        // small debounce to allow the iframe/document to stabilise
        setTimeout(() => {
          speakPage()
        }, 80)
      }
    }

    rendition.on("rendered", onRendered)
    return () => {
      try {
        rendition.off("rendered", onRendered)
      } catch (e) {}
    }
  }, [rendition, speakPage])

  // ---------- Play / Pause / Stop handlers (wired to UI) ----------
  const handlePlay = () => {
    // start continuous reading
    isPlayingRef.current = true
    setIsPlaying(true)
    setIsPaused(false)

    // If paused and there is an utterance, resume, else start reading the page
    if (isPaused && utteranceRef.current && speechSynthesisRef.current) {
      try {
        speechSynthesisRef.current.resume()
      } catch (err) {}
    } else {
      // start the speak loop for this page (if not already speaking)
      if (!isSpeakingPageRef.current) {
        speakPage()
      }
    }
  }

  const handlePause = () => {
    // pause ongoing speech
    if (speechSynthesisRef.current && (speechSynthesisRef.current.speaking || isSpeakingPageRef.current)) {
      try {
        speechSynthesisRef.current.pause()
      } catch (err) {}
      // mark playing ref false so speakPage stops queueing new chunks
      isPlayingRef.current = false
      setIsPaused(true)
      setIsPlaying(false)
    }
  }

  const handleStop = () => {
    // stop continuous reading and clear queue
    isPlayingRef.current = false
    isSpeakingPageRef.current = false
    if (speechSynthesisRef.current) {
      try {
        speechSynthesisRef.current.cancel()
      } catch (err) {}
    }
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
    utteranceRef.current = null
  }

  // Keep manual Next/Prev behavior (stop current speech then navigate)
  const handleNext = () => {
    if (rendition) {
      handleStop()
      rendition.next()
    }
  }

  const handlePrevious = () => {
    if (rendition) {
      handleStop()
      rendition.prev()
    }
  }

  const handleVolumeChange = (e) => {
    const newVolume = Number.parseFloat(e.target.value)
    setVolume(newVolume)
    if (utteranceRef.current) {
      utteranceRef.current.volume = newVolume
    }
  }

  const handleRateChange = (e) => {
    const newRate = Number.parseFloat(e.target.value)
    setRate(newRate)
    if (utteranceRef.current) {
      utteranceRef.current.rate = newRate
    }
  }

  const handleVoiceChange = (e) => {
    const selectedVoice = availableVoices.find((v) => v.name === e.target.value)
    setVoice(selectedVoice)
    // If speech is ongoing, restart the current page so voice is applied consistently
    if (isPlayingRef.current) {
      // re-speak current page with new voice
      handleStop()
      // small delay then start again
      setTimeout(() => {
        isPlayingRef.current = true
        speakPage()
      }, 120)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        try {
          speechSynthesisRef.current.cancel()
        } catch (e) {}
      }
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current)
      isPlayingRef.current = false
      isSpeakingPageRef.current = false
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="tts-panel">
      <div className="panel-header">
        <h3>
          <FaVolumeUp />
          Text to Speech
        </h3>
        <button className="close-button" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="tts-content">
        <div className="tts-progress">
          <div className="tts-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="tts-controls">
          <button className="control-button" onClick={handlePrevious} title="Previous Page">
            <FaStepBackward />
          </button>

          <button
            className="control-button play-button"
            onClick={isPlaying ? handlePause : handlePlay}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>

          <button className="control-button" onClick={handleStop} title="Stop">
            <FaStop />
          </button>

          <button className="control-button" onClick={handleNext} title="Next Page">
            <FaStepForward />
          </button>
        </div>

        <div className="tts-settings">
          <div className="setting-group">
            <label className="setting-label">
              {volume > 0 ? <FaVolumeUp /> : <FaVolumeMute />}
              Volume
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="setting-slider"
            />
            <span className="setting-value">{Math.round(volume * 100)}%</span>
          </div>

          <div className="setting-group">
            <label className="setting-label">Speed</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={handleRateChange}
              className="setting-slider"
            />
            <span className="setting-value">{rate}x</span>
          </div>

          <div className="setting-group">
            <label className="setting-label">Voice</label>
            <select value={voice?.name || ""} onChange={handleVoiceChange} className="voice-select">
              {availableVoices.length === 0 && <option>Loading voices...</option>}
              {availableVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-preview">
          <div className="text-preview-content">{currentText.substring(0, 200)}{currentText.length > 200 && "..."}</div>
        </div>
      </div>
    </div>
  )
}

export default TextToSpeechPanel
