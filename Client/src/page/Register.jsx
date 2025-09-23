import { useState} from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import { m } from "../paraglide/messages";
import "./Register.css"

const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

      const res = await axios.post("/createaccount", { email,username, password }, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      console.log("complete")
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

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
    <div className="sectionregister p-5 rounded-5">
      <h1 className="text-center mb-4">Register</h1>
      <form onSubmit={handleSubmit}  className=" d-flex flex-column">
            <label>{m.email()}</label>
            <input
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              required
            />
            <label>{m.username()}</label>
            <input
              type="text"
              onChange={(e) => setUsername(e.target.value)}
              value={username}
              required
            />
            <label>{m.password()}</label>
            <input
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              
              required
            />
        
          <label>{m.confrimpassword()}</label>
          <input
            type="password"
            onChange={(e) => setConfirmPassword(e.target.value)}
            value={confirmPassword}
            required
            />
            {errMsg && <p style={{ color: "red" }}>{errMsg}</p>}

            <label className="fs-6 text-end">{m.confrimpassword()}</label>
          <button type="submit" className="btn btn-primary w-75 mt-2 container">{m.register()}</button>
      </form>

    </div>
    </div>
  );
};

export default Register;
