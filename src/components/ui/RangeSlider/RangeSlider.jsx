import { useEffect, useRef } from "react";
import { isUsable } from "../../../helpers/functions";
import "../../../sass/components/ui/range-slider.css";
const RangeSlider = ({className="", value, onChange, min=0, max=100, step=1}) => {
    const rangeSliderRef = useRef(null);

    useEffect(() => {
        if (!isUsable(rangeSliderRef.current)) return;
        
        // Calculate progress as a percentage (0 to 1)
        const progress = (value - min) / (max - min);
        
        // Clamp progress between 0 and 1
        const clampedProgress = Math.max(0, Math.min(1, progress));
        
        // Set CSS variable for progress
        rangeSliderRef.current.style.setProperty("--progress", clampedProgress);
    }, [value, min, max]);

    // Handle keyboard navigation for accessibility
    const handleKeyDown = (e) => {
        if (!onChange) return;
        
        const stepValue = step || 1;
        let newValue = value;
        
        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                newValue = Math.max(min, value - stepValue);
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                newValue = Math.min(max, value + stepValue);
                e.preventDefault();
                break;
            case 'Home':
                newValue = min;
                e.preventDefault();
                break;
            case 'End':
                newValue = max;
                e.preventDefault();
                break;
            default:
                return;
        }
        
        // Create synthetic event to match onChange signature
        const syntheticEvent = {
            target: { value: newValue },
            persist: () => {}
        };
        onChange(syntheticEvent);
    };

    return (
        <div 
            ref={rangeSliderRef} 
            className={`range-slider ${className}`}
        >
            <input
                type="range"
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
                onKeyDown={handleKeyDown}
                className="range-slider__input"
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
            />
        </div>
    );
};

export default RangeSlider;