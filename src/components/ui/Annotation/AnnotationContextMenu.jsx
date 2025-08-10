"use client"

import { useMemo } from "react"
import { createPortal } from "react-dom"
import { FaHighlighter, FaTimes } from "react-icons/fa"
import "../../../sass/components/ui/annotation-context-menu.scss"

/**
 * Props:
 * - position: { x: number, y: number }  // viewport coords (from getBoundingClientRect)
 * - onAddAnnotation: (color: string) => void
 * - onClose: () => void
 * - visible?: boolean                    // optional; defaults to true
 */
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

  // SSR guard + basic visibility guard
  if (typeof document === "undefined" || !visible || !position) return null

  // Clamp anchor so translate(-50%, -100%) won’t yeet it off-screen.
  const clampToViewport = (x, y, w = 360, h = 120, pad = 8) => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const left = x - w / 2
    const top = y - h

    const clampedLeft = Math.max(pad, Math.min(left, vw - w - pad))
    const clampedTop = Math.max(pad, Math.min(top, vh - h - pad))

    return { x: clampedLeft + w / 2, y: clampedTop + h }
  }

  const { x, y } = clampToViewport(
    Math.round(position.x ?? 0),
    Math.round(position.y ?? 0)
  )

  return createPortal(
    <div
      className="annotation-context-menu"
      style={{
        position: "fixed",            // critical: avoid clipping/stacking issues
        left: x,
        top: y,
        transform: "translate(-50%, -100%)", // above selection
      }}
      data-test="annotation-context-menu"
      role="dialog"
      aria-label="Annotation menu"
    >
      <div className="context-menu-header">
        <FaHighlighter className="context-menu-icon" />
        <span>Highlight</span>
        <button className="close-button" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>
      </div>

      <div className="color-options">
        {colors.map((color) => (
          <button
            key={color.value}
            className="color-option"
            style={{ backgroundColor: color.value }}
            onClick={() => onAddAnnotation(color.value)}
            title={color.name}
            aria-label={`Highlight ${color.name}`}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}

export default AnnotationContextMenu
