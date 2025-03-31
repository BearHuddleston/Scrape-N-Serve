import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './components/HomeScreen';
import DataListScreen from './components/DataListScreen';
import { Provider } from 'react-redux';
import store from './services/store';

export type RootStackParamList = {
  Home: undefined;
  DataList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Scrape-N-Serve' }} 
          />
          <Stack.Screen 
            name="DataList" 
            component={DataListScreen} 
            options={{ title: 'Scraped Data' }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
