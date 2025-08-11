import axios from "axios"
import { useNavigate } from "react-router"
import { useDispatch, useSelector } from "react-redux"
import { useCallback, useEffect, useState } from "react"

import GaTracker from '../../../trackers/ga-tracker'
import { isUsable } from "../../../helpers/functions"
import { showSpinner, hideSpinner } from '../../../store/actions/spinner'

import { BASE_URL } from "../../../config/env"
import Button from "../Buttons/Button"

const AnnotationPanel = ({preview, rendition, bookMeta, addAnnotationRef, onRemove=()=>{}, hideModal=()=>{}}) => {

	const dispatch = useDispatch()
	const navigate = useNavigate()

	const UserState = useSelector(state => state.UserState)

	const [WalletAddress, setWalletAddress] = useState(null)
	const [Loading, setLoading] = useState(false)
	const [Annotations, setAnnotations] = useState([])

	useEffect(() => {
		if(Loading) dispatch(showSpinner())
		else dispatch(hideSpinner())
	}, [Loading, dispatch])

	useEffect(() => {
		if(isUsable(UserState) && UserState.user) setWalletAddress(UserState.user.wallet)
		else if (!preview) navigate(-1)
	}, [UserState, navigate, preview])

	// Helper function to clear all annotations
	const clearAllAnnotations = useCallback(() => {
		if (rendition && rendition.annotations) {
			// Remove all existing highlights one by one
			// We need to keep track of what we've added
			try {
				// If removeAll exists, use it
				if (typeof rendition.annotations.removeAll === 'function') {
					rendition.annotations.removeAll()
				} else {
					// Fallback: manually remove each annotation
					// This requires keeping track of added annotations
					console.log("removeAll not available, annotations will be added incrementally")
				}
			} catch (err) {
				console.warn("Could not clear annotations:", err)
			}
		}
	}, [rendition])

	// Load annotations
	useEffect(() => {
		if(isUsable(bookMeta) && isUsable(WalletAddress) && isUsable(rendition)){
			// Preview mode - load from localStorage
			if (preview) {
				console.log("Preview mode: loading annotations from localStorage")
				try {
					const localKey = `preview_annotations_${bookMeta.book_address}`
					const localAnnotations = localStorage.getItem(localKey)
					if (localAnnotations) {
						const parsed = JSON.parse(localAnnotations)
						setAnnotations(parsed)
						// Apply highlights
						clearAllAnnotations()
						parsed.forEach((item)=>{
							if (rendition.annotations && typeof rendition.annotations.add === 'function') {
								rendition.annotations.add(
									"highlight",
									item.cfiRange,
									{},
									()=>{},
									"",
									{"fill": item.color, "fill-opacity": "0.35", "mix-blend-mode": "multiply"}
								)
							}
						})
					} else {
						setAnnotations([])
						clearAllAnnotations()
					}
				} catch (e) {
					console.error("Error loading preview annotations:", e)
					setAnnotations([])
					clearAllAnnotations()
				}
				return
			}
			
			// Real mode - load from backend
			setLoading(true)
			axios({
				url: `${BASE_URL}/api/reader/annotations`,
				method: 'GET',
				params: {
					bookAddress: bookMeta.book_address,
					ownerAddress: WalletAddress
				}
			}).then(res => {
				if(res.status === 200) {
					let parsedAnnotations = []
					try {
						parsedAnnotations = JSON.parse(res.data.annotations) || []
					} catch (e) {
						console.error("Failed to parse annotations:", e)
						parsedAnnotations = []
					}
					setAnnotations(parsedAnnotations)
					
					// Clear existing annotations first
					clearAllAnnotations()
					
					// Add all annotations
					parsedAnnotations.forEach((item)=>{
						if (rendition.annotations && typeof rendition.annotations.add === 'function') {
							rendition.annotations.add(
								"highlight",
								item.cfiRange,
								{},
								()=>{},
								"",
								{"fill": item.color, "fill-opacity": "0.35", "mix-blend-mode": "multiply"}
							)
						}
					})
				}
			}).catch(err => {
				console.error("Error fetching annotations:", err)
				setAnnotations([])
				clearAllAnnotations()
			}).finally(() => setLoading(false))
		}
	}, [bookMeta, WalletAddress, dispatch, rendition, preview, clearAllAnnotations])

	const renderAnnotationItems = () => {
		let domItems = []
		if(!isUsable(rendition)) return ""
		if(!isUsable(bookMeta)) return ""
		
		Annotations.forEach((item,i)=>{
			domItems.push(
				<div key={i} className="panel__annotation__item" onClick={()=>gotoPage(item.cfiRange)}>
					<div className="panel__annotation__item__container">
						<div className="panel__annotation__item__color" style={{backgroundColor:item.color}}></div>
						<div className="panel__annotation__item__name">{item.text}</div>
					</div>
					<Button size="sm" type="icon" onClick={(e)=>{e.stopPropagation();removeAnnotation(i,item)}}>
						remove
					</Button>
				</div>
			)
		})
		if(domItems.length===0) domItems.push(<div key="empty" className="panel__empty">No Items</div>)
		return domItems
	}

	const removeAnnotation = (itemIndex,item) => {
		GaTracker('event_annotationpanel_remove')
		if(isUsable(bookMeta) && isUsable(WalletAddress) && isUsable(rendition)){
			if(!isUsable(rendition)) return
			if(!isUsable(bookMeta)) return
			
			let newAnnotations = Annotations.filter((item,i) => i !== itemIndex )
			
			// Remove highlight immediately
			if (rendition.annotations && typeof rendition.annotations.remove === 'function') {
				try {
					rendition.annotations.remove(item.cfiRange, "highlight")
				} catch (err) {
					console.warn("Could not remove highlight:", err)
				}
			}
			
			// Handle based on mode
			if (preview) {
				// Preview mode - save to localStorage
				try {
					const localKey = `preview_annotations_${bookMeta.book_address}`
					localStorage.setItem(localKey, JSON.stringify(newAnnotations))
					setAnnotations(newAnnotations)
					onRemove()
				} catch (e) {
					console.error("Error saving preview annotations:", e)
				}
			} else {
				// Real mode - save to backend
				setLoading(true)
				axios({
					url: `${BASE_URL}/api/reader/annotations`,
					method: 'POST',
					data: {
						bookAddress: bookMeta.book_address,
						ownerAddress: WalletAddress,
						annotations : JSON.stringify(newAnnotations),
					}
				}).then(res => {
					if(res.status === 200) {
						setAnnotations(newAnnotations)
						onRemove()
					} 
				}).catch(err => {
					console.error("Error removing annotation:", err)
					// Revert on error
					setAnnotations(prev => [...prev, item])
					if (rendition.annotations && typeof rendition.annotations.add === 'function') {
						rendition.annotations.add(
							"highlight",
							item.cfiRange,
							{},
							()=>{},
							"",
							{"fill": item.color, "fill-opacity": "0.35", "mix-blend-mode": "multiply"}
						)
					}
				}).finally(() => setLoading(false))
			}
		}
	}

	const gotoPage = (cfi) => {
		GaTracker('event_annotationpanel_goto_page')
		if(!isUsable(rendition)) return
		rendition.display(cfi)
		hideModal()
	}

	const addAnnotation = useCallback(
		(annotation) => {
			GaTracker('event_annotationpanel_annotate')
			if(isUsable(bookMeta) && isUsable(WalletAddress) && isUsable(rendition)){
				if(!isUsable(rendition)) return
				if(!isUsable(bookMeta)) return
				
				// Add to local state immediately
				let newAnnotations = [...Annotations, annotation]
				setAnnotations(newAnnotations)
				
				// Add highlight immediately
				if (rendition.annotations && typeof rendition.annotations.add === 'function') {
					try {
						rendition.annotations.add(
							"highlight",
							annotation.cfiRange,
							{},
							()=>{},
							"",
							{"fill": annotation.color, "fill-opacity": "0.35", "mix-blend-mode": "multiply"}
						)
					} catch (err) {
						console.warn("Could not add highlight:", err)
					}
				}
				
				// Handle based on mode
				if (preview) {
					// Preview mode - save to localStorage
					try {
						const localKey = `preview_annotations_${bookMeta.book_address}`
						localStorage.setItem(localKey, JSON.stringify(newAnnotations))
					} catch (e) {
						console.error("Error saving preview annotations:", e)
					}
				} else {
					// Real mode - save to backend
					setLoading(true)
					axios({
						url: `${BASE_URL}/api/reader/annotations`,
						method: 'POST',
						data: {
							bookAddress: bookMeta.book_address,
							ownerAddress: WalletAddress,
							annotations : JSON.stringify(newAnnotations),
						}
					}).then(res => {
						if(res.status === 200) {
							// Success - already updated state above
							console.log("Annotation saved to backend successfully")
						} 
					}).catch(err => {
						console.error("Error adding annotation:", err)
						// Revert on error
						setAnnotations(prev => prev.filter(ann => ann.cfiRange !== annotation.cfiRange))
						if (rendition.annotations && typeof rendition.annotations.remove === 'function') {
							try {
								rendition.annotations.remove(annotation.cfiRange, "highlight")
							} catch (err) {
								console.warn("Could not remove highlight on revert:", err)
							}
						}
					}).finally(() => setLoading(false))
				}
			}
		},
		[Annotations, WalletAddress, bookMeta, rendition, preview],
	)

	useEffect(()=>{
		if (addAnnotationRef) {
			addAnnotationRef.current = addAnnotation
		}
		return () => {
			if (addAnnotationRef && addAnnotationRef.current) {
				addAnnotationRef.current = null
			}
		}
	},[addAnnotationRef, addAnnotation])

	return <div className="panel panel__annotation"> {renderAnnotationItems()} </div> ;
}

export default AnnotationPanel