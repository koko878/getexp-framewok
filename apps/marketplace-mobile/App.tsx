import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, type Projet, type Statut, type UseCase } from './src/api';

type Screen = { name: 'accueil' } | { name: 'cadrage' } | { name: 'detail'; id: string };

const STATUT_COLOR: Partial<Record<Statut, string>> = {
  brouillon: '#6b7280',
  soumis: '#b45309',
  prototype_valide: '#15803d',
};

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'accueil' });
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjets(await api.listProjets());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (screen.name === 'accueil') void loadProjets();
  }, [screen, loadProjets]);

  return (
    <View style={styles.app}>
      <StatusBar style="auto" />
      <Text style={styles.brand}>GetExp · marketplace</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {screen.name === 'accueil' ? (
        <Accueil
          projets={projets}
          loading={loading}
          onNew={() => setScreen({ name: 'cadrage' })}
          onOpen={(id) => setScreen({ name: 'detail', id })}
        />
      ) : null}

      {screen.name === 'cadrage' ? (
        <Cadrage
          onCancel={() => setScreen({ name: 'accueil' })}
          onSubmitted={() => setScreen({ name: 'accueil' })}
          onError={setError}
        />
      ) : null}

      {screen.name === 'detail' ? (
        <Detail id={screen.id} onBack={() => setScreen({ name: 'accueil' })} onError={setError} />
      ) : null}
    </View>
  );
}

function Accueil(props: {
  projets: Projet[];
  loading: boolean;
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Pressable style={styles.primary} onPress={props.onNew}>
        <Text style={styles.primaryText}>+ Nouveau cadrage</Text>
      </Pressable>
      {props.loading ? <ActivityIndicator /> : null}
      {!props.loading && props.projets.length === 0 ? (
        <Text style={styles.muted}>Aucun projet. Lance un cadrage.</Text>
      ) : null}
      {props.projets.map((p) => (
        <Pressable key={p.id} style={styles.card} onPress={() => props.onOpen(p.id)}>
          <Text style={styles.cardTitle}>{p.donnees.titre}</Text>
          <Text style={styles.muted}>{p.donnees.domaine ?? '—'}</Text>
          <Text style={[styles.badge, { color: STATUT_COLOR[p.statut] ?? '#374151' }]}>
            {p.statut}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Cadrage(props: {
  onCancel: () => void;
  onSubmitted: () => void;
  onError: (m: string) => void;
}) {
  const [form, setForm] = useState<UseCase>({ titre: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof UseCase) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.titre.trim()) {
      props.onError('Le titre est requis.');
      return;
    }
    setBusy(true);
    try {
      await api.createProjet(form, 'soumis');
      props.onSubmitted();
    } catch (e) {
      props.onError(e instanceof Error ? e.message : 'Soumission impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.h2}>Cadrage du besoin</Text>
      <Field label="Titre" value={form.titre} onChange={set('titre')} />
      <Field label="Domaine" value={form.domaine ?? ''} onChange={set('domaine')} />
      <Field label="Problème" value={form.probleme ?? ''} onChange={set('probleme')} multiline />
      <Field label="Objectif" value={form.objectif ?? ''} onChange={set('objectif')} multiline />
      <Pressable style={styles.primary} onPress={submit} disabled={busy}>
        <Text style={styles.primaryText}>{busy ? 'Envoi…' : 'Soumettre'}</Text>
      </Pressable>
      <Pressable style={styles.ghost} onPress={props.onCancel}>
        <Text style={styles.ghostText}>Annuler</Text>
      </Pressable>
    </ScrollView>
  );
}

function Detail(props: { id: string; onBack: () => void; onError: (m: string) => void }) {
  const [projet, setProjet] = useState<Projet | null>(null);
  const [journal, setJournal] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getProjet(props.id)
      .then(setProjet)
      .catch((e) => props.onError(e instanceof Error ? e.message : 'Introuvable'));
  }, [props.id, props.onError]);

  const generate = async () => {
    if (!projet) return;
    setBusy(true);
    try {
      const { journal: j } = await api.generate(projet.donnees);
      setJournal(j);
    } catch (e) {
      props.onError(e instanceof Error ? e.message : 'Génération indisponible');
    } finally {
      setBusy(false);
    }
  };

  const validate = async () => {
    if (!projet) return;
    setProjet(await api.setStatut(projet.id, 'prototype_valide'));
  };

  if (!projet) return <ActivityIndicator style={styles.body} />;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.h2}>{projet.donnees.titre}</Text>
      <Text style={styles.muted}>{projet.donnees.domaine ?? '—'}</Text>
      <Text style={styles.para}>{projet.donnees.probleme ?? ''}</Text>
      <Text style={[styles.badge, { color: STATUT_COLOR[projet.statut] ?? '#374151' }]}>
        {projet.statut}
      </Text>

      <Pressable style={styles.primary} onPress={generate} disabled={busy}>
        <Text style={styles.primaryText}>{busy ? 'Génération…' : 'Générer le prototype'}</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={validate}>
        <Text style={styles.secondaryText}>Valider le prototype</Text>
      </Pressable>

      {journal ? (
        <View style={styles.journal}>
          {journal.map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static, non-reordered log lines
            <Text key={i} style={styles.journalLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.ghost} onPress={props.onBack}>
        <Text style={styles.ghostText}>← Retour</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.multiline ? styles.inputMultiline : null]}
        value={props.value}
        onChangeText={props.onChange}
        multiline={props.multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#f7f7f8', paddingTop: 56 },
  brand: { fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 },
  body: { padding: 20, gap: 12 },
  h2: { fontSize: 20, fontWeight: '700' },
  para: { color: '#374151' },
  muted: { color: '#6b7280' },
  error: { color: '#b91c1c', paddingHorizontal: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  badge: { fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  primary: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#15803d',
  },
  secondaryText: { color: '#15803d', fontWeight: '700' },
  ghost: { padding: 12, alignItems: 'center' },
  ghostText: { color: '#6b7280' },
  field: { gap: 4 },
  label: { fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  journal: { backgroundColor: '#111827', borderRadius: 10, padding: 12, gap: 2 },
  journalLine: { color: '#d1d5db', fontSize: 12, fontFamily: 'monospace' },
});
