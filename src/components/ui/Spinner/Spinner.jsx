import React from 'react'
import { useSelector } from 'react-redux'

import { Grid } from 'react-spinners-css'

const Spinner = props => {

	const SpinnerState = useSelector(state => state.SpinnerState)

	const getClasses = () => {
		let classes = ["spinner"]
		if(SpinnerState.show) classes.push("spinner--show")
		return classes.join(" ")
	}

	return (
		<div className={getClasses()}>
			<div className="spinner__container">
				<Grid color='#00a2e8'/>
			</div>
		</div>
	)
}

export default Spinner