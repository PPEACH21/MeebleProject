import { createContext, useContext, useEffect, useState } from "react"
import { Navigate , useLocation,Outlet } from "react-router-dom";
import axios from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({children})=>{
  const [auth,setAuth]=useState(null);
  const [loading, setLoading] = useState(true); 
  
  useEffect(() => {
    const getid = async () => {
      try{
        const res = await axios.get("/profile", { withCredentials: true });
        console.log("API Response:", res.data);
        setAuth(res.data);
      }catch{
        setAuth(null);
      }finally{
        setLoading(false);
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
    <AuthContext.Provider value={{ auth ,setAuth, login, logout ,loading}}>
      {children}
    </AuthContext.Provider>
  );
}

export const ProtectRoute =({ children })=>{
  console.log("ProtectRoute",auth)
    const {auth,loading} = useContext(AuthContext);
    const location = useLocation();

    if (loading) {
      return <div>Loading...</div>;
    }
    if (!auth) {
      console.log("NO Auth",auth)
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



