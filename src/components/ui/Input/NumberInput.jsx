import {ReactComponent as PlusIcon } from "../../../assets/icons/plus.svg"
import {ReactComponent as MinusIcon } from "../../../assets/icons/minus.svg"

const NumberInput = ({value=0,setValue=()=>{},unit="",min=0,max=100,step=1,offset=0}) => {

    const decreaseValue = () => {
        setValue(Math.max(min,value - step))
    }

    const increaseValue = () => {
        setValue(Math.min(max,value + step))
    }
    
    return (
        <div className="number-input">
            <div className="number-input__button" onClick={decreaseValue}>
                <MinusIcon width={24} stroke="currentColor" />
            </div>
            <div className="number-input__value">
                {value - offset}{unit}
            </div>
            <div className="number-input__button" onClick={increaseValue}>
                <PlusIcon width={24} stroke="currentColor" />
            </div>
        </div>
    );
};

export default NumberInput;
