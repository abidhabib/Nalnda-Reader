import { SET_DARKMODE,SET_LIGHTMODE } from "../actions/darkmode"

const initState = {
	darkmode : false
}

const handleData = (state = initState, action) => {
	switch (action.type) {
		case SET_DARKMODE:
			return {
				...state,
				darkmode: true
			}
		case SET_LIGHTMODE:
			return {
				...state,
				darkmode: false
			}
		default:
			return state
	}
}

export default handleData