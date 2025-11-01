import {m} from "@/paraglide/messages.js"
import { setLocale } from "@/paraglide/runtime.js"; 
import "@css/pages/Setting.css"

const Language =()=>{
    return(
        <div style={{flexDirection:'column', alignItems:'center', margin:'30px 70px'}}>
            <div className="columnset" style={{gap:'10px'}}>
                <h1 style={{marginTop:0}}>{m.Language()}</h1>
                <button className="boxsetting" onClick={()=>setLocale("en")} style={{justifyContent:'flex-start', gap:20}} > 
                    <span className="fi fi-us" style={{fontSize:"25px"}}></span> 
                    <p>{m.UnitedStates()}</p>
                </button>
                <button className="boxsetting" onClick={()=>setLocale("th")} style={{justifyContent:'flex-start', gap:20}} > 
                    <span className="fi fi-th" style={{fontSize:"25px"}}></span> 
                    <p>{m.Thailand()}</p>
                </button>
            </div>
        </div>
    )
}

export default Language