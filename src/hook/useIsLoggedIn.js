import moment from 'moment'
import { useEffect } from 'react'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { isUsable } from '../helpers/functions'

const useIsLoggedIn = () => {

	const UserState = useSelector(state => state.UserState)

	const [IsLoggedIn, setIsLoggedIn] = useState(null)

	useEffect(() => {
		if(isUsable(UserState.tokens.acsTkn)){
			if(moment().isBefore(UserState.tokens.acsTkn.exp) && isUsable(UserState.user.uid)) setIsLoggedIn(true)
			else setIsLoggedIn(false)
		}
		else setIsLoggedIn(false)
	}, [UserState])

	return IsLoggedIn
}

export default useIsLoggedIn