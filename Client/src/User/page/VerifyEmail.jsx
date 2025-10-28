import { useContext, useEffect, useRef, useState } from "react"
import { AuthContext } from "@/context/ProtectRoute";
import "@css/pages/VerifyEmail.css"
import OTPInput from "../component/OTPInput";
import { useNavigate } from "react-router-dom";

const VerifyEmail=()=>{
    const {auth,loading } = useContext(AuthContext);
    const [state,setState] = useState(false);
    const navigation = useNavigate();
    useEffect(()=>{
        if (loading) return;

        if(!auth){
            navigation("/",{replace:true});
        }
    },[auth, loading])
    
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