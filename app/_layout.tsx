import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UserProvider } from '@/app/contexts/UserContext';

export default function RootLayout() {
  return (
    <UserProvider>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
      </Stack>
    </UserProvider>
  );
}
