const Button = ({children,className="",type="",size="md",icon="",disabled=false,onClick={}}) => {
    
    const getButtonClasses = () => {
        const classList = ["button typo__act",className]
        classList.push(`button--${type}`)
        classList.push(`button--${size}`)
        return classList.join(" ")
    }
    
    return ( 
        <button className={getButtonClasses()} onClick={typeof onClick === "function" ? onClick : ()=>{}} disabled={disabled}>{children}</button> 
    )
}

export default Button