import Button from 'react-bootstrap/Button';
import axios from '../api/axios.jsx';
import { useState ,useEffect} from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/ProtectRoute.jsx';

const MenuStore = () => {
    const [data, setData] =  useState([]);
    const [dataUser, setDatauser] =  useState([]);
    const getshop = async ()=>{
        try {
            const res = await axios.get("/Shop",{ withCredentials: true })
            console.log("API Response:", res.data)  
            setData(res.data)
        } catch (err) {
            console.error("Error fetching shops:", err)
        }
    }

    const getuserID= async()=>{
        try{
            const res = await axios.get(`/user/${auth.user_id}`,{withCredentials: true})
            setDatauser(res.data)
            console.log("API Response:", res.data)  

        }catch (err) {
            console.error("Error fetching user:", err)
        }
    }


    useEffect (()=>{
        getuserID()
        getshop()
    },[])
    
    const {auth} = useContext(AuthContext);

    return (
        <>  
            <div>
                <h1>username : {dataUser.username}</h1>
                <h1>cost : {dataUser.Cost}</h1>
            </div>
            {/* <Button onClick={getuserID}>click</Button> */}
            {data.map((item, index) => (
                <div key={index} style={{margin:"10px", padding:"10px"}}>
                    <Button >
                        <p><b>Name:</b> {item.shop_name}</p>
                        <p><b>Description:</b> {item.description}</p>
                        <p><b>Rate:</b> {item.rate}</p>
                        <p><b>Status:</b> {item.status ? "Active" : "Inactive"}</p>
                        <p><b>reserve_active:</b> {item.reserve_active ? "Active" : "Inactive"}</p>
                        <p><b>order_active:</b> {item.order_active ? "Active" : "Inactive"}</p>
                        <p><b>Type:</b> {item.type}</p>
                    </Button>
                </div>
            ))}
        </>
    );
}

export default MenuStore;