import { Link } from 'react-router-dom';

function Home() {
  return (
    <>
      <div>
        <h1>Klifurmót</h1>
        <p>Rauntímastjórnun móta fyrir klifrara, dómara og stjórnendur</p>
      </div>

    
      <h5>Mót</h5>
      <Link to="/competitions">Skoða mót</Link>
    </>

  );
}

export default Home;
