import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GameProvider } from './src/context/GameContext';
import Colors from './src/constants/Colors';

// Screens
import MainMenuScreen from './src/screens/MainMenuScreen';
import CreateGameScreen from './src/screens/CreateGameScreen';
import JoinGameScreen from './src/screens/JoinGameScreen';
import GameScreen from './src/screens/GameScreen';
import GameOverScreen from './src/screens/GameOverScreen';
import ScriptBrowserScreen from './src/screens/ScriptBrowserScreen';
import HowToPlayScreen from './src/screens/HowToPlayScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: Colors.background,
  },
  headerTintColor: Colors.text,
  headerTitleStyle: {
    fontWeight: 'bold',
  },
  headerShadowVisible: false,
  contentStyle: {
    backgroundColor: Colors.background,
  },
  animation: 'slide_from_right',
};

export default function App() {
  return (
    <GameProvider>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: Colors.accent,
            background: Colors.background,
            card: Colors.surface,
            text: Colors.text,
            border: Colors.border,
            notification: Colors.evil,
          },
        }}
      >
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <Stack.Navigator initialRouteName="MainMenu" screenOptions={screenOptions}>
          <Stack.Screen
            name="MainMenu"
            component={MainMenuScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateGame"
            component={CreateGameScreen}
            options={{ title: 'New Game' }}
          />
          <Stack.Screen
            name="JoinGame"
            component={JoinGameScreen}
            options={{ title: 'Join Game' }}
          />
          <Stack.Screen
            name="Game"
            component={GameScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="GameOver"
            component={GameOverScreen}
            options={{
              title: 'Game Over',
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="ScriptBrowser"
            component={ScriptBrowserScreen}
            options={{ title: 'Scripts & Characters' }}
          />
          <Stack.Screen
            name="HowToPlay"
            component={HowToPlayScreen}
            options={{ title: 'How to Play' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GameProvider>
  );
}
