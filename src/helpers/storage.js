export const postData = (key, data) => {
	localStorage.setItem(key, JSON.stringify(data))
}

export const getData = (key) => {
	return JSON.parse(localStorage.getItem(key))
}

export const deleteData = (key) => {
	localStorage.removeItem(key)
}

export const logout = () => {
	localStorage.clear()
}