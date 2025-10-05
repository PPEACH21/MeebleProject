import { useContext, useEffect, useState } from "react"
import { AuthContext } from "../context/ProtectRoute";

const VerifyEmail=()=>{
    const {auth} = useContext(AuthContext);

    return(
        <div>
            <p>{auth.username}</p>
            <p>TEST</p>
        </div>
    )
}

export default VerifyEmail;