import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Header } from './src/components';
import {
  AccueilScreen,
  AdminDetailScreen,
  AdminScreen,
  CadrageScreen,
  DetailScreen,
  type Screen,
} from './src/screens';
import { t } from './src/theme';

export default function App() {
  const [role, setRole] = useState<'demandeur' | 'admin'>('demandeur');
  const [screen, setScreen] = useState<Screen>({ name: 'accueil' });
  const [error, setError] = useState<string | null>(null);

  const go = (s: Screen) => {
    setError(null);
    setScreen(s);
  };
  const toggleRole = () => {
    const next = role === 'admin' ? 'demandeur' : 'admin';
    setRole(next);
    go({ name: next === 'admin' ? 'admin' : 'accueil' });
  };

  return (
    <View style={t.app}>
      <StatusBar style="auto" />
      <Header role={role} onToggleRole={toggleRole} />
      {error ? <Text style={t.error}>{error}</Text> : null}

      {screen.name === 'accueil' ? <AccueilScreen go={go} onError={setError} /> : null}
      {screen.name === 'cadrage' ? <CadrageScreen go={go} onError={setError} /> : null}
      {screen.name === 'detail' ? <DetailScreen id={screen.id} go={go} onError={setError} /> : null}
      {screen.name === 'admin' ? <AdminScreen go={go} onError={setError} /> : null}
      {screen.name === 'adminDetail' ? (
        <AdminDetailScreen id={screen.id} go={go} onError={setError} />
      ) : null}
    </View>
  );
}
