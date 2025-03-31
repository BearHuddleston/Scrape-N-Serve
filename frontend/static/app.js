// Configuration
const config = {
    apiBaseUrl: '',  // Using empty string to trigger relative URL handling
    apiPrefix: '/api/v1',
    defaultItemsLimit: 10,
    refreshInterval: 60000  // 1 minute
};

// DOM Elements
const apiStatusElement = document.getElementById('apiStatus');
const checkApiButton = document.getElementById('checkApi');
const scrapeForm = document.getElementById('scrapeForm');
const scrapeResultElement = document.getElementById('scrapeResult');
const fetchDataButton = document.getElementById('fetchData');
const dataStatsElement = document.getElementById('dataStats');
const dataListElement = document.getElementById('dataList');
const paginationElement = document.getElementById('pagination');

// State
let currentPage = 1;
let itemsPerPage = config.defaultItemsLimit;
let totalItems = 0;

// API Functions
async function apiRequest(endpoint, options = {}) {
    try {
        const url = `${config.apiBaseUrl}${config.apiPrefix}${endpoint}`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            ...options
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API error (${response.status}): ${errorText}`);
            return {
                status: 'error',
                message: `Server responded with status: ${response.status}`
            };
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        return {
            status: 'error',
            message: 'Network request failed'
        };
    }
}

async function checkApiStatus() {
    apiStatusElement.textContent = 'Checking API status...';
    apiStatusElement.className = 'status pending';

    try {
        const response = await fetch(`${config.apiBaseUrl}/health`);
        const data = await response.json();

        if (data.status === 'up') {
            apiStatusElement.textContent = `API is up and running! Server time: ${new Date(data.time).toLocaleString()}`;
            apiStatusElement.className = 'status success';
        } else {
            apiStatusElement.textContent = 'API is not responding correctly.';
            apiStatusElement.className = 'status error';
        }
    } catch (error) {
        apiStatusElement.textContent = `Failed to connect to API: ${error.message}`;
        apiStatusElement.className = 'status error';
    }
}

async function triggerScraping(url, maxDepth) {
    const options = { url };
    if (maxDepth) {
        options.max_depth = parseInt(maxDepth);
    }

    return apiRequest('/scrape', {
        method: 'POST',
        body: JSON.stringify(options)
    });
}

async function fetchScrapedData(limit = itemsPerPage, offset = (currentPage - 1) * itemsPerPage) {
    return apiRequest(`/data?limit=${limit}&offset=${offset}&sort=scraped_at&order=desc`);
}

async function getScrapingStats() {
    return apiRequest('/data/stats');
}

// UI Functions
function displayScrapedData(items, total) {
    dataListElement.innerHTML = '';
    totalItems = total || 0;

    if (!items || items.length === 0) {
        dataListElement.innerHTML = '<p>No data found.</p>';
        return;
    }

    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'data-item';

        const title = document.createElement('h3');
        title.textContent = item.title || 'No Title';
        
        const url = document.createElement('a');
        url.href = item.url;
        url.target = '_blank';
        url.className = 'data-item-url';
        url.textContent = item.url;

        const description = document.createElement('p');
        description.textContent = item.description || 'No description';

        const meta = document.createElement('div');
        meta.className = 'data-item-meta';
        meta.textContent = `Scraped at: ${new Date(item.scraped_at).toLocaleString()}`;

        itemElement.appendChild(title);
        itemElement.appendChild(url);
        itemElement.appendChild(description);
        itemElement.appendChild(meta);

        dataListElement.appendChild(itemElement);
    });

    // Update pagination
    updatePagination(totalItems, itemsPerPage, currentPage);
}

function updatePagination(total, limit, current) {
    const totalPages = Math.ceil(total / limit);
    paginationElement.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    if (current > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.addEventListener('click', () => {
            currentPage--;
            loadData();
        });
        paginationElement.appendChild(prevButton);
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        if (i === current) {
            pageButton.className = 'active';
        }
        pageButton.addEventListener('click', () => {
            currentPage = i;
            loadData();
        });
        paginationElement.appendChild(pageButton);
    }

    // Next button
    if (current < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.addEventListener('click', () => {
            currentPage++;
            loadData();
        });
        paginationElement.appendChild(nextButton);
    }
}

async function loadData() {
    try {
        // First get stats
        const statsResponse = await getScrapingStats();
        if (statsResponse.status === 'success' && statsResponse.data) {
            const { total_items, latest_scrape } = statsResponse.data;
            dataStatsElement.innerHTML = `
                <strong>Total Items:</strong> ${total_items} | 
                <strong>Latest Scrape:</strong> ${latest_scrape ? new Date(latest_scrape).toLocaleString() : 'Never'}
            `;
        }

        // Then get data
        const dataResponse = await fetchScrapedData();
        if (dataResponse.status === 'success') {
            displayScrapedData(dataResponse.data, dataResponse.total);
        } else {
            dataListElement.innerHTML = `<p>Error loading data: ${dataResponse.message || 'Unknown error'}</p>`;
        }
    } catch (error) {
        dataListElement.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

// Event Listeners
checkApiButton.addEventListener('click', checkApiStatus);

scrapeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const url = document.getElementById('url').value;
    const maxDepth = document.getElementById('maxDepth').value;
    
    scrapeResultElement.textContent = 'Starting scraping...';
    scrapeResultElement.className = 'result status pending';
    
    try {
        const result = await triggerScraping(url, maxDepth);
        console.log('Scraping API response:', result);
        
        if (result && result.status === 'success') {
            scrapeResultElement.textContent = `Success: ${result.message || 'Scraping started successfully'}`;
            scrapeResultElement.className = 'result status success';
            
            // Add automatic status checking
            let checkCount = 0;
            const statusInterval = setInterval(async () => {
                try {
                    const statusResp = await apiRequest('/scrape/status');
                    console.log('Status check:', statusResp);
                    
                    if (statusResp && statusResp.status === 'success') {
                        if (!statusResp.scraping) {
                            clearInterval(statusInterval);
                            scrapeResultElement.textContent = 'Scraping complete! Click "Fetch Data" to see results.';
                        } else {
                            scrapeResultElement.textContent = `Scraping in progress... (${checkCount + 1})`;
                        }
                    }
                    
                    // Stop checking after 30 attempts (5 minutes)
                    checkCount++;
                    if (checkCount > 30) {
                        clearInterval(statusInterval);
                    }
                } catch (err) {
                    console.error('Status check error:', err);
                }
            }, 10000); // Check every 10 seconds
            
        } else {
            scrapeResultElement.textContent = `Error: ${result?.message || 'Failed to start scraping'}`;
            scrapeResultElement.className = 'result status error';
        }
    } catch (error) {
        console.error('Scraping error:', error);
        scrapeResultElement.textContent = `Error: ${error.message}`;
        scrapeResultElement.className = 'result status error';
    }
});

fetchDataButton.addEventListener('click', loadData);

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    checkApiStatus();
});