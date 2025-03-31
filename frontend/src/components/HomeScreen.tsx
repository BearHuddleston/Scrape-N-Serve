import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerScraping } from '../../services/apiService';

interface ScrapeResult {
  status: 'success' | 'error' | 'pending';
  message: string;
}

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('https://en.wikipedia.org/wiki/Apollo_15');
  const [maxDepth, setMaxDepth] = useState('2');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setResult({ status: 'error', message: 'Please enter a valid URL' });
      return;
    }

    setIsLoading(true);
    setResult({ status: 'pending', message: 'Starting scraping...' });
    
    try {
      const response = await triggerScraping(url, parseInt(maxDepth));
      if (response.status === 'success') {
        setResult({ 
          status: 'success', 
          message: response.message || 'Scraping started successfully' 
        });
        
        // Poll the scraping status every 5 seconds
        const statusInterval = setInterval(async () => {
          try {
            const statusResp = await fetch('/api/scrape/status');
            const statusData = await statusResp.json();
            
            if (statusData.status === 'success' && !statusData.scraping) {
              clearInterval(statusInterval);
              setResult({ 
                status: 'success', 
                message: 'Scraping completed! Click "View Scraped Data" to see results.' 
              });
            }
          } catch (error) {
            console.error('Error checking scraping status:', error);
          }
        }, 5000);
        
        // Stop polling after 2 minutes (24 attempts)
        setTimeout(() => {
          clearInterval(statusInterval);
        }, 2 * 60 * 1000);
        
      } else {
        setResult({ 
          status: 'error', 
          message: response.message || 'Failed to start scraping' 
        });
      }
    } catch (error) {
      console.error('Error starting scraping:', error);
      setResult({ 
        status: 'error', 
        message: 'An error occurred while trying to start scraping' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToDataList = () => {
    navigate('/data');
  };

  return (
    <div className="home-screen">
      <div className="card">
        <h2>Web Scraper</h2>
        
        <form onSubmit={handleScrape}>
          <div className="form-group">
            <label htmlFor="url">Target URL:</label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL to scrape"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="maxDepth">Max Depth:</label>
            <input
              id="maxDepth"
              type="number"
              value={maxDepth}
              onChange={(e) => setMaxDepth(e.target.value)}
              min="1"
              max="5"
            />
          </div>

          <button 
            type="submit" 
            className="button primary" 
            disabled={isLoading}
          >
            {isLoading ? 'Starting...' : 'Start Scraping'}
          </button>
        </form>

        {result && (
          <div className={`result ${result.status}`}>
            {result.message}
          </div>
        )}

        <button 
          className="button secondary" 
          onClick={navigateToDataList}
        >
          View Scraped Data
        </button>
      </div>
    </div>
  );
};

export default HomeScreen;