import { useState,useRef,useEffect, useContext } from "react";
import axios from "@/api/axios";
import { AuthContext } from "@/context/ProtectRoute";
import {  useNavigate } from "react-router-dom";

export const OTPInput=({email=false,state,setState}) =>{
    const {auth,setAuth} = useContext(AuthContext);
    const [otp,setOTP]= useState(new Array(6).fill(""));
    const navigate= useNavigate(); 
    const inputRef = useRef([])

    useEffect (()=>{
        sendmessage()
    },[])

    const sendmessage = ()=>{
        if(!email){
            SendOTP( auth);
        }else{
            SendOTPRepassword(email);
        }
        if(inputRef.current[0]){
            inputRef.current[0].focus();
        }
    }
    const SendOTPRepassword = async (email)=>{
        try {
            const res = await axios.post(
            "/sendotp_repassword",
            { 
                email: email,
            }
            );
            console.log("OTP sent successfully:", res.data);
        } catch (err) {
            console.error("Error sending OTP:", err);
        }
    }

    const SendOTP = async () => {
        try {
            const res = await axios.post(
            "/sendotp",
            { 
                username: auth.username, 
                email: auth.email,   
            },
            {
                headers: { "Content-Type": "application/json" },
                withCredentials: true,
            }
            );
            console.log("OTP sent successfully:", res.data);
        } catch (err) {
            console.error("Error sending OTP:", err);
        }
    };

    const handleChange=(index,e)=>{
        const value= e.target.value;
        if(isNaN(value))return;

        const newOTP = [...otp];
        newOTP[index] = value.substring(value.length-1)
        setOTP(newOTP)

        if(value && index < otp.length - 1) {
            inputRef.current[index + 1].focus();
        }
    }

    const handleClick=(index)=>{
        inputRef.current[index].setSelectionRange(1, 1);
    }
    const handleKeydown=(index,e)=>{
        if(e.key === "Backspace"){
            if (otp[index]=== ""&& index > 0) {
                inputRef.current[index - 1].focus();
            }
        }
    }

    const handleSubmit = async() => {
        const otpCode = otp.join("");
        console.log("OTP submitted:", otpCode);
        
        try {
            if(!email){
                const checkOTP = await axios.post(`/checkotp`,{otp:otpCode,email:auth.email})
                console.log("checkOTP Success",checkOTP.status)
                const updatadata = await axios.put(`/verifiedEmail/${auth.user_id}`,{},
                    {
                        headers: { "Content-Type": "application/json" },
                        withCredentials: true,
                    }
                )
                console.log("Verified success:", updatadata.data);

                const updatedAuth = { ...auth, verified: true };
                setAuth(updatedAuth);
                
                console.log("Updated Auth:", updatedAuth);
                navigate("/home")
            }else{
                const checkOTP = await axios.post(`/checkotp`,{otp:otpCode,email:email})
                console.log("checkOTP Success",checkOTP.status)
                console.log("Changepassword Page");
                setState(state+1);
            }   
        }catch(err){
            console.error("Error OTP Not Correct:", err);
        }
    }

    return(
        <div>
            {
                otp.map((value,index)=>{
                    return(
                        <input
                            className="otpinput"
                            key={index}
                            ref={(input)=>(inputRef.current[index]=input)}
                            text="text"
                            value={value}
                            onChange={(e)=> handleChange(index,e)}
                            onClick={()=> handleClick(index)}
                            onKeyDown={(e)=> handleKeydown(index,e)}
                        />
                    )
                })
            }

            <div style={{ textAlign:'end', marginTop: "10px" }}>
                <a
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    sendmessage();
                }}
                >Resend OTP
                </a>
            </div>
            <div  className="setcenterNF" style={{ marginTop: "10px"}}>
            <button className="btn" style={{width:"80%"}} onClick={handleSubmit}>Submit</button>
            </div>
        </div>
    )
}
export default OTPInput;