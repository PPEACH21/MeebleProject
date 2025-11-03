import { useState} from "react";
import axios from "@/api/axios";
import { useNavigate } from "react-router-dom";
import { m } from "@/paraglide/messages";
import { MdStoreMallDirectory } from "react-icons/md";
import { FaUser } from "react-icons/fa";
const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [chooserole, setChooserole] = useState(false);
  const [role, setRole] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const navigate = useNavigate(); 

  const handleSubmit = async (e) => { 
    e.preventDefault();
    try {
      if(password !== confirmPassword){
        setErrMsg("password Not match!")
        return;
      }else if(password.length<8 || confirmPassword.length<8){
        setErrMsg("password must have 8")
        return;
      }else if(username.length<5){
        setErrMsg("username must have 5")
        return;
      }

      const res = await axios.post("/createaccount", { email,username, password ,role}, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      console.log("complete",res)
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setErrMsg("");
      navigate("/login",{replace:true})
    } catch (err) {
      if (!err?.response) {
        console.log(err.message, err.code)
        setErrMsg("No Server Response");
      } else if (err.response?.status === 400) {
        setErrMsg("User or email has Already");
      } else if (err.response?.status === 401) {
        setErrMsg("Unauthorized");
      } else {
        setErrMsg("Login Failed");
      }
    }
  };

  const Setuprole=({role="user"})=>{
    setRole(role)
    setUsername("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setChooserole(true)
    console.log(role)
  }
  return (
    <div className="container bg-image2">
      <div className="setcenter ">
        {!chooserole?
          <div className="box" style={{justifyContent:'space-evenly',gap:30}}>
            <h1>เลือกบทบาท</h1>
            <div className="rowset" style={{gap:50}}>
              <div className="columnset btn1" onClick={()=> Setuprole({ role: "user" })} style={{width:'200px',height:'200px',justifyContent:'space-evenly'}}>
                  <h3>ลูกค้า</h3>
                  <FaUser size={80}/>
              </div>
              <div className="columnset  btn1" onClick={()=> Setuprole({ role: "vendor" })} style={{width:'200px',height:'200px',justifyContent:'space-evenly'}}>
                  <h3>ผู้ประกอบการ</h3>
                  <MdStoreMallDirectory size={100}/>
              </div>
            </div>
          </div>
        
        :
        <div className="box">

          <h1 style={{marginTop:0}} >Register</h1>
          
          <form className="columnset" style={{gap:10}} onSubmit={handleSubmit}>
            <label>{m.email()}</label>
            <input
              className="textInput"
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              required
            />
            <label>{m.username()}</label>
            <input
              className="textInput"
              type="text"
              onChange={(e) => setUsername(e.target.value)}
              value={username}
              autoComplete="new-password" 
              required
            />
            <label>{m.password()}</label>
            <input
              className="textInput"
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              autoComplete="new-password" 
              required
            />
        
            <label>{m.confrimpassword()}</label>
            <input
              className="textInput" 
              type="password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              value={confirmPassword}
              autoComplete="new-password" 
              required
              />
              {errMsg && <p style={{ color: "red" }}>{errMsg}</p>}

            <button type="submit" className="btn" style={{marginTop:20}}>{m.register()}</button>
            
            <div className="rowset" style={{fontSize:12,alignItems:'center',justifyContent:'center'}} >
              <p style={{margin:0,paddingRight:3}}>{m.have_account()}</p>
              <a style={{color:"blue", textDecoration: 'none'}} href="/login">{m.Signin()}</a>
            </div>
          </form>
        </div>
        }
      </div>
    </div>
  );
};

export default Register;
