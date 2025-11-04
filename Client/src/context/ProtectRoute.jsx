import { createContext, useContext, useEffect, useState } from "react"
import { Navigate , useLocation,Outlet } from "react-router-dom";
import axios from "../api/axios";
export const AuthContext = createContext();

export const AuthProvider = ({children})=>{
  const [auth,setAuth]=useState(null);
  const [loading, setLoading] = useState(true); 
  
  const [Profile,setProfile] =useState([]);
  
  const getId = async () => {
    try{
      const res = await axios.get("/profile", { withCredentials: true });

      console.log("API Response:", res.data);
      setAuth(res.data);

      setProfile({
        Firstname:res.data.firstname,
        Lastname:res.data.lastname,
        Phone:res.data.phone,
        Coin:res.data.coin,
        Username:res.data.username,
        Avatar:res.data.avatar,
        Email:res.data.email,
        User_id:res.data.user_id
      })
    }catch{
      setAuth(null);
    }finally{
      setLoading(false);
    }
  };

  useEffect(() => {
    getId();
  }, []);

  const login=(userData) => {
    setAuth(userData)
    console.log(userData)
  };

  const logout=async()=>{
    try {
      await axios.post("/logout", {}, { withCredentials: true }); // ✅ เรียกเคลียร์ cookie จาก backend
      console.log("Logged success.");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setAuth(null); // ล้าง state ฝั่ง frontend ด้วย
    }
  };

  return (
    <AuthContext.Provider value={{ auth ,setAuth,getId,Profile,setProfile, login, logout ,loading}}>
      {children}
    </AuthContext.Provider>
  );
}

export const ProtectRoute =({ children , role})=>{
  const {auth,loading} = useContext(AuthContext);
  const location = useLocation();
  // console.log("ProtectRoute",auth)

  if (loading) {
    return <></>;
  }
  if (!auth) {
    console.log("NO Auth",auth)
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  
  if(!auth.verified){
    console.log("NO Auth",auth)
    return <Navigate to="/verifyemail" replace state={{ from: location }} />;
  }
  
  if(auth.role != role){
    console.log("You role no match",auth)
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  return children
}

export const ProtectedLayout=({role})=> {
  return (
    <ProtectRoute role={role}>
      <Outlet />
    </ProtectRoute>
  );
}


