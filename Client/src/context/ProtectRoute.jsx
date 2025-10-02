import { createContext, useEffect, useState } from "react"
import { Navigate , useLocation,Outlet } from "react-router-dom";
import Cookies from 'js-cookie';
import axios from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({children})=>{
  const [auth,setAuth]=useState(null);

  useEffect(() => {
    const getid = async () => {
      try {
        const res = await axios.get("/profile", { withCredentials: true });
        console.log("API Response:", res.data);
        setAuth(res.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    getid();
  }, []);
  
  const login=(userData) => {
    setAuth(userData)
    console.log(userData)
  };


  const logout=()=>{
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const ProtectRoute =({ children })=>{
    const token = Cookies.get("token"); 
    const location = useLocation();
    
    console.log('cookie now =', token);
    if(!token) {
         return <Navigate to="/" replace state={{ from: location }} />;
    }
    return children
}

export const ProtectedLayout=()=> {
  return (
    <ProtectRoute>
      <Outlet />
    </ProtectRoute>
  );
}



