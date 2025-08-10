import moment from 'moment'
import React, { useState } from 'react'

import InputModal from './Modal'
import Backdrop from '../../hoc/Backdrop/Backdrop'
import FilePicker from '../FilePicker/FilePicker'

import { isUsable } from '../../../helpers/functions'

const InputField = ({required=true,...props}) => {

	const [ShowValues, setShowValues] = useState(false)

	const renderInputField = () => {
		switch (props.type) {
			case 'text':
				return <textarea className='input__group__field input__group__field--text typo__body' type={'text'} rows={props.lines} required={required} value={props.value} onChange={props.onChange} placeholder={props.placeholder}/>
			case 'date':
				return <input className='input__group__field typo__body' type={'date'} required={required} defaultValue={isUsable(props.min)?moment(props.min).format('YYYY-MM-DD'):null} min={isUsable(props.min)?moment(props.min).format('YYYY-MM-DD'):null} value={props.value} onChange={props.onChange}/>
			case 'string':
				return <input className='input__group__field typo__body' type={'text'} required={required} value={props.value} onChange={props.onChange} placeholder={props.placeholder}/>
			case 'email':
				return <input className='input__group__field typo__body' type={'email'} required={required} value={props.value} onChange={props.onChange} placeholder={props.placeholder}/>
			case 'number':
				return <input className='input__group__field typo__body' type={'number'} required={required} value={props.value} onChange={props.onChange} placeholder={props.placeholder}/>
			case 'range':
				return <input className='input__group__field typo__body' type={'range'} required={required} value={props.value} onChange={props.onChange} min={props.min} max={props.max} step={props.step} placeholder={props.placeholder}/>
			case 'password':
				return <input className='input__group__field typo__body' type={'password'} required={required} value={props.value} onChange={props.onChange} placeholder={props.placeholder}/>
			case 'telephone':
				return <input className='input__group__field typo__body' type={'tel'} required={required} value={props.value} onChange={props.onChange} placeholder={props.placeholder}/>
			case 'file':
				return <FilePicker className='input__group__field typo__body' type={'file'} accept={props.accept} required={required} onChange={props.onChange} placeholder={props.placeholder}/>
			case 'list':
				return <React.Fragment>
					{props.listType==='multiple'?
						<React.Fragment>
							<input className='input__group__field typo__body' type={'text'} value={props.value.join(', ')} readOnly required={required} onClick={()=>setShowValues(true)}/>
							<Backdrop show={ShowValues}>
								<InputModal listType={props.listType} minLimit={props.minLimit} maxLimit={props.maxLimit} value={props.value} values={props.values} label={props.label} onSave={values=>{props.onSave(values); setShowValues(false)}} onCancel={()=>setShowValues(false)}/>
							</Backdrop>
						</React.Fragment>
						:
						<React.Fragment>
							<input className='input__group__field typo__body' type={'text'} value={props.value} readOnly required={required} onClick={()=>setShowValues(true)}/>
							<Backdrop show={ShowValues}>
								<InputModal listType={props.listType} minLimit={props.minLimit} maxLimit={1} value={""} values={props.values} label={props.label} onSave={value=>{props.onSave(value); setShowValues(false)}} onCancel={()=>setShowValues(false)}/>
							</Backdrop>
						</React.Fragment>}
				</React.Fragment>
			case 'select' :
				return <select className='input__group__field typo__body' value={props.value} onChange={props.onChange} required={required}>
					{props.options.map(opt => <option key={opt.id} className="typo__color--n700" value={opt.id}>{opt.value}</option>)}
				</select>
			default:
				return <input className='input__group__field typo__body' type={'text'} required={required} value={props.value} onChange={props.onChange}/>
		}
	}

	return (
		<div className='input__group'>
			<div className={'input__group__label typo__body typo__transform--capital' + (required === true ? " input__group__label--required" : "")}>{props.label}</div>
			<div className='input__group__description typo__body typo__body--2'>{props.description}</div>
			{renderInputField()}
		</div>
	)
}

export default InputField