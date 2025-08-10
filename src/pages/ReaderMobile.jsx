"use client"

import { useDispatch, useSelector } from "react-redux"
import { useSearchParams } from "react-router-dom"
import { useCallback, useEffect, useRef, useState } from "react"

import axios from "axios"
import Epub, { EpubCFI } from "epubjs"

import useDebounce from "../hook/useDebounce"

import Button from "../components/ui/Buttons/Button"
import TocPanel from "../components/ui/TocPanel/TocPanel"
import ReadTimer from "../components/ui/ReadTime/ReadTime"
import SidePanel from "../components/hoc/SidePanel/SidePanel"
import Customizer from "../components/ui/Customizer/Customizer"
import RangeSlider from "../components/ui/RangeSlider/RangeSlider"
import AnnotationPanel from "../components/ui/Annotation/AnnotationPanel"
import AnnotationContextMenu from "../components/ui/Annotation/AnnotationContextMenu"
import TextToSpeechPlayer from "../components/ui/TextToSpeech/TextToSpeechPlayer"

import { isFilled, isUsable } from "../helpers/functions"
import { hideSpinner, showSpinner } from "../store/actions/spinner"

import {
  FaList,
  FaBookmark,
  FaExpand,
  FaCompress,
  FaQuoteLeft,
  FaFont,
  FaChevronLeft,
  FaChevronRight,
  FaVolumeUp,
} from "react-icons/fa"

import GaTracker from "../trackers/ga-tracker"
import { BASE_URL } from "../config/env"
import { ReaderBaseTheme } from "../config/readerTheme"
import { setUser } from "../store/actions/user"

