import { useEffect, useRef } from "react"

const ProgressBar = ({progress}) => {
    const valueRef = useRef()

    useEffect(()=>{
        valueRef?.current?.style.setProperty("--progress",progress)
    },[progress])

    return ( 
        <div className="progressbar">
            <div ref={valueRef} className="progressbar__value"></div>
        </div> 
    )
}

export default ProgressBar