import React, { useState } from 'react'
import { useDispatch } from 'react-redux'

import { isUsable } from '../../../helpers/functions'
import { setSnackbar } from '../../../store/actions/snackbar'

import Button from '../Buttons/Button'

const InputModal = props => {

	const dispatch = useDispatch()

	const [SelectedValues, setSelectedValues] = useState(props.value)
	const [SelectedValue, setSelectedValue] = useState(props.value)

	const handleValueClick = value => {
		if(props.listType === 'multiple'){
			if(SelectedValues.indexOf(value)>-1){
				if(SelectedValues.length > props.minLimit) setSelectedValues(old => old.filter(v => v !== value))
				else dispatch(setSnackbar({show: true, message: "Please select minimum "+props.minLimit+' '+props.label, type: 3}))
			}
			else{
				if(SelectedValues.indexOf(value)<0 && SelectedValues.length < props.maxLimit) setSelectedValues(old => [...old, value])
				else dispatch(setSnackbar({show: true, message: "Please select maximum "+props.maxLimit+' '+props.label, type: 3}))
			}
		}
		else setSelectedValue(value)
	}

	const renderValues = () => {

		const getClasses = value => {
			let classes = ["input__modal__values__item typo__body typo__transform--capital"]
			if(props.listType==='multiple' && SelectedValues.indexOf(value)>-1) classes.push("input__modal__values__item--active")
			else if(props.listType==='single' && SelectedValue === value) classes.push("input__modal__values__item--active")
			return classes.join(" ")
		}

		const values = props.values.sort((a,b)=>a>b)
		let valuesDOM = []
		values.forEach(value => {
			valuesDOM.push(
				<div className={getClasses(value)} key={value} onClick={()=>handleValueClick(value)}>
					{value}
				</div>
			)
		})
		return valuesDOM
	}
	
	return(
		<div className="modal input__modal">
			<h4 className="input__modal__head typo__head typo__head--4">Select {props.label} {isUsable(props.minLimit)?<span className='typo__body typo__body--2'>{'('+SelectedValues.length+'/'+props.maxLimit+')'}</span>:null}</h4>
			{/* {props.listType==='multiple'?
				<InputField type="string" label={props.label} value={SelectedValues.join(', ')} onChange={()=>{}}/>
				:
				<InputField type="string" label={props.label} value={SelectedValue} onChange={()=>{}}/>
			} */}
			<div className="input__modal__values">
				{renderValues()}
			</div>
			<div className="input__modal__space"/>
			<div className="input__modal__actions">
				<Button label={"Cancel"} onClick={()=>props.onCancel()}/>
				<Button onClick={()=>props.onSave(props.listType==='multiple'?SelectedValues:SelectedValue)}>Save</Button>
			</div>
		</div>
	)
}

export default InputModal