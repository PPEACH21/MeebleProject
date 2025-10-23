import { useState,useRef,useEffect, useContext } from "react";
import axios from "../api/axios";
import "../../css/pages/VerifyEmail.css"
import { AuthContext } from "../context/ProtectRoute";
import {  useNavigate } from "react-router-dom";

export const OTPInput=(email) =>{
    const {auth,setAuth} = useContext(AuthContext);
    const [otp,setOTP]= useState(new Array(6).fill(""));
    const navigate= useNavigate(); 
    const inputRef = useRef([])

    useEffect (()=>{
        if(auth){
            SendOTP(randomNumber, auth);
        }else{
            SendOTPRepassword(randomNumber,email);
        }
        if(inputRef.current[0]){
            inputRef.current[0].focus();
        }
    },[])
    
    const SendOTPRepassword = async (email)=>{
        try {
            const res = await axios.post(
            "/sendotp_repassword",
            { 
                email: email,   
                otp: otp.toString()
            }
            );
            console.log("✅ OTP sent successfully:", res.data);
        } catch (err) {
            console.error("❌ Error sending OTP:", err);
        }
    }

    const SendOTP = async (otp) => {
        try {
            const res = await axios.post(
            "/sendotp",
            { 
                username: auth.username, 
                email: auth.email,   
                otp: otp.toString()
            },
            {
                headers: { "Content-Type": "application/json" },
                withCredentials: true,
            }
            );
            setAuth({ ...auth, verified: true });
            console.log("✅ OTP sent successfully:", res.data);
        } catch (err) {
            console.error("❌ Error sending OTP:", err);
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
        
        if(otpCode==randomNumber){
            try {
                if(auth){
                    const updatadata = await axios.put(`/verifiedEmail/${auth.user_id}`,{},
                        {
                            headers: { "Content-Type": "application/json" },
                            withCredentials: true,
                        }
                    )
    
                    console.log("✅ OTP sent successfully:",updatadata);
                    
                    navigate("/home")
                }else{
                    navigate.replace("/changepasse")
                }
            } catch (err) {
                console.error("❌ Error sending OTP:", err);
            }

        }else{
            console.log("Not Correct")
        }
        
    };

    
    const [randomNumber, setRandomNumber] = useState(Math.floor(100000 + Math.random() * 900000));
    
    const reRandomNumber =()=>{
        setRandomNumber(Math.floor(100000 + Math.random() * 900000))
        SendOTP(randomNumber,auth)
    }


    return(
        <div>
            {
                otp.map((value,index)=>{
                    return(
                        <input
                            className="otpinput me-2"
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

            <div style={{ marginTop: "10px" }}>
                <a
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    reRandomNumber();
                }}
                >Resend OTP
                </a>
            </div>
            <div style={{ marginTop: "10px" }}>
                <button onClick={handleSubmit}>Submit</button>
            </div>
        </div>
    )
}
export default OTPInput;