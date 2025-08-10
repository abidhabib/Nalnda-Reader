import { SHOW_SPINNER, HIDE_SPINNER } from "../actions/spinner"

const initState = {
	show: false
}

const handleData = (state = initState, action) => {
	switch (action.type) {
		case SHOW_SPINNER:
			return {
				...state,
				show: true
			}
		case HIDE_SPINNER:
			return {
				...state,
				show: false
			}
		default:
			return state
	}
}

export default handleData