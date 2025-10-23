import { Link } from "react-router-dom"
import {m} from '../paraglide/messages.js'
import { getLocale, setLocale } from "../paraglide/runtime.js"
const HomePage= () =>{
    return(
        <>
            <div className="container bg-image1">
                <div className="setcenter">
                    <div className="columnset" style={{width:"60%",height:"50%",justifyContent: "space-between",}}>
                        <div>

                            <h1 style={{color:'white', fontSize:50}}>{m.projectname().toUpperCase()}</h1>
                            <h4 style={{marginLeft:40,color:'white',fontSize:20}}>{m.project_description01()}</h4>
                        </div>

                        <div style={{display:'flex',justifyContent:'space-evenly',height:"15%"}}>
                            <Link to="/register" className="btn1" style={{width:"15%"}}>{m.register()}</Link>
                            <Link to="/login" className="btn" style={{width:"15%"}}>{m.login()}</Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container" style={{backgroundColor:'#F2F2F2',position:'relative'}}>
                <div style={{backgroundColor: "#FFA467",borderBottomRightRadius:100, width:"50%",height:"15%",position: "absolute",top: 0,left: 0}}></div>
                    <h1 style={{color:"#2f2f2f"}}>{m.project_description02()}</h1>
                    <h2 style={{color:"#2f2f2f"}}>{m.project_description03()}</h2>
                <div style={{backgroundColor: "#FFA467",width:"50%",borderTopLeftRadius:100,height:"15%",position: "absolute",bottom: 0,right: 0}}></div>
            </div>

            <div className="container" style={{backgroundColor:'#ff8f45ff'}}>
                <h1 >{m.project_description04()}</h1>
                <h2>{m.project_description05()}</h2>
            </div>
            <div className="container">
                <h1 style={{color:"#2f2f2f"}}>{m.project_description06()}</h1>
                <h2 style={{color:"#2f2f2f"}}>{m.project_description07()}</h2>
                <Link to="/register" className="btn mt-5 w-25 custom-btn">{m.register()}</Link>
            </div>
            <button onClick={()=>{return(getLocale()==="en"?setLocale("th"):setLocale("en"))}}>Change Language</button>
        </>
    )
}
export default HomePage