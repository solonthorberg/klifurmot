import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="display-4">Klifurmót</h1>
        <p className="lead">Real-time competition management for climbers, judges, and admins.</p>
      </div>

      <div className="row justify-content-center g-4">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Browse Competitions</h5>
              <p className="card-text">View live competitions, categories, start lists, and results.</p>
              <Link to="/competitions" className="btn btn-primary">Explore</Link>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Log In</h5>
              <p className="card-text">Are you a judge or admin? Log in to manage or score rounds.</p>
              <Link to="/login" className="btn btn-outline-primary">Login</Link>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Register</h5>
              <p className="card-text">Create your account to participate as a climber or judge.</p>
              <Link to="/register" className="btn btn-outline-secondary">Sign Up</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
