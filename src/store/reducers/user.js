import Constants from "../../config/constants";
import jwt_decode from 'jwt-decode'
import { logout, postData } from "../../helpers/storage";
import { FOUND_USER, SET_USER, UNSET_USER } from "../actions/user";
import moment from "moment";

const initState = {
	user: {
		uid: null,
		wallet: null
	},
	tokens: {
		acsTkn: null
	}
}

const handleData = (state = initState, action) => {
	let userState
	switch (action.type) {
		case SET_USER:
			userState = {
				user: {
					uid: action.data.uid,
					wallet: action.data.wallet,
				},
				tokens: {
					acsTkn: {
						exp: moment(jwt_decode(action.data.tokens.acsTkn).exp*1000),
						tkn: action.data.tokens.acsTkn
					}
				}
			}
			postData(Constants.USER_STATE, userState)
			return {
				...state,
				...userState
			}
		case FOUND_USER:
			userState = {
				user: {
					uid: action.data.user.uid,
					wallet: action.data.user.wallet,
				},
				tokens: {
					acsTkn: {
						exp: action.data.tokens.acsTkn.exp,
						tkn: action.data.tokens.acsTkn.tkn
					}
				}
			}
			postData(Constants.USER_STATE, userState)
			return {
				...state,
				...userState
			}
		case UNSET_USER:
			logout()
			return { ...initState }
		default:
			return state
	}
}

export default handleData