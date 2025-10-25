import { m } from "@/paraglide/messages";

const SidebarType = ({type,TypeClick})=>{
    return(
        <div className="navVertical">
            <h1>{m.Typefood()}</h1>
            <div className="columnset" style={{width:"100%",alignItems:'center',gap:20}}>
                {type.map((item,index)=>(
                <button 
                    key={index}
                    className="btn1" 
                    style={{
                    width: "70%",
                    backgroundColor: item.active ? "#FFA467" : "#fff", // เปลี่ยนสีเวลา active
                    color : item.active ? "#fff" : "#FFA467", // เปลี่ยนสีเวลา active
                    }} 
                    onClick={()=>TypeClick(index)}
                >
                    {item.name}
                </button>
                ))}
            </div>
        </div>
    )
}

export default SidebarType;