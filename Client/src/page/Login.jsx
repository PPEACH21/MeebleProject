import { useState} from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import "./Login.css"

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const navigate = useNavigate(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/login", { email, password }, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      console.log("login Success")
      setEmail("");
      setPassword("");
      navigate("/home")

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
            <label >Email:</label>
            <input
              type="text"
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              required
            />
          

          <label>Password:</label>
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
