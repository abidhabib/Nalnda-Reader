import { HIDE_MODAL, SHOW_FEEDBACK_MODAL, SHOW_LIST_MODAL, SHOW_LOGIN_MODAL, SHOW_PURCHASE_MODAL, SHOW_QUOTE_MODAL, SHOW_REVIEW_MODAL } from "../actions/modal"

const initState = {
	type: null,
	show: false
}

const handleData = (state = initState, action) => {
	switch (action.type) {
		case SHOW_PURCHASE_MODAL:
			return {
				...state,
				show: true,
				type: SHOW_PURCHASE_MODAL
			}
		case SHOW_LIST_MODAL:
			return {
				...state,
				show: true,
				type: SHOW_LIST_MODAL
			}
		case SHOW_REVIEW_MODAL:
			return {
				...state,
				show: true,
				type: SHOW_REVIEW_MODAL
			}
		case SHOW_QUOTE_MODAL:
			return {
				...state,
				show: true,
				type: SHOW_QUOTE_MODAL
			}
		case SHOW_FEEDBACK_MODAL:
			return {
				...state,
				show: true,
				type: SHOW_FEEDBACK_MODAL
			}
		case SHOW_LOGIN_MODAL:
			return {
				...state,
				show: true,
				type: SHOW_LOGIN_MODAL
			}
		case HIDE_MODAL:
			return { ...initState }
		default:
			return state
	}
}

export default handleData