import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import HomeScreen from './components/HomeScreen';
import DataListScreen from './components/DataListScreen';

const App: React.FC = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Scrape-N-Serve</h1>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/data">Scraped Data</Link>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/data" element={<DataListScreen />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;