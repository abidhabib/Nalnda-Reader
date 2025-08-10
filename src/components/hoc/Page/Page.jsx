import React from 'react'
import { useDispatch } from 'react-redux'
import { showModal, SHOW_FEEDBACK_MODAL } from '../../../store/actions/modal'
import FeedbackModal from '../../modal/Feedback/FeedbackModal'

import Footer from '../../nav/Footer/Footer'
import Header from '../../nav/Header/Header'

const Page = ({fluid, containerClass, noPadding, showRibbion, noFooter, children}) => {

	const dispatch = useDispatch();

	const getClasses = () => {
		let classes = ["page__wrapper"]
		if(fluid) classes.push("page__wrapper--fluid")
		if(containerClass) classes.push(containerClass)
		return classes.join(" ")
	}

	const onFeedback = () => {
		dispatch(showModal(SHOW_FEEDBACK_MODAL));
	}

	return (
		<div className='page'>
			<Header showRibbion={showRibbion} noPadding={noPadding}/>
			<div className={getClasses()}>
				{children}
			</div>
			<div className="page__feedback" onClick={onFeedback}>
				<div className="page__feedback__label">FEEDBACK</div>
			</div>
			{noFooter?null:<Footer/>}
			<FeedbackModal/>
		</div>
	)
}

export default Page