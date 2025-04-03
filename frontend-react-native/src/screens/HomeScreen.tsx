import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { startScraping, fetchScrapingStatus } from '../services/dataSlice';
import { RootState, AppDispatch } from '../services/store';

interface ScrapeResult {
  status: string;
  message: string;
  url: string;
  time: string;
}

const HomeScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [url, setUrl] = useState('https://en.wikipedia.org/wiki/Apollo_15');
  const [maxDepth, setMaxDepth] = useState('2');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  const { scraping, error } = useSelector((state: RootState) => state.data);

  // Poll for scraping status when scraping is active
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (scraping) {
      intervalId = setInterval(() => {
        dispatch(fetchScrapingStatus());
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [scraping, dispatch]);
  
  // Store previous scraping state in a ref that persists across renders
  const prevScrapingRef = React.useRef(scraping);
  
  // Watch for changes in scraping status to update the result
  useEffect(() => {
    // If scraping transitions from true to false (just completed)
    if (prevScrapingRef.current === true && scraping === false) {
      // Keep the result card visible with a completion message
      if (result) {
        setResult({
          ...result,
          message: "Scraping completed successfully"
        });
      } else {
        // In case result is null but scraping just finished
        setResult({
          status: "success",
          message: "Scraping completed successfully",
          url: "N/A",
          time: new Date().toISOString()
        });
      }
    }
    
    // Update the ref with current value for next render
    prevScrapingRef.current = scraping;
  }, [scraping, result]);

  // Show error if there is one
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const handleScrape = async () => {
    try {
      setIsLoading(true);
      setResult(null);

      // Validate URL
      if (!url) {
        Alert.alert('Error', 'Please enter a URL');
        setIsLoading(false);
        return;
      }

      // Validate max depth
      const depth = parseInt(maxDepth);
      if (isNaN(depth) || depth < 1 || depth > 5) {
        Alert.alert('Error', 'Max depth must be between 1 and 5');
        setIsLoading(false);
        return;
      }

      // Dispatch the action to start scraping
      const resultAction = await dispatch(
        startScraping({
          url,
          max_depth: depth,
        })
      );

      if (startScraping.fulfilled.match(resultAction)) {
        setResult(resultAction.payload);
      }
    } catch (error) {
      console.error('Error starting scraping:', error);
      Alert.alert('Error', 'Failed to start scraping');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Web Scraper</Title>
            <Paragraph style={styles.subtitle}>
              Enter a URL to scrape (Wikipedia pages work best)
            </Paragraph>

            <TextInput
              label="URL"
              value={url}
              onChangeText={setUrl}
              mode="outlined"
              style={styles.input}
              placeholder="https://example.com"
              autoCapitalize="none"
              keyboardType="url"
            />

            <TextInput
              label="Max Depth"
              value={maxDepth}
              onChangeText={setMaxDepth}
              mode="outlined"
              style={styles.input}
              placeholder="2"
              keyboardType="number-pad"
            />

            <Button
              mode="contained"
              onPress={handleScrape}
              loading={isLoading}
              disabled={isLoading || scraping}
              style={styles.button}
            >
              {isLoading ? 'Starting...' : scraping ? 'Scraping...' : 'Start Scraping'}
            </Button>

            {scraping && (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.statusText}>
                  Scraping in progress... This may take some time depending on the depth.
                </Text>
              </View>
            )}

            {result && (
              <Card style={styles.resultCard}>
                <Card.Content>
                  <Title>Scraping Started!</Title>
                  <Paragraph>URL: {result.url}</Paragraph>
                  <Paragraph>Status: {result.status}</Paragraph>
                  <Paragraph>Message: {result.message}</Paragraph>
                </Card.Content>
              </Card>
            )}
          </Card.Content>
        </Card>
      </KeyboardAvoidingView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 16,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#e8f4fd',
    padding: 12,
    borderRadius: 8,
  },
  statusText: {
    marginLeft: 8,
    flex: 1,
    color: '#0366d6',
  },
  resultCard: {
    marginTop: 16,
    backgroundColor: '#f0f9ff',
  },
});

export default HomeScreen;