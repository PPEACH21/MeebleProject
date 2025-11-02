import { Link } from "react-router-dom"
import {m} from '@/paraglide/messages.js'
const HomePage= () =>{
    return(
        <div className="container">
            <div className="bg-image1">
                <div className="setcenter" >
                    <div className="columnset" style={{width:"60%",height:"60%",justifyContent: "space-between",}}>
                        <div>

                            <h1 style={{color:'white', fontSize:70}}>{m.projectname().toUpperCase()}</h1>
                            <h4 style={{marginLeft:50,color:'white',fontSize:30}}>{m.project_description01()}</h4>
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
                    <div className="setcenter">
                        <h1 style={{color:"#2f2f2f",fontSize:60}}>{m.project_description02()}</h1>
                        <p style={{color:"#2f2f2f",fontSize:30}}>{m.project_description03()}</p>
                    </div>
                <div style={{backgroundColor: "#FFA467",width:"50%",borderTopLeftRadius:100,height:"15%",position: "absolute",bottom: 0,right: 0}}></div>
            </div>

            <div className="container" style={{backgroundColor:'#FFA467',position:'relative'}}>
                <div style={{backgroundColor: "#ff8f45ff",width:"100%",height:"15%",position: "absolute",top: 0}}></div>
                <div className="setcenter">
                    <h1 style={{color:"#f2f2f2",fontSize:60}}>{m.project_description04()}</h1>
                    <p style={{color:"#f2f2f2",fontSize:30}}>{m.project_description05()}</p>
                </div>
                <div style={{backgroundColor: "#ff8f45ff",width:"100%",height:"15%",position: "absolute",bottom:0}}></div>
            </div>

            <div className="container" style={{backgroundColor:'#F2F2F2',position:'relative'}}>
                <div className="setcenter">
                    <h1 style={{color:"#2f2f2f",fontSize:60}}>{m.project_description06()}</h1>
                    <p style={{color:"#2f2f2f",fontSize:30}}>{m.project_description07()}</p>
                    <Link to="/register" className="btn" style={{marginTop:70,width:"20%",height:"5%"}}>{m.register()}</Link>
                </div>
            </div>
        </div>
    )
}
export default HomePage