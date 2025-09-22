import Button from 'react-bootstrap/Button';
import axios from '../api/axios.jsx';
import { useState ,useEffect} from 'react';

const MenuStore = () => {
    const [data, setData] =  useState([]);
    const getshop = async ()=>{
        try {
            const res = await axios.get("/getShop",{ withCredentials: true })
            console.log("API Response:", res.data)  
            setData(res.data)
        } catch (err) {
            console.error("Error fetching shops:", err)
        }

    }
    useEffect (()=>{
        getshop()
    },[])
    

    return (
        <>
            {data.map((item, index) => (
                <div key={index} style={{margin:"10px", padding:"10px"}}>
                    <Button >
                        <p><b>Description:</b> {item.description}</p>
                        <p><b>Name:</b> {item.name}</p>
                        <p><b>Rate:</b> {item.rate}</p>
                        <p><b>Status:</b> {item.status ? "Active" : "Inactive"}</p>
                        <p><b>Type:</b> {item.type}</p>
                    </Button>
                </div>
            ))}
        </>
    );
}

export default MenuStore;