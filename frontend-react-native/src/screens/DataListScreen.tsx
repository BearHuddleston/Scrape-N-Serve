import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, Linking, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Text, Button, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { fetchScrapedData } from '../services/dataSlice';
import { ScrapedItem } from '../services/apiService';
import { RootState, AppDispatch } from '../services/store';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../services/config';

const DataListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, totalItems, loading, error } = useSelector((state: RootState) => state.data);
  
  const [refreshing, setRefreshing] = useState(false);
  const [limit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(DEFAULT_OFFSET);
  const [sort] = useState('scraped_at');
  const [order] = useState('desc');

  // Get scraping status from the store
  const { scraping, loading: scrapingLoading } = useSelector((state: RootState) => state.data);
  
  // Load data when component mounts or when needed
  useEffect(() => {
    console.log('DataListScreen: Loading data with params:', { limit, offset, sort, order });
    loadData();
  }, [dispatch, limit, offset, sort, order]);
  
  // Auto-refresh when scraping completes - only track when scraping changes from true to false
  useEffect(() => {
    // Store previous scraping state
    const prevScrapingRef = React.useRef(scraping);
    
    // Only refresh data when scraping transitions from true to false (just completed)
    if (prevScrapingRef.current === true && scraping === false) {
      console.log('DataListScreen: Scraping just completed, refreshing data');
      loadData();
    }
    
    // Update the ref with current value for next render
    prevScrapingRef.current = scraping;
  }, [scraping, dispatch]);

  const loadData = () => {
    console.log('DataListScreen: Dispatching fetchScrapedData');
    dispatch(fetchScrapedData({ limit, offset, sort, order }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const loadMore = () => {
    if (items.length < totalItems && !loading) {
      setOffset(offset + limit);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    if (!item) {
      console.error('Received null or undefined item');
      return null;
    }

    console.log('Rendering item:', item);
    
    // Parse the metadata if it exists
    let metadata: any = {};
    if (item.metadata) {
      try {
        if (typeof item.metadata === 'string') {
          metadata = JSON.parse(item.metadata);
        } else if (typeof item.metadata === 'object') {
          metadata = item.metadata;
        }
      } catch (error) {
        console.error('Error parsing metadata:', error);
      }
    }

    // Handle various field mappings between camelCase and PascalCase
    const fieldsMapping = {
      // Field name in response: possible alternative field names
      "scraped_at": ["scraped_at", "ScrapedAt", "scrapedAt", "created_at", "CreatedAt"],
      "title": ["title", "Title", "name", "Name"],
      "description": ["description", "Description", "desc", "Desc", "content", "Content"],
      "price": ["price", "Price", "cost", "Cost", "value", "Value"],
      "url": ["url", "URL", "Url", "link", "Link"],
      "image_url": ["image_url", "ImageURL", "ImageUrl", "imageURL", "imageUrl", "image", "Image"],
      "id": ["id", "ID", "Id", "_id", "identity"]
    };

    // Helper function to get the first valid value from an object based on possible field names
    const getFieldValue = (obj: any, possibleFields: string[], defaultValue: any) => {
      for (const field of possibleFields) {
        if (obj[field] !== undefined) {
          return obj[field];
        }
      }
      return defaultValue;
    };

    // Extract all fields with fallbacks
    const id = getFieldValue(item, fieldsMapping.id, Math.random().toString());
    const scrapedAt = getFieldValue(item, fieldsMapping.scraped_at, new Date().toISOString());
    const formattedDate = new Date(scrapedAt).toLocaleString();
    const title = getFieldValue(item, fieldsMapping.title, "Untitled");
    const description = getFieldValue(item, fieldsMapping.description, "");
    const price = parseFloat(getFieldValue(item, fieldsMapping.price, 0));
    const url = getFieldValue(item, fieldsMapping.url, "#");
    const imageUrl = getFieldValue(item, fieldsMapping.image_url, "");
    
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>{title}</Title>
          <View style={styles.dateRow}>
            <Text style={styles.date}>Scraped: {formattedDate}</Text>
            {price > 0 && (
              <Chip icon="currency-usd" style={styles.priceChip}>
                ${price.toFixed(2)}
              </Chip>
            )}
          </View>

          {imageUrl && (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: imageUrl }} 
                style={styles.image} 
                resizeMode="cover"
              />
            </View>
          )}

          <Paragraph style={styles.description}>{description}</Paragraph>
          
          <Button
            mode="outlined"
            icon="open-in-new"
            onPress={() => Linking.openURL(url)}
            style={styles.linkButton}
          >
            View Source
          </Button>

          {Object.keys(metadata).length > 0 && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.metadataTitle}>Additional Information</Text>
              <View style={styles.metadataContainer}>
                {Object.entries(metadata).map(([key, value]) => (
                  <View key={key} style={styles.metadataRow}>
                    <Text style={styles.metadataKey}>{key}</Text>
                    <Text style={styles.metadataValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No data available.</Text>
      <Text style={styles.emptySubText}>Try scraping a website from the Home tab.</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;

    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" />
        <Text style={styles.footerText}>Loading more items...</Text>
      </View>
    );
  };

  // Add debugging for render
  console.log('DataListScreen rendering with items:', items?.length, 'loading:', loading, 'error:', error);

  // Check if items is undefined or null
  // Make sure items is always an array, even if the response structure is unexpected
  let safeItems = [];
  
  // Handle different API response structures
  if (Array.isArray(items)) {
    safeItems = items;
  } else if (items && typeof items === 'object') {
    // If 'items' is actually a wrapped object with data field
    if (Array.isArray(items.data)) {
      safeItems = items.data;
    }
  }
  
  // Debug output to help identify issues
  console.log('DataListScreen final items:', { 
    originalItems: items, 
    safeItems, 
    totalItems, 
    loading, 
    error 
  });
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Title style={styles.headerTitle}>Scraped Data</Title>
        <Text style={styles.headerSubtitle}>
          Showing {safeItems.length} of {totalItems || 0} items
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Button onPress={loadData} mode="contained" style={styles.retryButton}>
            Retry
          </Button>
        </View>
      ) : (
        <FlatList
          data={safeItems}
          renderItem={renderItem}
          keyExtractor={(item) => {
            // More robust key generation
            if (item && (item.id || item.ID || item._id)) {
              return String(item.id || item.ID || item._id);
            }
            return Math.random().toString();
          }}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  date: {
    color: '#666',
    fontSize: 12,
  },
  priceChip: {
    backgroundColor: '#e8f5e9',
  },
  imageContainer: {
    marginVertical: 12,
    borderRadius: 8,
    overflow: 'hidden',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  description: {
    marginBottom: 16,
    color: '#333',
  },
  linkButton: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  metadataTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#555',
  },
  metadataContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metadataKey: {
    fontWeight: 'bold',
    width: '30%',
    color: '#555',
  },
  metadataValue: {
    flex: 1,
    color: '#333',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    color: '#888',
    textAlign: 'center',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  footerText: {
    marginLeft: 8,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#2196F3',
  },
});

export default DataListScreen;