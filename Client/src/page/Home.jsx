import { Link } from "react-router-dom"
import {m} from '../paraglide/messages.js'
import { getLocale, setLocale } from "../paraglide/runtime.js"
import "./Home.css"
const HomePage= () =>{
    return(
        <>
            <div className="section bg-image">
                <div className=" container ">
                    <p className="display-1 fw-bold text-uppercase fontcolor">{m.projectname()}</p>
                    <p className="display-6 fw-light ms-2 w-50 fontcolor">{m.project_description01()}</p>

                    <div className="row mt-15  justify-content-evenly">
                        <Link to="/login" className="btn col p-3 mx-5 custom-btn">{m.login()}</Link>

                        <Link to="/register" className="btn p-3 col mx-5" style={{backgroundColor:"#FFA467", color:"#fff" ,fontWeight:"bold"}}>{m.register()}</Link>
                    </div>
                </div>
            </div>

            <div className="section position-relative">
            <div className="w-20"style={{backgroundColor: "#FFA467",borderBottomRightRadius:100, width:"50%",height:"15%",position: "absolute",top: 0,left: 0}}></div>
                <h1 className="display-4 mb-3 fw-bold">{m.project_description02()}</h1>
                <h2>{m.project_description03()}</h2>
                <div style={{backgroundColor: "#FFA467",width:"50%",borderTopLeftRadius:100,height:"15%",position: "absolute",bottom: 0,right: 0}}></div>
            </div>

            <div className="section bg-warning-subtle">
                <h1 className="display-4 mb-3 fw-bold">{m.project_description04()}</h1>
                <h2>{m.project_description05()}</h2>
            </div>
            <div className="section">
                <h1 className="display-4 mb-3 fw-bold">{m.project_description06()}</h1>
                <h2>{m.project_description07()}</h2>
                <Link to="/register" className="btn mt-5 w-25 custom-btn">{m.register()}</Link>
            </div>
            <button onClick={()=>{return(getLocale()==="en"?setLocale("th"):setLocale("en"))}}>Change Language</button>
        </>
    )
}
export default HomePage