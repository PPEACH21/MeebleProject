import "@css/pages/Setting.css"
import {m} from '@/paraglide/messages.js'
import { BiChevronRight } from "react-icons/bi";
import { useContext ,useEffect,useState} from "react";
import {AuthContext} from "@/context/ProtectRoute"
import { useNavigate } from "react-router-dom";
import "@css/pages/StorePage.css";

export const Buttonselect=({name="button" ,path="/"})=>{
    return(
        <button className="boxsetting" onClick={()=>Navigation(path)}> 
            <p>{name}</p>
            <BiChevronRight  size={30}/>
        </button>
    )
}

const SettingPage = ()=>{
    const [Firstname,setFirstname]=useState("")
    const [Lastname,setLastname]=useState("")
    const [username,setUsername]=useState("username")
    const [email,setEmail]=useState("email@gmail.com")
    const [phone,setPhone]=useState("")
    const [photoURL, setPhotoURL] = useState("https://i.ibb.co/ZpCpKSMG/image.png");

    Navigation = useNavigate();

    const {Profile,logout} =  useContext(AuthContext)
    useEffect(()=>{
        getdata();  
    },[])
    
    const getdata=()=>{
        setFirstname(Profile.Firstname)
        setLastname(Profile.Lastname)
        setUsername(Profile.username)
        setEmail(Profile.Email)
        setPhone(Profile.Phone)
        if (Profile.Avatar) setPhotoURL(Profile.Avatar);
    }

    const maskPhone = (phone) => {
        if (!phone) return "XXXXXXXX";
        return phone.length > 4 ? "XXXXXX" + phone.slice(-4) : "XXXXXXXX";
    };

    return(
        <div style={{flexDirection:'column', alignItems:'center', margin:'30px 70px'}}>
            <div className="columnset" style={{gap:'10px'}}>
                <h1 style={{marginTop:0}}>{m.Setting()}</h1>
                <div className="rowset setcenterNF" style={{padding:'30px', display:'flex',position:'sticky',top:0,zIndex: 1,background: 'linear-gradient(180deg, rgba(255,255,255,1) 92%, rgba(255,255,255,0))'}}>
                    <img src={photoURL} style={{width: "200px",height: "200px",borderRadius: 100,objectFit: "cover"}}/>
                    <div style={{margin:'0px 50px', fontSize:'18px', fontWeight:'bold', alignSelf:'center'}}>
                        <p>{Firstname} {Lastname}</p>
                        <p>{username}</p>
                        <p>{email}</p>
                        <p>{maskPhone(phone)}</p>
                    </div>
                </div>
                <Buttonselect name={m.Manage_Account()} path="/profile"/>
                <Buttonselect name={m.Language()} path="/language"/>
                <Buttonselect name={m.Address()} path="/addressSetting"/>
                <Buttonselect name={m.favoritesRestarant()} path="/shopFavorite"/>
                
                <h2 style={{color:'red' ,margin:'30px 70px'}} >sensitive</h2>
                <button className="boxsetting" style={{justifyContent:"center",color:"red"}} onClick={()=>logout()}> 
                    <p>{m.logout()}</p>
                </button>
                <button className="boxsetting" style={{justifyContent:"center",textAlign:'center',color:"red"}} onClick={()=>Navigation("/Delete Account")}> 
                    <p>{m.delete()} {m.account()}</p>
                </button>
            </div>
        </div>
    )
}
export default SettingPage;