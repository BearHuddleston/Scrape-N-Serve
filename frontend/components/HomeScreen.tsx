import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { triggerScraping } from '../services/apiService';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [url, setUrl] = useState('https://example.com');
  const [isLoading, setIsLoading] = useState(false);

  const handleScrape = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    try {
      const response = await triggerScraping(url);
      if (response.status === 'success') {
        Alert.alert('Success', 'Scraping started successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to start scraping');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while trying to start scraping');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToDataList = () => {
    navigation.navigate('DataList');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Web Scraper</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Target URL:</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="Enter URL to scrape"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleScrape}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Start Scraping</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton]} 
        onPress={navigateToDataList}
      >
        <Text style={styles.buttonText}>View Scraped Data</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F7',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0A84FF',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  secondaryButton: {
    backgroundColor: '#30B030',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
