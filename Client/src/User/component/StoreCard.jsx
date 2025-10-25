import { useNavigate } from "react-router-dom";

const StoreCard = ({datashow})=>{
    const handleSelectShop = (shop) => {
        console.log("navigate with vendor:", shop.vendor_id);
        navigate(`/menu/${shop.vendor_id}`, {state: {shop}});
    };

    const navigate = useNavigate();
    return(
        <div className="card-grid">
            {datashow.map((item, index) => (
                <div className="card" key={index} style={{ margin: "10px", padding: "10px" }}>
                <div className="position">
                    <img width="250px" height="200px" 
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
                                maxWidth: "240px",
                                }}
                            >
                                <b>Description:</b> {item.description}
                            </p>
                            <p>
                                <b>Status : </b>
                                <span style={{ color: item.status ? "green" : "red", fontWeight: 600 }}>{item.status ? "Open" : "Close"}
                                </span>
                            </p>
                            <p><b>Type:</b> {item.type}</p>
                            </div>
                        </div>
                        </div>
                    </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "20%" }}>
                    <button className="btn" onClick={() => handleSelectShop(item)}>reserve</button>
                    <button className="btn">order</button>
                    </div>
                </div>
                
                </div>
            ))}
        </div>
    )
}

export default StoreCard;