import { ReactComponent as CloseIcon } from "../../../assets/icons/close-icon.svg";
import Button from "../../ui/Buttons/Button";

const SidePanel = ({ show = false, setShow=()=>{}, position = "right", title = "", children }) => {
    const getClasses = () => {
        let classes = ["sidepanel"];
        if (show === true) classes.push("sidepanel--open");
        classes.push(`sidepanel--${position}`);
        return classes.join(" ");
    };

    return (
        <div className={getClasses()}>
            <div className="sidepanel__header">
                <div className="sidepanel__header__close-btn">
                    <Button type="icon" onClick={()=>setShow(false)}>
                        <CloseIcon width={24} height={24} stroke="currentColor"/>
                    </Button>
                </div>
                <div className="sidepanel__header__title typo__head--6">{title}</div>
            </div>
            <div className="sidepanel__body">{children}</div>
        </div>
    );
};

export default SidePanel;
