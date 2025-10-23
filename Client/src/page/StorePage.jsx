import { useState,useEffect } from "react";
import axios from "../api/axios";
import Navbar from "../component/Nav";
import { useNavigate } from "react-router-dom";
const StorePage = () => {
  const [data, setData] =  useState([]);
  const [datashow, setDataShow] =  useState([]);
  const [search,setSearch] = useState("");

  const navigate = useNavigate(); 
  const getshop = async ()=>{
      try {
          const res = await axios.get("/Shop",{ withCredentials: true })
          console.log("API Response:", res.data)  
          setData(res.data)
          setDataShow(res.data)
      } catch (err) {
          console.error("Error fetching shops:", err)
      }
  }

  const SearchSubmit =()=>{
    const filter = data.filter((item)=>item.shop_name.toLowerCase().includes(search.toLowerCase()))
    setDataShow(filter);
    // console.log(`filterSet`)
    // console.log(filter)
  }

  const handleSelectShop = (shop) => {
    // alert(`ร้านที่เลือก: ${shop.shop_name}\nVendor ID: ${shop.vendor_id}`);
    
    navigate(`/menu/${shop.vendor_id}`)
  };

  useEffect (()=>{
      getshop()
  },[])

  return (
    <>
      <Navbar/>
      <div className="mainLayout">
        <div className="navVertical">
          <h1>Menu Type</h1>
          <button className="foodBtn">ตามสั่ง</button>
          <button className="foodBtn">ตามสั่ง</button>
          <button className="foodBtn">ตามสั่ง</button>
          <button className="foodBtn">ตามสั่ง</button>
        </div>

        {/*ฝั่งขวา*/}
        <div className="navHorizon">
          <div className="search">
            <h1>Select Store</h1>
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button onClick={SearchSubmit}>
              <i class="fa fa-search"></i>
            </button>
          </div>
          <div className="filter"></div>
          <div className="shop">
             <div className="card-grid">
              {datashow.map((item, index) => (
                <div className="card" key={index} style={{margin:"10px", padding:"10px"}}>
                  <div className="position">
                      <img width="250px" height="150px" 
                          style={{objectFit: "cover",borderRadius:"10px",}}
                          src="https://static.vecteezy.com/system/resources/previews/022/059/000/non_2x/no-image-available-icon-vector.jpg"
                      />
                      <div>
                        <div className="position">
                          <div>
                            <h2 style={{
                                margin:-2,
                                WebkitLineClamp: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap", 
                                maxWidth: "240px"
                            }}>{item.shop_name}</h2>
                            <div className="position2">
                              <div>
                                <p><b>Rate:</b> {item.rate}</p>
                                <p><b>Price:</b> </p>
                                <p><b>Distance:</b> </p>
                              </div>
                              <div>
                                <p style={{
                                  WebkitLineClamp: 2,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "pre-wrap",
                                  maxWidth: "240px"
                                }}
                                >
                                <b>Description:</b> {item.description}
                                </p>
                                <p><b>Status:</b> {item.status ? "Open" : "Close"}</p>
                                <p><b>vendor:</b> {item.vendor_id}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{display:"flex",flexDirection:'column',gap:'20px', width:'20%'}}>
                        <button className="btn" onClick={()=>handleSelectShop(item)}>reserve</button>
                        <button className="btn">order</button>
                      </div>
                  </div>
                </div>

                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StorePage;
