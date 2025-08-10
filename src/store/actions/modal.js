import { isUsable } from "../../helpers/functions"

export const SHOW_PURCHASE_MODAL = "SHOW_PURCHASE_MODAL"
export const SHOW_LIST_MODAL = "SHOW_LIST_MODAL"
export const SHOW_REVIEW_MODAL = "SHOW_REVIEW_MODAL"
export const SHOW_QUOTE_MODAL = "SHOW_QUOTE_MODAL"
export const SHOW_FEEDBACK_MODAL = "SHOW_FEEDBACK_MODAL"
export const SHOW_LOGIN_MODAL = "SHOW_LOGIN_MODAL"
export const HIDE_MODAL = "HIDE_MODAL"

export const showModal = modalType => {
	if(isUsable(modalType)) return {type: modalType}
}

export const hideModal = () => { return {type: HIDE_MODAL} }