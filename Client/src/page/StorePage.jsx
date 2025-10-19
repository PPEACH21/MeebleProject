const StorePage = () => {
  return (
    <>
      <nav className="navHomePage">
        <div className="nav">
          <img
            src="https://i.ibb.co/MyMPRx3P/Chat-GPT-Image-Sep-23-2025-10-01-38-PM.jpg"
            alt="Logo"
          />
          <div className="navMenu">
            <h1>cost</h1>
            <h1>history</h1>
            <h1>username</h1>
          </div>
        </div>
      </nav>
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
            <input type="text" placeholder="Search..." />
            <button>
              <i class="fa fa-search"></i>
            </button>
          </div>
          <div className="filter"></div>
          <div className="shop">
            <div className="card-grid">
              <div className="card">
                <div className="image"></div>
              </div>
              <div className="card">
                <div className="image"></div>
              </div>
              <div className="card">
                <div className="image"></div>
              </div>
              <div className="card">
                <div className="image"></div>
              </div>
              <div className="card">
                <div className="image"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StorePage;
