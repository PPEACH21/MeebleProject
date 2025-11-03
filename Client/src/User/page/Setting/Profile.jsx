import { useState,useContext, useEffect,useRef } from "react";
import { AuthContext } from "@/context/ProtectRoute";
import axios from "@/api/axios";

const InputField = ({ value = "", setValue, readOnly }) => {
    return (
        <input
            className="textInput1"
            style={readOnly ? { backgroundColor: "#e6e6e6ff" } : {}}
            placeholder="-"
            value={value}
            onChange={!readOnly ?  (e) => setValue(e.target.value): undefined}
            readOnly={readOnly}
        />
    );
};


const Profile = ()=>{
    const [editmode,setEditmode]= useState(false);

    const [Firstname,setFirstname]=useState("")
    const [Lastname,setLastname]=useState("")
    const [username,setUsername]=useState("username")
    const [email,setEmail]=useState("email@gmail.com")
    const [phone,setPhone]=useState("")
    const [photoURL, setPhotoURL] = useState("https://i.ibb.co/ZpCpKSMG/image.png");
    const [loadingUpload, setLoadingUpload] = useState(false);
    const fileInputRef = useRef(null);
    const {Profile,auth} =  useContext(AuthContext)
    
    useEffect(()=>{
        getdata();  
    },[])

    const getdata=async()=>{
        setFirstname(Profile.Firstname)
        setLastname(Profile.Lastname)
        setUsername(Profile.Username)
        setEmail(Profile.Email)
        setPhone(Profile.Phone)
        setPhotoURL(Profile.Avatar)
    }

    const handleSave = async () => {
        try {
        const updatedData = {
            Firstname,
            Lastname,
            phone,
            Avatar:photoURL,
        };

        const res = await axios.put(`/profile/${auth.user_id}`, updatedData, {
            withCredentials: true,
        });

        console.log("Profile updated:", res.data);
        alert("Profile updated successfully!");
        } catch (err) {
        console.error("Update failed:", err);
        alert("Failed to update profile!");
        }
    };

       const compressImage =async(file, quality = 0.7) =>{
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {

            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);

                canvas.toBlob(
                (blob) => resolve(blob),
                "image/jpeg",
                quality
                );
            };
            };
        });
    }

    const UploadPicture = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const compressed = await compressImage(file, 0.4);
        setLoadingUpload(true);
        const formData = new FormData();
        formData.append("image", compressed);

        try {
            // console.log("IMGBB KEY:", apiKey);
            const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                const url = data.data.url;
                setPhotoURL(url);
                console.log("Uploaded image URL:", url);
            } else {
                throw new Error("Upload failed");
            }
        } catch (err) {
            console.error("❌ Upload failed:", err);
            alert("Failed to upload image!");
        } finally {
            setLoadingUpload(false);
        }
    };


    return(
        <div className="columnset setcenterNF" style={{alignItems:'center', margin:'70px'}}>
            <div>
                
                <h1 style={{marginTop:0}}>Profile</h1>
            </div>
            
            
            <div style={{ position: "relative" }}>
                <img src={photoURL}
                    style={{
                        width: "200px",
                        height: "200px",
                        borderRadius: 100,
                        objectFit: "cover",
                        cursor: editmode ? "pointer" : "default",
                        opacity: loadingUpload ? 0.4 : 1,
                    }}
                    onClick={() => {
                        if (editmode && !loadingUpload) fileInputRef.current.click();
                    }}
                />
                {loadingUpload && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "rgba(0,0,0,0.5)",
                        color: "white",
                        padding: "10px 20px",
                        borderRadius: "10px",
                    }}
                >
                    Uploading...
                </div>
                )}
            </div>
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={UploadPicture}
            />
            <div className="columnset" style={{gap:"30px",marginTop:"50px"}}>
                <div className="rowset" style={{gap:"20px"}}>
                    <p>Firstname</p>
                    <InputField value={Firstname} setValue={setFirstname} readOnly={!editmode}/>
                    <p>Lastname</p>
                    <InputField value={Lastname} setValue={setLastname} readOnly={!editmode}/>
                </div>
                <div className="rowset" style={{gap:"20px"}}>
                    <p>Phone</p>
                    <InputField value={phone} setValue={setPhone} readOnly={!editmode}/>
                    <p>username</p>
                    <InputField value={username} readOnly/>

                </div>
                <div className="rowset" style={{gap:"20px"}}>
                    <p>email</p>
                    <InputField value={email} readOnly={true}/>
                </div>
                <div className="rowset setcenterNF">
                    {editmode && 
                        <button className="btn1" title="Cancel" style={{width:'100%'}}
                            onClick={()=>setEditmode(!editmode)}
                        >Cancel</button>
                    }
                    <button className="btn" title="Edit" style={{width:'100%', borderRadius:'20px'}} 
                        onClick={async () => {
                        if (editmode) {
                        await handleSave();
                        }
                        setEditmode(!editmode);
                    }}>{!editmode?"Edit":"Save"}</button>
                </div>
            </div>
        </div> 
    )
}

export default Profile;