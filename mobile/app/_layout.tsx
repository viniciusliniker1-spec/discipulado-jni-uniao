import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessaoProvider } from '../src/lib/sessao';
import { C } from '../src/lib/tema';

export default function Layout() {
  return (
    <SessaoProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.navy },
          headerTintColor: C.white,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: C.paper },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </SessaoProvider>
  );
}
