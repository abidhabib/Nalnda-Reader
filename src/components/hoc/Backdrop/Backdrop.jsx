import React from 'react'
import { useDispatch } from 'react-redux'

import { isUsable } from '../../../helpers/functions'
import { unsetBackdrop } from '../../../store/actions/backdrop'

const Backdrop = props => {
	const dispatch = useDispatch()
	
	const getClasses = () => {
		let classes = ['backdrop']
		if(props.show) classes.push('backdrop--show')
		return classes.join(" ")
	}

	const getContainerClasses = () => {
		let classes = ["backdrop__container"]
		if(isUsable(props.hideOnClick)&&props.hideOnClick===false) classes.push('backdrop__container--nodismiss')
		return classes.join(" ")
	}

	const hideBackdrop = () => {
		if(isUsable(props.hideOnClick) && props.hideOnClick===false){}
		else dispatch(unsetBackdrop())
	}

	return(
		<div className={getClasses()}>
			<div className={getContainerClasses()} onClick={()=>hideBackdrop()}/>
			{props.children}
		</div>
	)
}

export default Backdrop