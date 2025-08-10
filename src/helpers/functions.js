import moment from "moment"

export const isNotEmpty = param => param !== undefined && param !== null && param !== ""
export const isFilled = param => param !== undefined && param !== null && param.length>0
export const isUsable = param => param !== undefined && param !== null
export const isNull = param => param !== undefined && param === null
export const isUndefined = param => param === undefined

export const isUserLoggedIn = data => {
	if(isUsable(data)){
		const user = data.user
		const tokens = data.tokens
		if(isUsable(tokens)){
			if(isUsable(tokens.acsTkn)){
				if(moment().isBefore(tokens.acsTkn.exp) && isFilled(user.uid)){
					return true
				}
			}
		}
	}
	return false
}

export const isWalletConnected = data => {
	if(isUsable(data)){
		const wallet = data.wallet
		if(isUsable(wallet)){
			if(isUsable(wallet.wallet) && isUsable(wallet.provider) && isUsable(wallet.signer) && isUsable(wallet.address)) return true
		}
	}
	return false
}

export const isSameWallet = (walletAddress, userState) => {
	if(isUsable(walletAddress) && isUsable(userState)){
		if(isUserLoggedIn(userState)){
			if(isFilled(userState.user.wallet)){
				if(userState.wallet === walletAddress) return true
				else return false
			}
			else return null
		}
	}
}