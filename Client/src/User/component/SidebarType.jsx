import { m } from "@/paraglide/messages";

const SidebarType = ({type,TypeClick})=>{
    return(
         <div className="navVertical fade-slideDown">
            <h2>{m.Typefood()}</h2>
            <div className="columnset" style={{width:"100%",alignItems:'center',gap:10}}>
                
                {type.map((item,index)=>{
                return(
                    <button 
                        key={index}
                        className="btn1" 
                        style={{
                            width: "95%",
                            backgroundColor: item.active ? "#FFA467" : "",
                            color : item.active ? "#fff" : "",
                            justifyContent:'flex-start',
                            gap:20,
                            padding :"12px 25px",
                        }} 
                        onClick={()=>TypeClick(index)}
                    >
                        <div style={{scale:2,display:'flex',alignSelf:'center',justifyContent:'center'}}>
                            {item.icon}
                        </div>
                        {item.name}
                    </button>
                )
                })}
            </div>
        </div>
    )
}

export default SidebarType;