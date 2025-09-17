import Button from 'react-bootstrap/Button';
import { m } from '../paraglide/messages.js'
const Home = () => {
    return (
        <div className="bg-body-tertiary p-5 border-5">
            <h1>Welcome to Meeble Project</h1>
            <h2>Vite + Bootstrap + react</h2>
            <p>Your one-stop solution for managing your tasks efficiently.</p>
            <p>{m.example_message({username:"PPEACH"})}</p>
            <Button variant="primary" onClick={()=>{console.log("CLICK")}}>Primary</Button>
        </div>
    );
};

export default Home;