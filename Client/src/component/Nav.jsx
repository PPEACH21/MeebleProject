import { useContext } from "react";
import { AuthContext } from "../context/ProtectRoute";
import { useState,useEffect } from "react";
import axios from "../api/axios";

const Navbar =()=>{
    const {auth} = useContext(AuthContext);
    
    const getuserID= async()=>{
        try{
            const res = await axios.get(`/user/${auth.user_id}`,{withCredentials: true})
            setDatauser(res.data)
            console.log("API Response:", res.data)  

        }catch (err) {
            console.error("Error fetching user:", err)
        }
    }
    const [dataUser, setDatauser] =  useState([]);
    
    useEffect (()=>{
        getuserID()
    },[])

    return(
        <nav className="navHomePage">
            <div className="nav">
                <img
                    src="https://i.ibb.co/MyMPRx3P/Chat-GPT-Image-Sep-23-2025-10-01-38-PM.jpg"
                    alt="Logo"
                />
                <div className="navMenu">
                    <h1>cost : {dataUser.Cost}</h1>
                    <h1>history </h1>
                    <h1>username : {dataUser.username}</h1>
                </div>
            </div>
        </nav>
    )
}
export default Navbar