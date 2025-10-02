import { useContext, useEffect, useState } from "react"
import { AuthContext } from "../context/ProtectRoute";

const VerifyEmail=()=>{
    const Authcontext = useContext(AuthContext);

    return(
        <div>
            <p>{Authcontext}</p>
            <p>TEST</p>
        </div>
    )
}

export default VerifyEmail;