import { useEffect } from "react";
import { useRef } from "react";
import { isUsable } from "../../../helpers/functions";

const RangeSlider = ({className="",value,onChange,min=0,max=100,step=1}) => {
    const rangeSliderRef = useRef();

    useEffect(()=>{
        if(!isUsable(rangeSliderRef.current)) return ;
        let progress = value / (max-min) ;
        rangeSliderRef.current.style.setProperty("--progress",progress)
    },[value,min,max,rangeSliderRef])

    return (
        <div ref={rangeSliderRef} className={"range-slider "+className}>
            <input
                type="range"
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
                className="range-slider__input"
            />
        </div>
    );
};

export default RangeSlider;