const ReaderMobilePage = () => {
  const dispatch = useDispatch()

  const [searchParams] = useSearchParams()

  const UserState = useSelector((state) => state.UserState)

  const [Loading, setLoading] = useState(false)
  const [IsReady, setIsReady] = useState(false)
  const [IsErrored, setIsErrored] = useState(false)
  const [BookAddress, setBookAddress] = useState(null)
  const [WalletAddress, setWalletAddress] = useState(null)
  // Reader
  const [ShowUI, setShowUI] = useState(true)
  const [Preview, setPreview] = useState(false)
  const [BookUrl, setBookUrl] = useState(null)
  const [BookMeta, setBookMeta] = useState({})
  const [Progress, setProgress] = useState(0)
  const [Rendition, setRendition] = useState()
  const [Fullscreen, setFullscreen] = useState(false)
  const [ChapterName, setChapterName] = useState("")
  const [PageBookmarked, setPageBookmarked] = useState(false)
  const [TotalLocations, setTotalLocations] = useState(0)
  const [CurrentLocationCFI, setCurrentLocationCFI] = useState("")
  // Panels
  const [ShowTocPanel, setShowTocPanel] = useState(false)
  const [ShowContextMenu, setShowContextMenu] = useState(false)
  const [ShowAnnotationPanel, setShowAnnotationPanel] = useState(false)
  const [ShowCustomizerPanel, setShowCustomizerPanel] = useState(false)
  const [ShowTTSPlayer, setShowTTSPlayer] = useState(false) // New TTS state
  // Enhanced UX states
  const [IsTransitioning, setIsTransitioning] = useState(false)
  const [TouchStartX, setTouchStartX] = useState(null)
  const [TouchStartY, setTouchStartY] = useState(null)
  const [IsSwiping, setIsSwiping] = useState(false)
  const [SwipeDirection, setSwipeDirection] = useState(null)
  const [IsMobile, setIsMobile] = useState(false)

  const seeking = useRef(false)
  const addAnnotationRef = useRef(null)
  const readerContainerRef = useRef()
  const resizeTimeoutRef = useRef()
  const debouncedProgress = useDebounce(Progress, 300)

  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [pendingAnnotation, setPendingAnnotation] = useState(null)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        window.innerWidth <= 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(isMobileDevice)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Suppress ResizeObserver errors
  useEffect(() => {
    const handleResizeObserverError = (e) => {
      if (e.message === "ResizeObserver loop completed with undelivered notifications.") {
        e.stopImmediatePropagation()
        return false
      }
    }

    window.addEventListener("error", handleResizeObserverError)

    return () => {
      window.removeEventListener("error", handleResizeObserverError)
    }
  }, [])

  const saveLastReadPage = useCallback(
    (cfi) => {
      if (!isUsable(window.localStorage)) return
      if (!isUsable(BookMeta)) return
      if (!cfi || typeof cfi !== "string") return

      try {
        const bookKey = `${BookMeta.id}:lastread`
        localStorage.setItem(bookKey, cfi)
      } catch (error) {
        console.debug("Error saving last read page:", error)
      }
    },
    [BookMeta],
  )

  const isCurrentPageBookmarked = useCallback(() => {
    if (!isUsable(Rendition)) return false
    if (!isUsable(BookMeta)) return false

    try {
      const bookKey = `${BookMeta.id}:bookmarks`
      const item = window.localStorage.getItem(bookKey)
      if (!isFilled(item)) return false

      const stored = JSON.parse(item) || {}
      const epubcfi = new EpubCFI()
      const current = Rendition.currentLocation()

      if (!current || !current.start || !current.end) return false

      if (epubcfi.compare(stored.cfi, current.start.cfi) === 0) return true
      if (epubcfi.compare(stored.cfi, current.end.cfi) === 0) return true
      if (epubcfi.compare(stored.cfi, current.start.cfi) === 1 && epubcfi.compare(stored.cfi, current.end.cfi) === -1)
        return true
      return false
    } catch (err) {
      return false
    }
  }, [BookMeta, Rendition])

  const updateBookmarkedStatus = useCallback(() => {
    const PageBookmarked = isCurrentPageBookmarked()
    setPageBookmarked(PageBookmarked)
  }, [isCurrentPageBookmarked])

  const hideAllPanel = useCallback(({ customizer = true, annotation = true, toc = true, tts = true } = {}) => {
    customizer && setShowCustomizerPanel(false)
    annotation && setShowAnnotationPanel(false)
    toc && setShowTocPanel(false)
    tts && setShowTTSPlayer(false) // Hide TTS player
  }, [])

  const handlePageUpdate = (e) => {
    seeking.current = true
    setProgress(e.target.value)
  }

  // Enhanced page navigation with smooth slide transition
  const navigatePage = useCallback(
    async (direction, fromSwipe = false) => {
      if (!Rendition || IsTransitioning) return

      setIsTransitioning(true)
      setSwipeDirection(direction)

      try {
        const readerBook = document.getElementById("book__reader")

        if (readerBook && fromSwipe) {
          // Add smooth slide transition for swipe - only current page moves
          readerBook.classList.add(`page-slide--${direction}`)

          // Wait for animation to start before navigating
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        // Navigate to the next/previous page
        if (direction === "next") {
          await Rendition.next()
        } else {
          await Rendition.prev()
        }

        // Clean up animation classes after navigation completes
        if (readerBook && fromSwipe) {
          setTimeout(() => {
            readerBook.classList.remove(`page-slide--${direction}`)
          }, 400) // Reduced timing for snappier feel
        }
      } catch (error) {
        console.error("Navigation error:", error)
        // Clean up on error
        const readerBook = document.getElementById("book__reader")
        if (readerBook) {
          readerBook.classList.remove(`page-slide--next`, `page-slide--prev`)
        }
      } finally {
        // Reset states
        setTimeout(
          () => {
            setIsTransitioning(false)
            setSwipeDirection(null)
          },
          fromSwipe ? 500 : 100,
        )
      }
    },
    [Rendition, IsTransitioning],
  )

  // Enhanced touch handling for mobile with smooth transitions
  const handleTouchStart = useCallback(
    (e) => {
      // Don't handle touch if panels are open
      if (ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) return

      if (e.touches.length === 1) {
        setTouchStartX(e.touches[0].clientX)
        setTouchStartY(e.touches[0].clientY)
        setIsSwiping(false)

        // Prevent text selection on touch start
        e.preventDefault()
      }
    },
    [ShowTocPanel, ShowAnnotationPanel, ShowCustomizerPanel, ShowTTSPlayer],
  )

  const handleTouchMove = useCallback(
    (e) => {
      if (!TouchStartX || !TouchStartY) return
      if (ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) return

      const touchX = e.touches[0].clientX
      const touchY = e.touches[0].clientY
      const deltaX = touchX - TouchStartX
      const deltaY = touchY - TouchStartY

      // Determine if this is a horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 25) {
        setIsSwiping(true)
        e.preventDefault() // Prevent scrolling during swipe
      }
    },
    [TouchStartX, TouchStartY, ShowTocPanel, ShowAnnotationPanel, ShowCustomizerPanel, ShowTTSPlayer],
  )

  const handleTouchEnd = useCallback(
    (e) => {
      if (!TouchStartX || !TouchStartY || !IsSwiping) {
        setTouchStartX(null)
        setTouchStartY(null)
        setIsSwiping(false)
        return
      }

      if (ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) {
        setTouchStartX(null)
        setTouchStartY(null)
        setIsSwiping(false)
        return
      }

      const touchX = e.changedTouches[0].clientX
      const deltaX = touchX - TouchStartX

      // Reduced swipe threshold for better responsiveness
      if (Math.abs(deltaX) > 25) {
        if (deltaX > 0) {
          navigatePage("prev", true) // fromSwipe = true
        } else {
          navigatePage("next", true) // fromSwipe = true
        }
      }

      setTouchStartX(null)
      setTouchStartY(null)
      setIsSwiping(false)
    },
    [
      TouchStartX,
      TouchStartY,
      IsSwiping,
      navigatePage,
      ShowTocPanel,
      ShowAnnotationPanel,
      ShowCustomizerPanel,
      ShowTTSPlayer,
    ],
  )

  const openFullscreen = () => {
    var elem = document.documentElement
    if (elem.requestFullscreen) elem.requestFullscreen()
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen()
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen()
  }

  const closeFullscreen = () => {
    if (!document.fullscreenElement) return
    if (document.exitFullscreen) document.exitFullscreen()
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
    else if (document.msExitFullscreen) document.msExitFullscreen()
  }

  const addBookMark = () => {
    GaTracker("event_bookmarkpanel_bookmark")
    if (isUsable(Preview) && !Preview && isUsable(BookMeta) && isUsable(WalletAddress)) {
      if (!isUsable(Rendition)) return
      if (!isUsable(BookMeta)) return

      const currentLocation = Rendition.currentLocation()
      if (!currentLocation || !currentLocation.start) return

      setLoading(true)
      const newBookmark = {
        cfi: currentLocation.start.cfi,
        percent: currentLocation.start.percentage,
      }
      axios({
        url: `${BASE_URL}/api/reader/bookmarks`,
        method: "POST",
        data: {
          bookAddress: BookMeta.id, // Fixed: use consistent bookMeta.id
          ownerAddress: WalletAddress,
          bookmarks: JSON.stringify(newBookmark),
        },
      })
        .then((res) => {
          if (res.status === 200) {
            const bookKey = `${BookMeta.id}:bookmarks`
            localStorage.setItem(bookKey, JSON.stringify(newBookmark))
            updateBookmarkedStatus()
          }
        })
        .catch((err) => {})
        .finally(() => setLoading(false))
    }
  }

  const removeBookMark = () => {
    GaTracker("event_bookmarkpanel_bookmark_remove")
    if (isUsable(Preview) && !Preview && isUsable(BookMeta) && isUsable(WalletAddress)) {
      if (!isUsable(Rendition)) return
      if (!isUsable(BookMeta)) return
      setLoading(true)
      axios({
        url: `${BASE_URL}/api/reader/bookmarks`,
        method: "POST",
        data: {
          bookAddress: BookMeta.id, // Fixed: use consistent bookMeta.id
          ownerAddress: WalletAddress,
          bookmarks: "",
        },
      })
        .then((res) => {
          if (res.status === 200) {
            const bookKey = `${BookMeta.id}:bookmarks`
            localStorage.setItem(bookKey, "")
            updateBookmarkedStatus()
          }
        })
        .catch((err) => {})
        .finally(() => setLoading(false))
    }
  }

  const toggleBookMark = () => {
    if (isCurrentPageBookmarked() === true) removeBookMark()
    else addBookMark()
  }

  useEffect(() => {
    const bookPreview = searchParams.get("bkpw")
    const bookTitle = searchParams.get("bkte")
    const bookId = searchParams.get("bkid")
    const preview = searchParams.get("pw") === "false" ? false : true
    const bookAddress = searchParams.get("bkas")
    const walletAddress = searchParams.get("oras")
    const base = searchParams.get("be")
    const token = searchParams.get("tn")
    const cid = searchParams.get("cd")
    const fileName = searchParams.get("fe")
    const userId = searchParams.get("urid")
    const userToken = searchParams.get("urtn")
    const userWallet = searchParams.get("urwt")
    const bookUrl = `${base}?token=${token}&cid=${cid}&fileName=${fileName}`
    if (
      isFilled(bookPreview) &&
      isFilled(bookTitle) &&
      isFilled(bookId) &&
      isUsable(preview) &&
      isFilled(bookAddress) &&
      isFilled(walletAddress)
    ) {
      if (!preview && !isFilled(bookUrl)) setIsErrored(true)
      dispatch(
        setUser({
          uid: userId,
          wallet: userWallet,
          tokens: { acsTkn: userToken },
        }),
      )
      setBookUrl(bookUrl)
      setPreview(preview)
      setBookMeta({
        id: bookId,
        title: bookTitle,
        preview: bookPreview,
        book_address: bookAddress,
      })
      setBookAddress(bookAddress)
      setWalletAddress(walletAddress)
      setIsReady(true)
    } else setIsErrored(true)
  }, [searchParams, dispatch])

  useEffect(() => {
    GaTracker("page_view_reader_mobile")
  }, [])

  useEffect(() => {
    if (Fullscreen === true) openFullscreen()
    else closeFullscreen()
  }, [Fullscreen])

  useEffect(() => {
    if (Loading) dispatch(showSpinner())
    else dispatch(hideSpinner())
  }, [Loading, dispatch])

  useEffect(() => {
    hideAllPanel()
  }, [ShowUI, hideAllPanel])

  // Load + init book, set up rendition and handlers
  useEffect(() => {
    if (!IsReady) return

    setLoading(true)
    let bookURL = BookUrl
    if (Preview) bookURL = BASE_URL + "/files/" + BookMeta.preview

    let renditionInstance = null
    const attachedDocs = new WeakSet()

    try {
      const book = Epub(bookURL, { openAs: "epub" })

      book.ready
        .then(async () => {
          const elm = document.querySelector("#book__reader")
          if (elm) elm.innerHTML = ""

          const rendition = book.renderTo("book__reader", {
            width: "100%",
            height: "100%",
            manager: "default", // strict paginated mode
            flow: "paginated",
            snap: true,
            gap: 40,
            allowScriptedContent: true,
          })

          rendition.themes.default(ReaderBaseTheme)
          rendition.spread("none")

          // Generate locations for proper start/end CFIs
          if (!book.locations || !book.locations.length()) {
            await book.locations.generate(1024)
            console.log("Total locations generated:", book.locations.total)
          }
          window.__bookLocations = book.locations

          rendition.display().then(() => {
            rendition.on("rendered", () => {
              console.log("First page rendered with CFIs", rendition.currentLocation())
            })
          })

          renditionInstance = rendition

          const attachSwipeToDoc = (content) => {
            if (!content?.document || attachedDocs.has(content.document)) return
            attachedDocs.add(content.document)

            const iframe = content.document.defaultView?.frameElement?.parentElement
            if (!iframe) return

            let startX = 0,
              startY = 0,
              deltaX = 0,
              isDragging = false
            const threshold = Math.min(window.innerWidth * 0.18, 90)

            const setTransform = (x) => {
              iframe.style.transform = `translate3d(${x}px, 0, 0)`
            }

            const resetTransform = (animate = true) => {
              iframe.style.transition = animate ? "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)" : "none"
              iframe.style.transform = "translate3d(0, 0, 0)"
            }

            const touchStart = (e) => {
              if (e.touches.length !== 1) return
              startX = e.touches[0].clientX
              startY = e.touches[0].clientY
              deltaX = 0
              isDragging = false
              iframe.style.transition = "none"
            }

            const touchMove = (e) => {
              if (e.touches.length !== 1) return
              const dx = e.touches[0].clientX - startX
              const dy = e.touches[0].clientY - startY

              if (!isDragging && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
                isDragging = true
              }
              if (isDragging) {
                e.preventDefault()
                deltaX = dx
                setTransform(dx)
              }
            }

            const touchEnd = () => {
              if (!isDragging) {
                resetTransform()
                return
              }
              const distance = Math.abs(deltaX)
              const baseDuration = 250
              const duration = Math.min(400, Math.max(180, (distance / window.innerWidth) * baseDuration + 150))
              const easing = "cubic-bezier(0.25, 0.8, 0.25, 1)"

              if (distance > threshold) {
                iframe.style.transition = `transform ${duration}ms ${easing}`
                iframe.style.transform = `translate3d(${deltaX < 0 ? -window.innerWidth : window.innerWidth}px, 0, 0)`
                setTimeout(() => {
                  deltaX < 0 ? renditionInstance.next() : renditionInstance.prev()
                  resetTransform(false)
                }, duration)
              } else {
                resetTransform()
              }
            }

            content.document.addEventListener("touchstart", touchStart, { passive: true })
            content.document.addEventListener("touchmove", touchMove, { passive: false })
            content.document.addEventListener("touchend", touchEnd, { passive: true })
          }

          rendition.getContents().forEach(attachSwipeToDoc)
          rendition.on("rendered", (_section, content) => {
            attachSwipeToDoc(content)
          })

          // --- FIXED: single selected handler using viewport coordinates ---
          rendition.on("selected", (cfiRange, contents) => {
            // Avoid conflicts with other panels/swipes if you like:
            // if (IsSwiping || ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) return;

            const selection = contents.window.getSelection()
            const selectedText = selection?.toString() || ""
            if (!selectedText.trim()) return

            const range = selection.getRangeAt(0)
            const rect = range.getBoundingClientRect()

            // Viewport coords for position: fixed menu
            setContextMenuPosition({
              x: rect.left + rect.width / 2,
              y: rect.top - 8, // a little above
            })
            setPendingAnnotation({ cfiRange, text: selectedText })

            // Show after epub.js finishes selection event
            setTimeout(() => setShowContextMenu(true), 0)
          })

          setRendition(rendition)
          setLoading(false)
        })
        .catch((err) => {
          console.error("Error loading book:", err)
          setLoading(false)
        })
    } catch (err) {
      console.error("Error initializing book:", err)
      setLoading(false)
    }
  }, [IsReady, BookMeta, BookUrl, Preview])

  useEffect(() => {
    if (IsReady === true) {
      if (!isUsable(Rendition)) return

      // Debounced resize handler to prevent ResizeObserver errors
      const handleResize = () => {
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current)
        }

        resizeTimeoutRef.current = setTimeout(() => {
          try {
            GaTracker("event_reader_resize")
            setShowContextMenu(false) // hide stale menu on resize
            if (Rendition && Rendition.manager) {
              Rendition.manager.resize("100%", "100%")
            }
          } catch (error) {
            // Silently handle resize errors
            console.debug("Resize error handled:", error)
          }
        }, 100) // Debounce resize calls
      }

      const handleFullscreen = () => {
        if (isUsable(window.document.fullscreenElement)) {
          GaTracker("event_reader_fullscreen")
          setFullscreen(true)
        } else {
          GaTracker("event_reader_window")
          setFullscreen(false)
        }
        handleResize()
      }

      window.addEventListener("resize", handleResize, { passive: true })
      window.addEventListener("fullscreenchange", handleFullscreen, { passive: true })

      return () => {
        window.removeEventListener("resize", handleResize)
        window.removeEventListener("fullscreenchange", handleFullscreen)
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current)
        }
      }
    }
  }, [IsReady, Rendition])

  useEffect(() => {
    if (IsReady === true) {
      if (!isUsable(Rendition)) return
      if (!isUsable(CurrentLocationCFI) && !isFilled(CurrentLocationCFI)) return
      Rendition.book.loaded.navigation.then(() => {
        const locationCfi = CurrentLocationCFI
        const spineItem = Rendition.book.spine.get(locationCfi)
        if (!isUsable(spineItem)) return
        const navItem = Rendition.book.navigation.get(spineItem.href)
        setChapterName(navItem?.label?.trim() || "")
      })
    }
  }, [IsReady, Rendition, CurrentLocationCFI])

  useEffect(() => {
    if (IsReady === true) {
      if (!isUsable(Rendition)) return
      if (!isUsable(BookMeta)) return
      const handleRelocated = (event) => {
        try {
          if (!event || !event.start) return

          setShowContextMenu(false) // hide menu when page changes
          updateBookmarkedStatus()
          if (event.start.location !== undefined) {
            setProgress(event.start.location)
          }
          if (event.start.cfi) {
            saveLastReadPage(event.start.cfi)
            setCurrentLocationCFI(event.start.cfi)
          }
        } catch (error) {
          console.debug("Error in handleRelocated:", error)
        }
      }
      const handleClick = (e) => {
        // Prevent UI toggle during swipe or text selection or when panels are open
        if (IsSwiping || ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) return
        setShowUI((s) => !s)
      }
      const handleKeyUp = (e) => {
        if (e.key === "ArrowLeft" || (e.keyCode || e.which) === 37) {
          navigatePage("prev", false) // fromSwipe = false
        }
        if (e.key === "ArrowRight" || (e.keyCode || e.which) === 39) {
          navigatePage("next", false) // fromSwipe = false
        }
      }
      Rendition.on("relocated", handleRelocated)
      Rendition.on("click", handleClick)
      Rendition.on("keyup", handleKeyUp)
      document.addEventListener("keyup", handleKeyUp)
      return () => {
        Rendition.off("relocated", handleRelocated)
        Rendition.off("click", handleClick)
        Rendition.off("keyup", handleKeyUp)
        document.removeEventListener("keyup", handleKeyUp)
      }
    }
  }, [
    IsReady,
    Rendition,
    BookMeta,
    updateBookmarkedStatus,
    saveLastReadPage,
    setCurrentLocationCFI,
    IsSwiping,
    navigatePage,
    ShowTocPanel,
    ShowAnnotationPanel,
    ShowCustomizerPanel,
    ShowTTSPlayer,
  ])

  useEffect(() => {
    if (IsReady === true) {
      if (!isUsable(Rendition)) return
      if (seeking.current === true) {
        Rendition.display(Rendition.book.locations.cfiFromLocation(debouncedProgress))
        seeking.current = false
      }
    }
  }, [IsReady, debouncedProgress, Rendition, seeking])

  useEffect(() => {
    if (IsReady === true) {
      if (!isUsable(BookMeta)) return
      if (!isUsable(Rendition)) return
      const bookKey = `${BookMeta.id}:locations`
      const stored = localStorage.getItem(bookKey)
      if (stored) {
        Rendition.book.locations.load(stored)
        setTotalLocations(JSON.parse(stored).length)
      } else {
        Rendition.book.locations
          .generate()
          .then(() => {
            setTotalLocations(Rendition.book.locations.total)
            localStorage.setItem(bookKey, Rendition.book.locations.save())
          })
          .catch((err) => {})
      }
    }
  }, [IsReady, Rendition, BookMeta])

  useEffect(() => {
    if (IsReady === true) {
      if (!isUsable(window.localStorage)) return
      if (!isUsable(BookMeta)) return
      if (!isUsable(Rendition)) return
      const bookKey = `${BookMeta.id}:lastread`
      const lastPageCfi = localStorage.getItem(bookKey)
      if (isUsable(lastPageCfi)) {
        Rendition.display(lastPageCfi)
      }
    }
  }, [IsReady, BookMeta, Rendition])

  // Hide context menu on window scroll as a safety (stale position)
  useEffect(() => {
    const hideMenu = () => setShowContextMenu(false)
    window.addEventListener("scroll", hideMenu, { passive: true })
    return () => window.removeEventListener("scroll", hideMenu)
  }, [])

  // Add touch event listeners
  useEffect(() => {
    const container = readerContainerRef.current
    if (!container) return

    container.addEventListener("touchstart", handleTouchStart, { passive: false })
    container.addEventListener("touchmove", handleTouchMove, { passive: false })
    container.addEventListener("touchend", handleTouchEnd, { passive: false })

    return () => {
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return IsReady ? (
    <div
      className={`reader ${IsTransitioning ? "reader--transitioning" : ""} ${IsMobile ? "reader--mobile" : "reader--desktop"}`}
    >
      <div className={"reader__header" + (ShowUI ? " reader__header--show" : "")}>
        <div className="reader__header__left">
          <div className="reader__header__left__timer">
            {Rendition && <ReadTimer mobileView={true} preview={Preview} bookMeta={BookMeta} />}
          </div>
        </div>
        <div className="reader__header__center">
          <div className="typo__body--2 typo__color--n700 typo__transform--capital">{BookMeta.title || "Untitled"}</div>
        </div>
        <div className="reader__header__right">
          <Button
            className="reader__header__right__hide-on-mobile"
            type="icon"
            onClick={() => setFullscreen((s) => !s)}
          >
            {Fullscreen ? <FaCompress /> : <FaExpand />}
          </Button>
          <Button
            type="icon"
            className={ShowTocPanel ? "reader__header__right__button--active" : ""}
            onClick={() => {
              hideAllPanel({ toc: false })
              setShowTocPanel((s) => !s)
            }}
          >
            <FaList />
          </Button>
          <Button
            type="icon"
            className={ShowAnnotationPanel ? "reader__header__right__button--active" : ""}
            onClick={() => {
              hideAllPanel({ annotation: false })
              setShowAnnotationPanel((s) => !s)
            }}
          >
            <FaQuoteLeft />
          </Button>
          <Button
            type="icon"
            className={PageBookmarked ? "reader__header__right__button--active" : ""}
            onClick={toggleBookMark}
          >
            <FaBookmark />
          </Button>
          <Button
            type="icon"
            className={ShowCustomizerPanel ? "reader__header__right__button--active" : ""}
            onClick={() => {
              hideAllPanel({ customizer: false })
              setShowCustomizerPanel((s) => !s)
            }}
          >
            <FaFont />
          </Button>
          <Button
            type="icon"
            className={ShowTTSPlayer ? "reader__header__right__button--active" : ""}
            onClick={() => {
              hideAllPanel({ tts: false })
              setShowTTSPlayer((s) => !s)
            }}
          >
            <FaVolumeUp />
          </Button>
        </div>
      </div>
      <div className="reader__container" ref={readerContainerRef}>
        <div
          className={
            PageBookmarked
              ? "reader__container__bookmark reader__container__bookmark--show"
              : "reader__container__bookmark"
          }
        ></div>
        <div className="reader__container__prev-btn">
          <div className="reader__container__prev-btn__button" onClick={() => navigatePage("prev", false)}>
            <FaChevronLeft width={32} />
          </div>
        </div>
        <div id="book__reader" className="reader__container__book"></div>
        <div className="reader__container__next-btn">
          <div className="reader__container__next-btn__button" onClick={() => navigatePage("next", false)}>
            <FaChevronRight width={32} />
          </div>
        </div>

        {!Preview && (
          <div
            className={
              ShowContextMenu
                ? "reader__container__context-menu-container reader__container__context-menu-container--show"
                : "reader__container__context-menu-container"
            }
          >
            {ShowContextMenu && (
              <AnnotationContextMenu
                position={contextMenuPosition}
                onAddAnnotation={(color) => {
                  if (pendingAnnotation) {
                    // Store in annotation panel
                    if (addAnnotationRef.current) {
                      addAnnotationRef.current({
                        cfiRange: pendingAnnotation.cfiRange,
                        text: pendingAnnotation.text,
                        color,
                      })
                    }

                    // Apply highlight directly in the book
                    if (Rendition) {
                      Rendition.annotations.highlight(
                        pendingAnnotation.cfiRange,
                        {},
                        null,
                        { fill: color, "fill-opacity": "0.4" }
                      )
                    }
                  }
                  setShowContextMenu(false)
                }}
                onClose={() => setShowContextMenu(false)}
              />
            )}
          </div>
        )}

        <SidePanel show={ShowTocPanel} setShow={setShowTocPanel} position="right">
          <TocPanel
            onSelect={() => {
              hideAllPanel({ toc: false })
              setShowTocPanel(false)
            }}
            rendition={Rendition}
          />
        </SidePanel>
        <SidePanel show={ShowAnnotationPanel} setShow={setShowAnnotationPanel} position="right">
          <AnnotationPanel
            mobileView={true}
            preview={Preview}
            rendition={Rendition}
            bookMeta={BookMeta}
            show={ShowAnnotationPanel}
            addAnnotationRef={addAnnotationRef}
            hideModal={() => {
              setShowAnnotationPanel(false)
            }}
            onRemove={() => {
              setShowAnnotationPanel(false)
            }}
          />
        </SidePanel>
        <SidePanel show={ShowCustomizerPanel} setShow={setShowCustomizerPanel} position="right-bottom">
          <Customizer initialFontSize={100} rendition={Rendition} />
        </SidePanel>
      </div>
      <nav className={"reader__nav" + (ShowUI ? " reader__nav--show" : "")}>
        <div className="reader__nav__value">
          <div className="reader__nav__value__chapter-title typo__gray--n600 typo__transform--capital">
            {ChapterName || BookMeta.title || ""}
          </div>
          <div>{Math.floor((debouncedProgress * 100) / TotalLocations) || "0"}%</div>
        </div>
        <div className="reader__nav__progress">
          <RangeSlider
            value={Progress}
            onChange={handlePageUpdate}
            max={TotalLocations}
            className="reader__nav__progress"
          />
        </div>
      </nav>
      <TextToSpeechPlayer rendition={Rendition} isVisible={ShowTTSPlayer} onClose={() => setShowTTSPlayer(false)} />
    </div>
  ) : null
}

export default ReaderMobilePage
