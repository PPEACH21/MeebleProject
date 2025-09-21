import { Link } from "react-router-dom"
const HomePage =()=>{
    return(
        <div>
            <h2>Meeble Project</h2>
            <Link to="/login">Click to Login</Link>
        </div>
    )
}
export default HomePage