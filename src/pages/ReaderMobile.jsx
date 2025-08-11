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
import '../sass/pages/reader-mobile.scss'

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
  FaVolumeMute,
} from "react-icons/fa"

import GaTracker from "../trackers/ga-tracker"
import { BASE_URL } from "../config/env"
import { ReaderBaseTheme } from "../config/readerTheme"
import { setUser } from "../store/actions/user"

const ReaderMobilePage = () => {
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const UserState = useSelector((state) => state.UserState)

  // State management
  const [Loading, setLoading] = useState(false)
  const [IsReady, setIsReady] = useState(false)
  const [IsErrored, setIsErrored] = useState(false)
  const [BookAddress, setBookAddress] = useState(null)
  const [WalletAddress, setWalletAddress] = useState(null)

  // Reader states
  const [ShowUI, setShowUI] = useState(true)
  const [Preview, setPreview] = useState(false)
  const [BookUrl, setBookUrl] = useState(null)
  const [BookMeta, setBookMeta] = useState({})
  const [Progress, setProgress] = useState(0)
  const [Rendition, setRendition] = useState(null)
  const [Fullscreen, setFullscreen] = useState(false)
  const [ChapterName, setChapterName] = useState("")
  const [PageBookmarked, setPageBookmarked] = useState(false)
  const [TotalLocations, setTotalLocations] = useState(0)
  const [CurrentLocationCFI, setCurrentLocationCFI] = useState("")

  const [ShowTocPanel, setShowTocPanel] = useState(false)
  const [ShowContextMenu, setShowContextMenu] = useState(false)
  const [ShowAnnotationPanel, setShowAnnotationPanel] = useState(false)
  const [ShowCustomizerPanel, setShowCustomizerPanel] = useState(false)
  const [ShowTTSPlayer, setShowTTSPlayer] = useState(false)

  const [IsTransitioning, setIsTransitioning] = useState(false)
  const [TouchStartX, setTouchStartX] = useState(null)
  const [TouchStartY, setTouchStartY] = useState(null)
  const [IsSwiping, setIsSwiping] = useState(false)
  const [IsMobile, setIsMobile] = useState(false)

  const seeking = useRef(false)
  const addAnnotationRef = useRef(null)
  const readerContainerRef = useRef()
  const resizeTimeoutRef = useRef()
  const bookInstanceRef = useRef(null)
  const debouncedProgress = useDebounce(Progress, 300)

  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [pendingAnnotation, setPendingAnnotation] = useState(null)

  const cleanupBook = useCallback(() => {
    if (bookInstanceRef.current) {
      try {
        bookInstanceRef.current.destroy()
      } catch (err) {
        console.warn("Error destroying book instance:", err)
      }
      bookInstanceRef.current = null
    }
  }, [])


  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768); 
    };

    checkIsMobile();

    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  useEffect(() => {
    if (!Rendition) return

    const isMobileViewport = () =>
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,

      )

    const handleResize = () => {
      clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(() => {
        if (Rendition) {
          Rendition.spread(isMobileViewport() ? "none" : "both")
        }
      }, 150)
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
    }
  }, [Rendition])
  console.log(IsMobile);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key && e.key.includes('bookmarks')) {
        console.log('📚 localStorage bookmarks changed:', e.key, e.newValue)
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
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
      if (!isUsable(BookMeta) || !BookMeta.id) return
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

  const isCurrentPageBookmarked = () => {
    if (!isUsable(Rendition) || !isUsable(BookMeta) || !BookMeta.id) {
      console.log('Bookmark check failed: Missing rendition, book meta, or ID');
      return false;
    }

    try {
      const bookKey = `${BookMeta.id}:bookmarks`;
      const storedItem = window.localStorage.getItem(bookKey);

      console.log('Checking bookmark for key:', bookKey);
      console.log('Stored item:', storedItem);

      if (!storedItem || storedItem === "") {
        console.log('No bookmark found for this book');
        return false;
      }

      const stored = JSON.parse(storedItem);
      if (!stored || !stored.cfi) {
        console.log('Invalid bookmark format');
        return false;
      }

      const currentLocation = Rendition.currentLocation();
      console.log('Current location:', currentLocation);

      if (!currentLocation || !currentLocation.start) {
        console.log('No current location available');
        return false;
      }

      const currentCFI = currentLocation.start.cfi;
      console.log('Comparing CFIs - Stored:', stored.cfi, 'Current:', currentCFI);

      if (stored.cfi === currentCFI) {
        console.log('EXACT MATCH: Page is bookmarked!');
        return true;
      }

      const storedBase = stored.cfi.split('!')[0];
      const currentBase = currentCFI.split('!')[0];

      if (storedBase === currentBase) {
        console.log('BASE MATCH: Likely same page/chapter');
        return true;
      }

      console.log('NO MATCH: Page is not bookmarked');
      return false;
    } catch (err) {
      console.warn("Error checking bookmark status:", err);
      return false;
    }
  }

  const updateBookmarkedStatus = () => {
    const PageBookmarked = isCurrentPageBookmarked()
    setPageBookmarked(PageBookmarked)
  }

  const hideAllPanel = useCallback(({ customizer = true, annotation = true, toc = true, tts = true } = {}) => {
    customizer && setShowCustomizerPanel(false)
    annotation && setShowAnnotationPanel(false)
    toc && setShowTocPanel(false)
    tts && setShowTTSPlayer(false)
  }, [])

  const handlePageUpdate = (e) => {
    if (e && e.target && e.target.value !== undefined) {
      seeking.current = true
      setProgress(Number(e.target.value))
    }
  }

const navigatePage = useCallback((direction) => {
  if (!Rendition) return;

  // Add smooth transition class
  setIsTransitioning(true);
  
  const transitionPromise = direction === 'next' 
    ? Rendition.next({ transition: 'slide', duration: 250 })
    : Rendition.prev({ transition: 'slide', duration: 250 });

  // Reset transitioning state after animation
  setTimeout(() => {
    setIsTransitioning(false);
  }, 300);

  return transitionPromise;
}, [Rendition]);
useEffect(() => {
  if (!Rendition) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    
    // Don't interfere with panels
    if (ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) return;
    
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = false;
  };

  const handleTouchMove = (e) => {
    if (!touchStartX || !touchStartY) return;
    if (ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;

    // Only consider it a swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      isSwiping = true;
      e.preventDefault(); // Prevent scrolling during swipe
    }
  };

  const handleTouchEnd = (e) => {
    if (!isSwiping || !touchStartX) {
      touchStartX = 0;
      touchStartY = 0;
      isSwiping = false;
      return;
    }

    if (ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) {
      touchStartX = 0;
      touchStartY = 0;
      isSwiping = false;
      return;
    }

    const touchX = e.changedTouches[0].clientX;
    const deltaX = touchX - touchStartX;
    const swipeThreshold = window.innerWidth * 0.15; // 15% of screen width

    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0) {
        // Swipe right - go to previous page
        navigatePage("prev");
      } else {
        // Swipe left - go to next page
        navigatePage("next");
      }
    }

    touchStartX = 0;
    touchStartY = 0;
    isSwiping = false;
  };

  // Attach touch events to the book reader container
  const bookReader = document.getElementById('book__reader');
  if (bookReader) {
    bookReader.addEventListener('touchstart', handleTouchStart, { passive: false });
    bookReader.addEventListener('touchmove', handleTouchMove, { passive: false });
    bookReader.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  return () => {
    if (bookReader) {
      bookReader.removeEventListener('touchstart', handleTouchStart);
      bookReader.removeEventListener('touchmove', handleTouchMove);
      bookReader.removeEventListener('touchend', handleTouchEnd);
    }
  };
}, [Rendition, ShowTocPanel, ShowAnnotationPanel, ShowCustomizerPanel, ShowTTSPlayer, navigatePage]);


  const openFullscreen = useCallback(() => {
    const elem = document.documentElement
    if (elem) {
      if (elem.requestFullscreen) elem.requestFullscreen()
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen()
      else if (elem.msRequestFullscreen) elem.msRequestFullscreen()
    }
  }, [])

  const closeFullscreen = useCallback(() => {
    if (!document.fullscreenElement) return
    if (document.exitFullscreen) document.exitFullscreen()
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
    else if (document.msExitFullscreen) document.msExitFullscreen()
  }, [])
  const addBookMark = useCallback(() => {
    GaTracker("event_bookmarkpanel_bookmark")
    if (isUsable(BookMeta) && isUsable(WalletAddress)) {
      if (!isUsable(Rendition)) return
      if (!isUsable(BookMeta) || !BookMeta.id) return

      const currentLocation = Rendition.currentLocation()
      console.log('Adding bookmark - Current location:', currentLocation)

      if (!currentLocation || !currentLocation.start) {
        console.log('No current location available for bookmarking')
        return
      }

      setLoading(true)
      const newBookmark = {
        cfi: currentLocation.start.cfi,
        percent: currentLocation.start.percentage,
      }
      console.log('Adding bookmark - New bookmark data:', newBookmark)
      console.log('Book ID for saving:', BookMeta.id)
      console.log('Wallet Address:', WalletAddress)

      if (Preview) {
        console.log('Preview mode: Saving bookmark locally only')
        try {
          const bookKey = `${BookMeta.id}:bookmarks`
          localStorage.setItem(bookKey, JSON.stringify(newBookmark))
          console.log('✅ Bookmark saved locally in preview mode')
          updateBookmarkedStatus()
        } catch (err) {
          console.error("❌ Error saving bookmark locally:", err)
        } finally {
          setLoading(false)
        }
        return
      }

      axios({
        url: `${BASE_URL}/api/reader/bookmarks`,
        method: "POST",
        data: {
          bookAddress: BookMeta.id,
          ownerAddress: WalletAddress,
          bookmarks: JSON.stringify(newBookmark),
        },
      })
        .then((res) => {
          console.log('API Response:', res)
          if (res.status === 200) {
            const bookKey = `${BookMeta.id}:bookmarks`
            localStorage.setItem(bookKey, JSON.stringify(newBookmark))
            console.log(' with key:', bookKey)
            console.log('Saved bookmark data:', newBookmark)
            updateBookmarkedStatus()
          } else {
            console.log(res.status)
          }
        })
        .catch((err) => {
          try {
            const bookKey = `${BookMeta.id}:bookmarks`
            localStorage.setItem(bookKey, JSON.stringify(newBookmark))
            console.log('API error')
            updateBookmarkedStatus()
          } catch (localErr) {
            console.error(localErr)
          }
        })
        .finally(() => setLoading(false))
    } else {
      console.log(' BookMeta:', BookMeta, 'WalletAddress:', WalletAddress)
    }
  }, [Preview, BookMeta, WalletAddress, Rendition])

  const removeBookMark = useCallback(() => {
    GaTracker("event_bookmarkpanel_bookmark_remove")
    if (isUsable(BookMeta) && isUsable(WalletAddress)) {
      if (!isUsable(Rendition)) return
      if (!isUsable(BookMeta) || !BookMeta.id) return

      console.log('Removing bookmark for book:', BookMeta.id)
      console.log('Wallet Address:', WalletAddress)

      if (Preview) {
        console.log('Preview mode: Removing bookmark locally only')
        try {
          const bookKey = `${BookMeta.id}:bookmarks`
          localStorage.setItem(bookKey, "")
          updateBookmarkedStatus()
        } catch (err) {
          console.error("err", err)
        } finally {
          setLoading(false)
        }
        return
      }

      setLoading(true)
      axios({
        url: `${BASE_URL}/api/reader/bookmarks`,
        method: "POST",
        data: {
          bookAddress: BookMeta.id,
          ownerAddress: WalletAddress,
          bookmarks: "",
        },
      })
        .then((res) => {
          console.log('Remove bookmark API Response:', res)
          if (res.status === 200) {
            const bookKey = `${BookMeta.id}:bookmarks`
            localStorage.setItem(bookKey, "")
            console.log('removed from localStorage')
            updateBookmarkedStatus()
          } else {
            console.log('non-200 status:', res.status)
          }
        })
        .catch((err) => {
          console.error(" API:", err)
          // Even if API fails, try to remove locally
          try {
            const bookKey = `${BookMeta.id}:bookmarks`
            localStorage.setItem(bookKey, "")
            console.log(' despite API error')
            updateBookmarkedStatus()
          } catch (localErr) {
            console.error(localErr)
          }
        })
        .finally(() => setLoading(false))
    } else {
      console.log(BookMeta, 'WalletAddress:', WalletAddress)
    }
  }, [Preview, BookMeta, WalletAddress, Rendition])
  const toggleBookMark = useCallback(() => {
    // Call the direct function, not useCallback version
    const isCurrentlyBookmarked = isCurrentPageBookmarked()
    if (isCurrentlyBookmarked === true) removeBookMark()
    else addBookMark()
  }, [removeBookMark, addBookMark])

  // Initialize book data from URL params
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
    const bookUrl = base && token && cid && fileName ? `${base}?token=${token}&cid=${cid}&fileName=${fileName}` : null

    if (
      isFilled(bookPreview) &&
      isFilled(bookTitle) &&
      isFilled(bookId) &&
      isUsable(preview) &&
      isFilled(bookAddress) &&
      isFilled(walletAddress)
    ) {
      if (!preview && !isFilled(bookUrl)) {
        setIsErrored(true)
        return
      }

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
    } else {
      setIsErrored(true)
    }
  }, [searchParams, dispatch])

  useEffect(() => {
    GaTracker("page_view_reader_mobile")
  }, [])

  useEffect(() => {
    if (Fullscreen === true) openFullscreen()
    else closeFullscreen()
  }, [Fullscreen, openFullscreen, closeFullscreen])

  useEffect(() => {
    if (Loading) dispatch(showSpinner())
    else dispatch(hideSpinner())
  }, [Loading, dispatch])

  // Hide panels when UI changes
  useEffect(() => {
    hideAllPanel()
  }, [ShowUI, hideAllPanel])

  // Load and initialize book
  useEffect(() => {
    if (!IsReady || !BookMeta || !BookUrl) return

    setLoading(true)
    let bookURL = BookUrl
    if (Preview && BookMeta.preview) {
      bookURL = `${BASE_URL}/files/${BookMeta.preview}`
    }

    let renditionInstance = null
    const attachedDocs = new WeakSet()

    // Cleanup previous book instance
    cleanupBook()

    try {
      const book = Epub(bookURL, { openAs: "epub" })
      bookInstanceRef.current = book

      book.ready
        .then(async () => {
          const elm = document.querySelector("#book__reader")
          if (elm) elm.innerHTML = ""

          const rendition = book.renderTo("book__reader", {
            width: "100%",
            height: "100%",
            manager: "default",
            flow: "paginated",
            snap: true,
            gap: 40,
            allowScriptedContent: true,
            sandbox: ["allow-scripts", "allow-same-origin", "allow-modals"] // Remove restrictive sandboxing

          })

          rendition.themes.default(ReaderBaseTheme)
          const isMobileViewport = () =>
            window.innerWidth <= 768 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

          rendition.spread(isMobileViewport() ? "none" : "both")
          if (!book.locations || !book.locations.length()) {
            await book.locations.generate(1024)
            console.log("Total locations generated:", book.locations.total)
          }
          window.__bookLocations = book.locations

          await rendition.display()

          renditionInstance = rendition
          setRendition(rendition)

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
              if (e.touches && e.touches.length !== 1) return
              startX = e.touches[0].clientX
              startY = e.touches[0].clientY
              deltaX = 0
              isDragging = false
              iframe.style.transition = "none"
            }

            const touchMove = (e) => {
              if (e.touches && e.touches.length !== 1) return
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
                  if (renditionInstance) {
                    deltaX < 0 ? renditionInstance.next() : renditionInstance.prev()
                  }
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


          rendition.on("selected", (cfiRange, contents) => {
            try {
              const selection = contents.window.getSelection()
              const selectedText = selection?.toString() || ""
              if (!selectedText.trim()) return

              const range = selection.getRangeAt(0)
              const rect = range.getBoundingClientRect()

              console.log("=== TEXT SELECTION DEBUG ===")
              console.log("Selected text:", selectedText)
              console.log("CFI Range:", cfiRange)
              console.log("Rect position:", rect)
              console.log("Context menu position state will be set to:", {
                x: rect.left + rect.width / 2,
                y: rect.top - 10,
              })

              setContextMenuPosition({
                x: rect.left + rect.width / 2,
                y: rect.top - 10,
              })
              setPendingAnnotation({
                cfiRange,
                text: selectedText.trim()
              })
              setShowContextMenu(true)

            } catch (err) {
              console.error("Error handling text selection:", err)
            }
          })

          setLoading(false)
        })
        .catch((err) => {
          setIsErrored(true)
          setLoading(false)
        })
    } catch (err) {
      setIsErrored(true)
      setLoading(false)
    }

    return () => {
      cleanupBook()
      if (renditionInstance) {
        try {
          renditionInstance.destroy()
        } catch (err) {
          console.warn("Error destroying rendition:", err)
        }
      }
    }
  }, [IsReady, BookMeta, BookUrl, Preview, cleanupBook])

  useEffect(() => {
    if (!IsReady || !Rendition) return

    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }

      resizeTimeoutRef.current = setTimeout(() => {
        try {
          GaTracker("event_reader_resize")
          setShowContextMenu(false)
          if (Rendition && Rendition.manager) {
            Rendition.manager.resize("100%", "100%")
          }
        } catch (error) {
          console.debug("Resize error handled:", error)
        }
      }, 100)
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
  }, [IsReady, Rendition])

  useEffect(() => {
    if (!IsReady || !Rendition || !CurrentLocationCFI) return

    const updateChapterName = async () => {
      try {
        await Rendition.book.loaded.navigation
        const spineItem = Rendition.book.spine.get(CurrentLocationCFI)
        if (!spineItem) return

        const navItem = Rendition.book.navigation.get(spineItem.href)
        setChapterName(navItem?.label?.trim() || "")
        console.log("Chapter name updated:", navItem?.label?.trim());

      } catch (err) {
        console.warn("Error updating chapter name:", err)
      }
    }

    updateChapterName()
  }, [IsReady, Rendition, CurrentLocationCFI])

  useEffect(() => {
    if (!IsReady || !Rendition) return

    const handleRelocated = (event) => {
      try {
        if (!event || !event.start) return

        setShowContextMenu(false)
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
      if (IsSwiping || ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) return
      setShowUI((s) => !s)
    }

    const handleKeyUp = (e) => {
      if (e.key === "ArrowLeft" || (e.keyCode || e.which) === 37) {
        navigatePage("prev", false)
      }
      if (e.key === "ArrowRight" || (e.keyCode || e.which) === 39) {
        navigatePage("next", false)
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
  }, [
    IsReady,
    Rendition,
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

  // Progress seeking
  useEffect(() => {
    if (!IsReady || !Rendition || !seeking.current) return

    const seekToProgress = async () => {
      try {
        if (Rendition.book && Rendition.book.locations) {
          const cfi = Rendition.book.locations.cfiFromLocation(debouncedProgress)
          if (cfi) {
            await Rendition.display(cfi)
          }
        }
      } catch (err) {
        console.warn("Error seeking to progress:", err)
      } finally {
        seeking.current = false
      }
    }

    seekToProgress()
  }, [IsReady, debouncedProgress, Rendition])

  useEffect(() => {
    if (!IsReady || !Rendition || !BookMeta || !BookMeta.id) return

    const manageLocations = async () => {
      try {
        const bookKey = `${BookMeta.id}:locations`
        const stored = localStorage.getItem(bookKey)

        if (stored) {
          Rendition.book.locations.load(stored)
          const locationsArray = JSON.parse(stored)
          setTotalLocations(Array.isArray(locationsArray) ? locationsArray.length : 0)
        } else {
          await Rendition.book.locations.generate(1024)
          setTotalLocations(Rendition.book.locations.total)
          localStorage.setItem(bookKey, Rendition.book.locations.save())
        }
      } catch (err) {
        console.error("Error managing locations:", err)
      }
    }

    manageLocations()
  }, [IsReady, Rendition, BookMeta])

  useEffect(() => {
    if (!IsReady || !Rendition || !BookMeta || !BookMeta.id) return

    const loadLastReadPage = async () => {
      try {
        const bookKey = `${BookMeta.id}:lastread`
        const lastPageCfi = localStorage.getItem(bookKey)
        if (isUsable(lastPageCfi)) {
          await Rendition.display(lastPageCfi)
        }
      } catch (err) {
        console.warn("Error loading last read page:", err)
      }
    }

    loadLastReadPage()
  }, [IsReady, BookMeta, Rendition])

  useEffect(() => {
    const hideMenu = () => setShowContextMenu(false)
    window.addEventListener("scroll", hideMenu, { passive: true })
    return () => window.removeEventListener("scroll", hideMenu)
  }, [])

// ADD THIS NEW USEEFFECT INSTEAD
useEffect(() => {
  if (!Rendition) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    
    // Don't interfere with panels
    if (ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) return;
    
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = false;
  };

  const handleTouchMove = (e) => {
    if (!touchStartX || !touchStartY) return;
    if (ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;

    // Only consider it a swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      isSwiping = true;
      e.preventDefault(); // Prevent scrolling during swipe
    }
  };

  const handleTouchEnd = (e) => {
    if (!isSwiping || !touchStartX) {
      touchStartX = 0;
      touchStartY = 0;
      isSwiping = false;
      return;
    }

    if (ShowTocPanel || ShowAnnotationPanel || ShowCustomizerPanel || ShowTTSPlayer) {
      touchStartX = 0;
      touchStartY = 0;
      isSwiping = false;
      return;
    }

    const touchX = e.changedTouches[0].clientX;
    const deltaX = touchX - touchStartX;
    const swipeThreshold = window.innerWidth * 0.15; // 15% of screen width

    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0) {
        // Swipe right - go to previous page
        navigatePage("prev");
      } else {
        // Swipe left - go to next page
        navigatePage("next");
      }
    }

    touchStartX = 0;
    touchStartY = 0;
    isSwiping = false;
  };

  // Attach touch events to the book reader container
  const bookReader = document.getElementById('book__reader');
  if (bookReader) {
    bookReader.addEventListener('touchstart', handleTouchStart, { passive: false });
    bookReader.addEventListener('touchmove', handleTouchMove, { passive: false });
    bookReader.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  return () => {
    if (bookReader) {
      bookReader.removeEventListener('touchstart', handleTouchStart);
      bookReader.removeEventListener('touchmove', handleTouchMove);
      bookReader.removeEventListener('touchend', handleTouchEnd);
    }
  };
}, [Rendition, ShowTocPanel, ShowAnnotationPanel, ShowCustomizerPanel, ShowTTSPlayer, navigatePage]);
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupBook()
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [cleanupBook])

  useEffect(() => {
    if (!Rendition || !BookMeta?.id) return

    const updateBookmarkStatus = () => {
      setTimeout(() => {
        const isBookmarked = isCurrentPageBookmarked()
        console.log('Bookmark status updated:', isBookmarked)
        setPageBookmarked(isBookmarked)
      }, 100)
    }

    Rendition.on('relocated', updateBookmarkStatus)
    Rendition.on('rendered', updateBookmarkStatus)

    updateBookmarkStatus()

    return () => {
      if (Rendition) {
        Rendition.off('relocated', updateBookmarkStatus)
        Rendition.off('rendered', updateBookmarkStatus)
      }
    }
  }, [Rendition, BookMeta?.id])
  if (IsErrored) {
    return (
      <div className="reader reader--error">
        <div className="reader__error">
          <h2>Error Loading Book</h2>
          <p>There was an error loading the book. Please try again.</p>
        </div>
      </div>
    )
  }

  if (!IsReady) {
    return null
  }

  return (
    <div
      className={`reader ${IsTransitioning ? "reader--transitioning" : ""} ${IsMobile ? "reader--mobile" : "reader--desktop"}`}
    >
<div className={`reader__header 
  ${ShowUI ? "reader__header--show" : ""} 
  ${IsMobile && ShowCustomizerPanel ? "reader__header--hidden" : ""}`}
>
  <div className="reader__header__left">
    <div className="reader__header__left__timer">
      {Rendition && <ReadTimer mobileView={true} preview={Preview} bookMeta={BookMeta} />}
    </div>
  </div>
  
  <div className="reader__header__center">
    <div className="typo__body--2 typo__color--n700 typo__transform--capital">
      {BookMeta.title || "Untitled"}
    </div>
  </div>
  
  <div className="reader__header__right">
    <div className="reader__header__right__scroll-container">
      <Button
        className="reader__header__right__hide-on-mobile"
        type="icon"
        onClick={() => setFullscreen((s) => !s)}
        aria-label={Fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
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
        aria-label="Table of contents"
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
        aria-label="Annotations"
      >
        <FaQuoteLeft />
      </Button>
      <Button
        type="icon"
        className={`${PageBookmarked ? "reader__header__right__button--active" : ""} ${PageBookmarked ? "reader__header__right__button--bookmarked" : ""}`}
        onClick={toggleBookMark}
        aria-label={PageBookmarked ? "Remove bookmark" : "Add bookmark"}
      >
        <FaBookmark />
        {PageBookmarked && (
          <span className="bookmark-indicator-dot"></span>
        )}
      </Button>
      <Button
        type="icon"
        className={ShowCustomizerPanel ? "reader__header__right__button--active" : ""}
        onClick={() => {
          hideAllPanel({ customizer: false })
          setShowCustomizerPanel((s) => !s)
        }}
        aria-label="Text settings"
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
        aria-label="Text to speech"
      >
        <FaVolumeUp />
      </Button>
    </div>
  </div>
</div>
      <div className="reader__container" ref={readerContainerRef}>
        <div
          className={
            PageBookmarked
              ? ""
              : "reader__container__bookmark"
          }
        ></div>

        <div className="reader__container__prev-btn">
          <div
            className="reader__container__prev-btn__button"
            onClick={() => navigatePage("prev", false)}
            aria-label="Previous page"
          >
            <FaChevronLeft width={32} />
          </div>
        </div>

        <div id="book__reader" className="reader__container__book"></div>

        <div className="reader__container__next-btn">
          <div
            className="reader__container__next-btn__button"
            onClick={() => navigatePage("next", false)}
            aria-label="Next page"
          >
            <FaChevronRight width={32} />
          </div>
        </div>

        {ShowContextMenu && (
          <div className="reader__container__context-menu-container reader__container__context-menu-container--show">
            <AnnotationContextMenu
              position={contextMenuPosition}
              onAddAnnotation={(color) => {
                console.log("Color selected:", color);
                console.log("Pending annotation:", pendingAnnotation);
                if (pendingAnnotation && addAnnotationRef.current) {
                  addAnnotationRef.current({
                    cfiRange: pendingAnnotation.cfiRange,
                    text: pendingAnnotation.text,
                    color,
                  })
                }
                setShowContextMenu(false)
              }}
              onClose={() => setShowContextMenu(false)}
            />
          </div>
        )}

<SidePanel 
  show={ShowTocPanel} 
  setShow={setShowTocPanel} 
  position="right"
>
  <TocPanel
    onSelect={() => {
      hideAllPanel({ toc: false })
      setShowTocPanel(false)
    }}
    rendition={Rendition}
  />
</SidePanel>

<SidePanel 
  show={ShowAnnotationPanel} 
  setShow={setShowAnnotationPanel} 
  position="right"
>
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

<SidePanel
  show={ShowCustomizerPanel}
  setShow={setShowCustomizerPanel}
  position="right-bottom"
  className="sidepanel--customizer"  // Only this prop needed
>
  <Customizer initialFontSize={100} rendition={Rendition} />
</SidePanel>
      </div>

{ShowUI && (
  <nav className="reader__nav reader__nav--show">
    <div className="reader__nav__value">
      <div className="reader__nav__value__chapter-title typo__gray--n600 typo__transform--capital">
        {ChapterName || BookMeta.title || ""}
      </div>
      <div>{Math.floor((debouncedProgress * 100) / (TotalLocations || 1)) || "0"}%</div>
    </div>
    <div className="reader__nav__progress">
      <RangeSlider
        value={Progress}
        onChange={handlePageUpdate}
        max={TotalLocations || 100}
        className="reader__nav__progress"
      />
    </div>
  </nav>
)}

      <TextToSpeechPlayer
        rendition={Rendition}
        isVisible={ShowTTSPlayer}
        onClose={() => setShowTTSPlayer(false)}
      />
    </div>
  )
}

export default ReaderMobilePage