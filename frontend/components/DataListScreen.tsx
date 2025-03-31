import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchData, selectScrapedData, selectDataLoading } from '../services/dataSlice';
import { AppDispatch } from '../services/store';

interface ScrapedItem {
  id: number;
  title: string;
  description: string;
  url: string;
  image_url: string;
  price: number;
  scraped_at: string;
}

const DataListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const scrapedData = useSelector(selectScrapedData);
  const isLoading = useSelector(selectDataLoading);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    dispatch(fetchData());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchData());
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: ScrapedItem }) => (
    <View style={styles.item}>
      {item.image_url ? (
        <Image 
          source={{ uri: item.image_url }} 
          style={styles.image} 
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
        
        {item.price > 0 && (
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        )}
        
        <Text style={styles.date}>
          Scraped on: {new Date(item.scraped_at).toLocaleDateString()}
        </Text>
        
        <TouchableOpacity style={styles.urlButton} onPress={() => {}}>
          <Text style={styles.urlButtonText} numberOfLines={1}>View Source</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      ) : scrapedData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No scraped data available</Text>
          <TouchableOpacity style={styles.reloadButton} onPress={loadData}>
            <Text style={styles.reloadButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={scrapedData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
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
    backgroundColor: '#F5F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  reloadButton: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  list: {
    padding: 10,
  },
  item: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    flexDirection: 'row',
  },
  image: {
    width: 100,
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 5,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  urlButton: {
    backgroundColor: '#f0f0f0',
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  urlButtonText: {
    fontSize: 12,
    color: '#0A84FF',
  },
});

export default DataListScreen;
