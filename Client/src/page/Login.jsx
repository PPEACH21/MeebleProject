import { useEffect, useState,useContext} from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import { m } from "../paraglide/messages";
import { AuthContext } from "../context/ProtectRoute";

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
        email: res.data.email,
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
    <div className="contrainer bg-image2">
      <div className="setcenter" >
        <div className="box">
          <h1 style={{marginTop:0}}>Login</h1>
          <form className="columnset" style={{gap:10}} onSubmit={handleSubmit}>
            <label>{m.username()} {m.or()} {m.email()}</label>
            <input
              className="textInput"
              type="text"
              autoComplete="off"
              onChange={(e) => setUserkey(e.target.value)}
              value={userkey}
              required
            />
            
            <label>{m.password()}</label>
            <div>
              <input
                className="textInput"
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
              />
              <div style={{marginTop:7,fontSize:13, textAlign:'end'}}>
                <a style={{color:"blue", textDecoration: 'none'}} href="/home">{m.forgot_password()}</a>
              </div>
            </div>
              {errMsg && <p style={{ color: "red" }}>{errMsg}</p>}


            <button type="submit" className="btn">{m.Signin()}</button>
              <div className="rowset" style={{fontSize:12,alignItems:'center',justifyContent:'center'}} >
                <p style={{margin:0,paddingRight:3}}>{m.dont_have_account()}</p>
                <a style={{color:"blue", textDecoration: 'none'}} href="/register">{m.Signup()}</a>
              </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
