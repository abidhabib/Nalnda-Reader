import React from 'react'
import { useDispatch, useSelector } from "react-redux"

import Button from '../Buttons/Button'

import { SET_DARKMODE, SET_LIGHTMODE } from "../../../store/actions/darkmode"

import { ReactComponent as SunIcon } from "../../../assets/icons/sun.svg"
import { ReactComponent as MoonIcon } from "../../../assets/icons/moon.svg"
import GaTracker from '../../../trackers/ga-tracker'

const DarkModeSwitch = () => {
	let DarkModeState = useSelector((state) => state.DarkModeState)
	const dispatch = useDispatch()

	const handleSwitchToggle = () => {
		if (DarkModeState.darkmode === true){ 
			GaTracker('event_darkmodeswitch_light')
			dispatch({ type: SET_LIGHTMODE })
		}
		else{
			GaTracker('event_darkmodeswitch_dark')
			dispatch({ type: SET_DARKMODE })
		}
	}

	return (
		<Button onClick={handleSwitchToggle}>
			{DarkModeState.darkmode ? <SunIcon /> : <MoonIcon />}
		</Button>
	)
}

export default DarkModeSwitch
