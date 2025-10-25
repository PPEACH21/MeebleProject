// src/component/Nav.jsx
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/ProtectRoute";
import axios from "../api/axios";
import { FaRegUserCircle,FaHistory  } from "react-icons/fa";
import { TiShoppingCart } from "react-icons/ti";
import { useNavigate } from "react-router-dom";

import '../../css/pages/StorePage.css'

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
    
    const navigate = useNavigate();

    useEffect (()=>{
        getuserID()
    },[])

    return(
        <nav className="navHomePage">
            <div className="nav">
                <div className="rowset" style={{alignItems:'center',fontWeight:'bold',color:'#fff',fontSize:'20px'}}>
                    <img
                        src="https://i.ibb.co/MyMPRx3P/Chat-GPT-Image-Sep-23-2025-10-01-38-PM.jpg"
                        alt="Logo"
                    />
                    <p>MEEBLE PROJECT</p>
                </div>
                <div className="navMenu">   
                    <div className="rowset fontcolor">
                        <p>Coin:{dataUser.Cost}.-</p>
                    </div>
                    <div className="fontcolor">
                        <FaHistory size={25} onClick={()=>navigate("/history")}/>
                    </div>
                    <div className="fontcolor">
                        <TiShoppingCart size={35} onClick={()=>navigate("/cart")}/>
                    </div>
                    <div className="rowset fontcolor" style={{gap:10,alignItems:'center'}}>
                        <FaRegUserCircle size={28}/>
                        <p>{dataUser.username}</p>
                    </div>
                </div>
            </div>
        </nav>
    )
}
export default Navbar