import Navbar from "../component/Nav";
import { useContext } from "react";
import { AuthContext } from "../context/ProtectRoute";
const History=()=>{
    const {auth} = useContext(AuthContext);


    return(
        <>
            <Navbar/>
            <div style={{display:'flex',justifyContent:'center'}}>
                <div style={{width:'80%'}}>
                    <h1>History</h1>
                    <div style={{display:'flex',justifyContent:'center'}}>
                        <div style={{width:'80%'}}>
                            <div>
                                <h2>process</h2>
                                <div className="box" style={{backgroundColor:'#f2f2f2',padding:'5px 50px'}}>
                                    <div className="rowset" style={{width:'100%',justifyContent:'space-between',alignItems:'center'}}>
                                        <div className="coulmnset"style={{width:'100%',justifyContent:'space-evenly'}} >
                                            <div className="rowset" style={{gap:'20px' }} >
                                                <div style={{textAlign:'center'}}>
                                                    <p>ID</p>
                                                    <p>daspewq</p>
                                                </div>
                                                <div style={{textAlign:'center'}}>
                                                    <p>Date</p>
                                                    <p>20/10/2025</p>
                                                </div>
                                                <div style={{textAlign:'center'}}>
                                                    <p>Type</p>
                                                    <p>online</p>
                                                </div>
                                                
                                            </div>
                                            <p>store: SHop 3items</p>
                                        </div>
                                        <div>
                                            <div className="rowset" style={{gap:'10px',alignItems:'center'}}>
                                                <div style={{textAlign:'center'}}>
                                                    <p>Status</p>
                                                    <p>Open</p>
                                                </div>
                                                <button className="btn1" style={{width:'30vh',height:'7vh'}}>more</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h2>Complete</h2>
                                <div className="box">
                                    <div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default History;