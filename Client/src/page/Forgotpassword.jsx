
import { useState } from "react";
import { m } from "../paraglide/messages";
import OTPInput from "../component/OTPInput";
import axios from "../api/axios";

const Forgotpassword = ()=>{
    const [email,setEmail] = useState('');
    const [renew,setRenew] = useState(false)
    const [errMsg, setErrMsg] = useState("");
    
    const SubmitEmail=async()=>{
        if(!email){
            return setErrMsg("Please Fill Email")
        }else{
            setErrMsg("")
            try{
                const res = await axios.post("/checkEmail", {email:email});
                console.log("login Success")
                setRenew(true);
            }catch(err){
                console.log("Email not Correct",err)
                setErrMsg("Email not Correct");
            }
        }
    }

    return(
        <div className="contrainer bg-image2">
            <div className="setcenter">
                <div className="box">
                    {!renew ?
                        <>
                            <h1>{m.forgot_password()}</h1>
                            <div>
                                <p>Enter Your email to reset your password</p>
                                <input
                                    className="textInput"
                                    type="email"
                                    value={email}
                                    onChange={(e)=>setEmail(e.target.value)}
                                    placeholder={m.enter_email()}
                                />
                            </div>
                                <p style={{ color: "red" }}>{errMsg}</p>
                            <button className="btn" onClick={()=>{SubmitEmail()}}>Submit</button>
                        </>
                    :
                        <>
                            <h1>{m.forgot_password()}</h1>
                            <div>
                                <p>Please check you email for get otp</p>
                                <OTPInput email={email}/>
                            </div>
                            <button className="btn" style={{marginTop:30}}>Submit</button>
                        </>
                    }
                </div>
            </div>
        </div>
    );
}

export default Forgotpassword;