import { createContext } from "react"
import { Navigate , useLocation,Outlet } from "react-router-dom";
import Cookies from 'js-cookie';

export const AuthContext  = createContext(null);

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

