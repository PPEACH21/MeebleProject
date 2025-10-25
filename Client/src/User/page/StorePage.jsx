  import { useState, useEffect } from "react";
  import axios from "@/api/axios";
  import Navbar from "../component/Nav";  
  import SidebarType from "../component/SidebarType.jsx";
  import {m} from '@/paraglide/messages.js'
  import StoreCard from "../component/StoreCard.jsx";
  import '@css/pages/StorePage.css'

  const StorePage = () => {
    const [data, setData] = useState([]);
    const [datashow, setDataShow] = useState([]);
    const [search, setSearch] = useState("");
    
    const [type,setType]= useState([
      {
        name:"Appetizer",
        active:false,
      },
      {
        name:"Beverage",
        active:false,
      },
      {
        name:"Fast food",
        active:false,
      },
      {
        name:"Main course",
        active:false,
      },
      {
        name:"Dessert",
        active:false,
      },
    ])

    const [shopOpen,setshopOpen] = useState(false)
    const [rate,setRate] = useState(false)
    const [near,setNear] = useState(false)
    const [favorites,setFavorites] = useState(false)


  const getshop = async () => {
    try {
      const res = await axios.get("/Shop", { withCredentials: true });
      setData(res.data);
      setDataShow(res.data);
    } catch (err) {
      console.error("Error fetching shops:", err);
    }
  };

  useEffect(() => {
    getshop();
  }, []);

  useEffect(() => {
    // 🔒 ปิดการเลื่อนของทั้งหน้า เมื่อเข้า MenuStore
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // ✅ คืนค่ากลับตอนออกจากหน้านี้
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);
  useEffect(() => {
    const activeType = type.find((t) => t.active)?.name || "";
    filterData(search, activeType);
  }, [shopOpen, rate, near, favorites, type]);

  const filterData = (searchValue, selectedType) => {
    let filtered = data;

    if (selectedType) {
      filtered = filtered.filter(
        (shop) => shop.type?.toLowerCase() === selectedType.toLowerCase()
      );
    }

    if (searchValue) {
      filtered = filtered.filter((shop) =>
        shop.shop_name.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    if (shopOpen) {
      filtered = filtered.filter((shop) => shop.status === true);
    }

    if (rate) {
      filtered = [...filtered].sort((a, b) => b.rate - a.rate);
    }
    setDataShow(filtered);
  };

  const handleTypeClick = (index) => {
    const newType = type.map((item, i) => ({
      ...item,
      active: i === index ? !item.active : false,
    }));
    setType(newType);

    const activeType = newType.find((t) => t.active)?.name || "";
    filterData(search, activeType);
  };

  const SearchSubmit = () => {
    const activeType = type.find((t) => t.active)?.name || "";
    filterData(search, activeType);
  };

  return (
    <div>
      <Navbar />
      <div className="mainLayout">
        <SidebarType type={type} TypeClick={handleTypeClick} />

        <div className="navHorizon">
          <div className="search">
            <h1>{m.choose_restaurant()}</h1>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button onClick={SearchSubmit}>
              <i className="fa fa-search"></i>
            </button>
          </div>

          <div className="setcenterNF">
            <div className="filter">
              <div
                className="rowset"
                style={{
                  display: "flex",
                  justifyContent: "space-evenly",
                  alignItems: "center",
                }}
              >
                <p>{m.sort()}</p>

                <button
                  className="btn1"
                  onClick={() => setshopOpen(!shopOpen)}
                  style={{
                    backgroundColor: shopOpen ? "#FFA467" : "#fff",
                    color: shopOpen ? "#fff" : "#FFA467",
                  }}
                >
                  {m.open()}
                </button>

                <button
                  className="btn1"
                  onClick={() => setRate(!rate)}
                  style={{
                    backgroundColor: rate ? "#FFA467" : "#fff",
                    color: rate ? "#fff" : "#FFA467",
                  }}
                >
                  {m.popular()}
                </button>

                <button
                  className="btn1"
                  onClick={() => setNear(!near)}
                  style={{
                    backgroundColor: near ? "#FFA467" : "#fff",
                    color: near ? "#fff" : "#FFA467",
                  }}
                >
                  {m.near()}
                </button>

                <button
                  className="btn1"
                  onClick={() => setFavorites(!favorites)}
                  style={{
                    backgroundColor: favorites ? "#FFA467" : "#fff",
                    color: favorites ? "#fff" : "#FFA467",
                  }}
                >
                  {m.favorites()}
                </button>

                <button className="btn1" style={{ width: "30%" }}>
                  {m.pirce()} V
                </button>
              </div>
            </div>
          </div>

          <div className="shop">
            <StoreCard datashow={datashow} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorePage;
