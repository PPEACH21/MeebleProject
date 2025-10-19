import Button from 'react-bootstrap/Button';
import axios from '../api/axios.jsx';
import { useState ,useEffect} from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/ProtectRoute.jsx';
import Navbar from '../component/Nav.jsx';

const MenuStore = () => {

    return (
        <>  
            <Navbar/>
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