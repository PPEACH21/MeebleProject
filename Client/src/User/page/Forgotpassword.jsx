
import { useState } from "react";
import { m } from "@/paraglide/messages";
import OTPInput from "../component/OTPInput";
import axios from "@/api/axios";
import { useNavigate } from "react-router-dom";

const Forgotpassword = ()=>{
    const [email,setEmail] = useState('');
    const [status,setStatus] = useState(0)
    const [errMsg, setErrMsg] = useState("");
    
    const [password, Setpassword] = useState("");
    const [conpassword, setConpassword] = useState("");
   
    const navigation = useNavigate();

    const SubmitEmail=async()=>{
        if(!email){
            return setErrMsg("Please Fill Email")
        }else{
            setErrMsg("")
            try{
                const res = await axios.post("/checkEmail", {email:email});
                console.log("checkEmail Success",res)
                setStatus(1)
            }catch(err){
                console.log("Email not Correct",err)
                setErrMsg("Email not Correct");
            }
        }
    }

    const SubmitPassword=async(e)=>{
        e.preventDefault()

        try{
            if(password.length<8 || conpassword.length<8)
                return setErrMsg("password must have 8")
            if(conpassword!=password){
                return setErrMsg("Password Notmatch")
            }

            setErrMsg("")            
            const res = await axios.put("/changepassword", {email:email,password:password});
            console.log("changePassword Success",res)
            navigation("/login",{replace:true})
        
        }catch(err){
            console.log("Email not Correct",err)
            setErrMsg("Email not Correct");
        }
    }

    return(
        <div className="contrainer bg-image2">
            <div className="setcenter">
                <div className="box">
                    {status===0 &&(
                        <>
                            <h1>{m.forgot_password()}</h1>
                            <div>
                                <p style={{textAlign:"center"}}>{m.resetPass()}</p>
                                <input
                                    className="textInput"
                                    type="email"
                                    value={email}
                                    onChange={(e)=>setEmail(e.target.value)}
                                    placeholder={m.enter_email()}
                                />
                            </div>
                                <p style={{ color: "red" , textAlign:'center' }}>{errMsg}</p>
                            <button className="btn" style={{width:"80%"}} onClick={()=>{SubmitEmail()}}>Submit</button>
                        </>
                    )}

                    {status===1 &&(
                        <>
                            <h1>{m.forgot_password()}</h1>
                            <div>
                                <p>Please check you email for get otp</p>
                                <OTPInput email={email} state={status} setState={setStatus}/>
                            </div>
                        </>
                    )}

                    {status===2 &&(
                        <>
                            <h1>{m.forgot_password()}</h1>
                             <form onSubmit={SubmitPassword} className="columnset" style={{gap:20}}>
                                <p>Please check you email for get otp</p>
                                <input
                                    className="textInput"
                                    type="password"
                                    value={password}
                                    onChange={(e)=>Setpassword(e.target.value)}
                                    placeholder={m.password()}
                                />
                                <input
                                    className="textInput"
                                    type="password"
                                    value={conpassword}
                                    onChange={(e)=>setConpassword(e.target.value)}
                                    placeholder={m.confrimpassword()}
                                />
                                <div className="setcenterNF columnset">
                                    <p style={{ color: "red", textAlign:'center'}}>{errMsg}</p>
                                    <button type="submit"  className="btn setcenterNF" style={{width:"100%"}}>Submit</button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Forgotpassword;