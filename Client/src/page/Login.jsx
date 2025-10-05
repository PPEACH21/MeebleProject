import { useEffect, useState,useContext} from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import "./Login.css"
import { m } from "../paraglide/messages";
import { AuthContext } from "../context/ProtectRoute";
import VerifyEmail from "./VerifyEmail";

const LoginPage = () => {
  const [userkey, setUserkey]=useState("");
  const [password, setPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const navigate = useNavigate(); 
  const { auth,login } = useContext(AuthContext);

  useEffect(()=>{
    console.log("LoginPage Auth:",auth);
    if(auth && auth.verified){
      navigate('/home', { replace: true });
    }else if(auth && !auth.verified){
      navigate('/verifyemail', {replace: true});
    }
  }, [auth,navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/login", { email:userkey,username:userkey, password }, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      console.log("login Success")

      const userData = {
        user_id: res.data.user_id,
        username: res.data.username,
        verified: res.data.verified,
        role: res.data.role,
      };
      
      login(userData);
      setUserkey("");
      setPassword("");
      navigate("/home",{ replace: true })
      

    } catch (err) {
      if (!err?.response) {
        console.log(err.message, err.code)
        setErrMsg("No Server Response");
      } else if (err.response?.status === 400) {
        setErrMsg("Missing Email or Password");
      } else if (err.response?.status === 401) {
        setErrMsg("Unauthorized");
      } else {
        setErrMsg("Login Failed");
      }
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
    <div className="sectionlogin p-5 rounded-5">
      <h1 className="text-center mb-4">Login</h1>
      <form onSubmit={handleSubmit}  className=" d-flex flex-column">
            <label>{m.username()} {m.or()} {m.email()}</label>
            <input
              type="text"
              autoComplete="off"
              onChange={(e) => setUserkey(e.target.value)}
              value={userkey}
              required
            />
          

          <label>{m.password()}</label>
          <input
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            required
            />
            {errMsg && <p style={{ color: "red" }}>{errMsg}</p>}


          <button type="submit" className="btn btn-primary w-75 mt-5 container">Sign In</button>
      </form>

    </div>
    </div>
  );
};

export default LoginPage;
