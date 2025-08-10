import { SET_BACKDROP, UNSET_BACKDROP } from "../actions/backdrop"

const initState = {
	show: false
}

const handleData = (state = initState, action) => {
	switch (action.type) {
		case SET_BACKDROP:
			return {
				...state,
				show: true,
			}
		case UNSET_BACKDROP:
			return {
				...state,
				...initState
			}
		default:
			return state
	}
}

export default handleData