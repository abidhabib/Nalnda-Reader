import { ReactComponent as CloseIcon } from "../../../assets/icons/close-icon.svg";
import Button from "../../ui/Buttons/Button";

const SidePanel = ({ show = false, setShow=()=>{}, position = "right", title = "", children, hideHeader = false, className = "" }) => {
    const getClasses = () => {
        let classes = ["sidepanel"];
        if (show === true) classes.push("sidepanel--open");
        classes.push(`sidepanel--${position}`);
        if (className) classes.push(className);  /* Add custom className */
        return classes.join(" ");
    };

    // Close panel when clicking outside (optional enhancement)
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            setShow(false);
        }
    };

    return (
        <>
            {show && (
                <div className="sidepanel__backdrop" onClick={handleBackdropClick}></div>
            )}
            <div className={getClasses()}>
                {!hideHeader && (
                    <div className="sidepanel__header">
                        <div className="sidepanel__header__close-btn">
                            <Button type="icon" onClick={()=>setShow(false)} aria-label="Close panel">
                                <CloseIcon width={24} height={24} stroke="currentColor"/>
                            </Button>
                        </div>
                        <div className="sidepanel__header__title typo__head--6">{title}</div>
                    </div>
                )}
                <div className="sidepanel__body">{children}</div>
            </div>
        </>
    );
};

export default SidePanel;