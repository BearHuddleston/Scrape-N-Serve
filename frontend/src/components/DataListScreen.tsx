import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchData, selectScrapedData, selectDataLoading } from '../../services/dataSlice';
import { AppDispatch } from '../../services/store';
import { ScrapedItem } from '../../services/apiService';

const DataListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const scrapedData = useSelector(selectScrapedData);
  const isLoading = useSelector(selectDataLoading);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Load data when component mounts
    loadData();
  }, []);

  const loadData = () => {
    dispatch(fetchData());
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchData());
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const renderItem = (item: ScrapedItem) => (
    <div className="data-item" key={item.id}>
      <div className="data-item-image">
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.title}
            onError={(e) => {
              // If image fails to load, replace with placeholder
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YxZjFmMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNHB4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
            }}
          />
        ) : (
          <div className="placeholder">No Image</div>
        )}
      </div>
      
      <div className="data-item-content">
        <h3>{item.title}</h3>
        <p className="description">{item.description}</p>
        
        {item.price > 0 && (
          <p className="price">${item.price.toFixed(2)}</p>
        )}
        
        <p className="date">
          Scraped on: {formatDate(item.scraped_at)}
        </p>
        
        <a 
          href={item.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="url-button"
        >
          View Source
        </a>
      </div>
    </div>
  );

  return (
    <div className="data-screen">
      <div className="card-header">
        <h2>Scraped Data</h2>
        <button 
          className="button secondary" 
          onClick={handleRefresh}
          disabled={isLoading || refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {isLoading && !refreshing ? (
        <div className="loading-container">
          <div className="loading">Loading data...</div>
        </div>
      ) : scrapedData.length === 0 ? (
        <div className="empty-container">
          <p className="empty-text">No scraped data available</p>
          <button className="button primary" onClick={loadData}>
            Refresh
          </button>
        </div>
      ) : (
        <div className="data-list">
          {scrapedData.map(renderItem)}
        </div>
      )}
    </div>
  );
};

export default DataListScreen;