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
		if(isUsable(preview) && !preview){
			if(isUsable(UserState)) setWalletAddress(UserState.user.wallet)
			else navigate(-1)
		}
	}, [UserState, navigate, preview])

	useEffect(() => {
		if(isUsable(preview) && !preview && isUsable(bookMeta) && isUsable(WalletAddress) && isUsable(rendition)){
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
					let parsedAnnotations = JSON.parse(res.data.annotations)||[]
					setAnnotations(parsedAnnotations)
					parsedAnnotations.forEach((item)=>{
						rendition.annotations.add(
							"highlight",
							item.cfiRange,
							{},
							()=>{},
							"",
							{"fill": item.color, "fill-opacity": "0.35", "mix-blend-mode": "multiply"}
						)
					})
				}
			}).catch(err => {
			}).finally(() => setLoading(false))
		}
	}, [bookMeta, WalletAddress, dispatch, rendition, preview])

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
		if(isUsable(preview) && !preview && isUsable(bookMeta) && isUsable(WalletAddress) && isUsable(rendition)){
			if(!isUsable(rendition)) return
			if(!isUsable(bookMeta)) return
			setLoading(true)
			let newAnnotations = Annotations.filter((item,i) => i !== itemIndex )
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
					rendition.annotations.remove(item.cfiRange,"highlight")
					onRemove()
				} 
			}).catch(err => {
			}).finally(() => setLoading(false))
		}
	}

	const gotoPage = (cfi) => {
		GaTracker('event_annotationpanel_goto_page')
		if(!isUsable(rendition)) return
		rendition.display(cfi)
		rendition.display(cfi)
		hideModal()
	}

	const addAnnotaion = useCallback(
		(annotation) => {
			GaTracker('event_annotationpanel_annotate')
			if(isUsable(preview) && !preview && isUsable(bookMeta) && isUsable(WalletAddress) && isUsable(rendition)){
				if(!isUsable(rendition)) return
				if(!isUsable(bookMeta)) return
				setLoading(true)
				let newAnnotations = [...Annotations,annotation]
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
						rendition.annotations.add(
							"highlight",
							annotation.cfiRange,
							{},
							()=>{},
							"",
							{"fill": annotation.color, "fill-opacity": "0.35", "mix-blend-mode": "multiply"}
						)
					} 
				}).catch(err => {
				}).finally(() => setLoading(false))
			}
		},
		[Annotations, WalletAddress, bookMeta, dispatch, rendition, preview],
	)

	useEffect(()=>{
		addAnnotationRef.current = addAnnotaion
	},[addAnnotationRef,addAnnotaion])

	return <div className="panel panel__annotation"> {renderAnnotationItems()} </div> ;
}

export default AnnotationPanel
