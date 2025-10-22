import { useContext, useEffect, useRef, useState } from "react"
import { AuthContext } from "../context/ProtectRoute";
import "../../css/pages/VerifyEmail.css"
import OTPInput from "../component/OTPInput";

const VerifyEmail=()=>{
    const {auth} = useContext(AuthContext);
    const [state,setState] = useState(false);
    return(
        <div className="d-flex justify-content-center align-content-center vh-100 p-5">

            {!state ? 
                <div >
                    <p>You must to Verify Email for use web</p>
                    <button onClick={()=>{setState(!state)}}>send to give OTP</button>
                </div>
            :
                <div>
                    <p>Enter OTP sent to Your Email</p> 
                    <OTPInput/>
                    <p>{auth.username}</p>
                    <p>TEST</p>
                </div>
            }
        </div>
    )
}

export default VerifyEmail;