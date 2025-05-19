import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    password2: '',
    gender: '',
    date_of_birth: '',
    nationality: '',
    height_cm: '',
    wingspan_cm: '',
  });

  const [countries, setCountries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await api.get('accounts/countries/');
        setCountries(response.data);
        const iceland = response.data.find(c => c.name_en === 'Iceland');
        if (iceland) {
          setFormData(prev => ({ ...prev, nationality: iceland.code }));
        }
      } catch (err) {
        console.error('Failed to load countries:', err);
      }
    };
    fetchCountries();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      setError('Full name is required.');
      return;
    }

    if (formData.password !== formData.password2) {
      setError('Passwords do not match.');
      return;
    }

    console.log('Payload being sent:', formData);

    try {
      await api.post('accounts/register/', formData);
      navigate('/login');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        'Registration failed.';
      console.error('Registration failed:', msg);
      setError(msg);
    }
  };

  return (
    <div className="register-container">
      <h2>Nýskráning</h2>
      <form onSubmit={handleSubmit} className="register-form">
        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div className="form-group">
          <label>Notendanafn</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Fullt nafn</label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Netfang</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Lykilorð</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Staðfesta lykilorð</label>
          <input
            type="password"
            name="password2"
            value={formData.password2}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Kyn</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            required
          >
            <option value="">Select gender</option>
            <option value="KK">KK</option>
            <option value="KVK">KVK</option>
          </select>
        </div>

        <div className="form-group">
          <label>Fæðingardagur</label>
          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Þjóðerni</label>
          <select
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
            required
            >
            <option value="">Select country</option>
            {countries.map((country) => (
                <option key={country.country_code} value={country.country_code}>
                {country.name_en}
                </option>
            ))}
            </select>
        </div>

        <div className="form-group">
          <label>Hæð (cm)</label>
          <input
            type="number"
            name="height_cm"
            value={formData.height_cm}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Vænghaf (cm)</label>
          <input
            type="number"
            name="wingspan_cm"
            value={formData.wingspan_cm}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <button type="submit">Register</button>
        </div>
      </form>
    </div>
  );
}

export default Register;
