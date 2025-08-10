import { useEffect } from "react"

import Button from "../../ui/Buttons/Button"
import Backdrop from "../Backdrop/Backdrop"

import { ReactComponent as CloseIcon } from "../../../assets/icons/close-icon.svg"
import { useDispatch } from "react-redux"
import { hideModal } from "../../../store/actions/modal"

const Modal = ({ title = "", open = false, toggleModal, children, cancellable }) => {

	const dispatch = useDispatch()

	useEffect(() => {
		window.document.documentElement.style.overflowY = open ? "hidden" : "auto"
	}, [open])

	const getClasses = () => {
		let classes = ["modal__wrapper"]
		if (open) classes.push("modal__wrapper--open")
		else classes.push("modal__wrapper--close")
		return classes.join(" ")
	}

	return (
		<Backdrop show={open} hideOnClick={true}>
			<div className={getClasses()}>
				<div className="modal__wrapper__header">
					<div className="modal__wrapper__header__title typo__head--6">{title}</div>
					<div className="modal__wrapper__header__close-button">
						{cancellable?<Button type="icon" onClick={()=>dispatch(hideModal())}><CloseIcon/></Button>:null}
					</div>
				</div>
				<div className="modal__wrapper__content">{children}</div>
			</div>
		</Backdrop>
	)
}

export default Modal
