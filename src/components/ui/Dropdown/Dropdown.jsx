import React, { useState } from 'react'

const Dropdown = ({ button = "", options = "" }) => {
	const [DropdownOpen, setDropdownOpen] = useState(false)

	const toggleDropdown = (state) => {
		setDropdownOpen(state)
	}

	const getClasses = () => {
		let classes = ["dropdown__options"]
		if (DropdownOpen) classes.push("dropdown__options--open")
		return classes.join(" ")
	}

	const getDropdownClasses = () => {
		let classes = ["dropdown"]
		if (DropdownOpen) classes.push("dropdown--open")
		return classes.join(" ")
	}

	return (
		<div className={getDropdownClasses()}>
			<div className="dropdown__title" onClick={()=>setDropdownOpen(s=>!s)}>
				{button}
			</div>
			<div className={getClasses()}>{options}</div>
		</div>
	)
}

export default Dropdown
