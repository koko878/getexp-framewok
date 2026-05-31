import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { api, type Projet, type Statut, type UseCase } from './api';
import { Badge, Btn, Card, Field } from './components';
import { t } from './theme';

export type Screen =
  | { name: 'accueil' }
  | { name: 'cadrage' }
  | { name: 'detail'; id: string }
  | { name: 'admin' }
  | { name: 'adminDetail'; id: string };

type Nav = (s: Screen) => void;
type OnError = (m: string) => void;

function useProjets(mine: boolean, onError: OnError) {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setProjets(await api.listProjets({ mine }));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [mine, onError]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { projets, loading };
}

function ProjetList(props: {
  projets: Projet[];
  loading: boolean;
  onOpen: (id: string) => void;
  empty: string;
}) {
  if (props.loading) return <ActivityIndicator />;
  if (props.projets.length === 0) return <Text style={t.muted}>{props.empty}</Text>;
  return (
    <View style={{ gap: 12 }}>
      {props.projets.map((p) => (
        <Card key={p.id} onPress={() => props.onOpen(p.id)}>
          <Text style={t.cardTitle}>{p.donnees.titre}</Text>
          <Text style={t.muted}>{p.donnees.domaine ?? '—'}</Text>
          <Badge statut={p.statut} />
        </Card>
      ))}
    </View>
  );
}

export function AccueilScreen(props: { go: Nav; onError: OnError }) {
  const { projets, loading } = useProjets(true, props.onError);
  return (
    <ScrollView contentContainerStyle={t.body}>
      <Btn label="+ Nouveau cadrage" onPress={() => props.go({ name: 'cadrage' })} />
      <Text style={t.h2}>Mes projets</Text>
      <ProjetList
        projets={projets}
        loading={loading}
        empty="Aucun projet. Lance un cadrage."
        onOpen={(id) => props.go({ name: 'detail', id })}
      />
    </ScrollView>
  );
}

const STEPS: { key: keyof UseCase; label: string; placeholder: string; multiline?: boolean }[] = [
  {
    key: 'titre',
    label: 'En une phrase, quel est ton besoin ?',
    placeholder: 'Ex: réduire le temps de traitement des factures',
  },
  { key: 'domaine', label: 'Dans quel domaine ?', placeholder: 'finance, industrie, RH…' },
  {
    key: 'utilisateurs',
    label: 'Qui utilisera la solution ?',
    placeholder: 'comptables, managers…',
  },
  {
    key: 'probleme',
    label: 'Quel problème concret veux-tu résoudre ?',
    placeholder: '…',
    multiline: true,
  },
  { key: 'objectif', label: 'Quel résultat attends-tu ?', placeholder: '…', multiline: true },
];

export function CadrageScreen(props: { go: Nav; onError: OnError }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<UseCase>({ titre: '' });
  const [kpis, setKpis] = useState('');
  const [busy, setBusy] = useState(false);
  const recap = step >= STEPS.length;

  const current = STEPS[step];
  const value = current ? ((form[current.key] as string | undefined) ?? '') : '';

  const next = () => {
    if (current && current.key === 'titre' && !value.trim()) {
      props.onError('Le besoin (titre) est requis.');
      return;
    }
    setStep((s) => s + 1);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const useCase: UseCase = {
        ...form,
        kpis: kpis
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      };
      await api.createProjet(useCase, 'soumis');
      props.go({ name: 'accueil' });
    } catch (e) {
      props.onError(e instanceof Error ? e.message : 'Soumission impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={t.body}>
      <Text style={t.progress}>
        Cadrage IA · étape {Math.min(step + 1, STEPS.length + 1)}/{STEPS.length + 1}
      </Text>
      {recap ? (
        <>
          <Text style={t.h2}>Récapitulatif</Text>
          <Card>
            <Text style={t.cardTitle}>{form.titre}</Text>
            <Text style={t.muted}>Domaine : {form.domaine || '—'}</Text>
            <Text style={t.muted}>Utilisateurs : {form.utilisateurs || '—'}</Text>
            <Text style={t.para}>Problème : {form.probleme || '—'}</Text>
            <Text style={t.para}>Objectif : {form.objectif || '—'}</Text>
          </Card>
          <Field
            label="KPIs (séparés par des virgules)"
            value={kpis}
            onChange={setKpis}
            placeholder="délai, coût, satisfaction"
          />
          <Btn label={busy ? 'Envoi…' : 'Soumettre le projet'} onPress={submit} disabled={busy} />
          <Btn label="← Modifier" variant="ghost" onPress={() => setStep(STEPS.length - 1)} />
        </>
      ) : current ? (
        <>
          <Text style={t.h2}>{current.label}</Text>
          <Field
            label=""
            value={value}
            onChange={(v) => setForm((f) => ({ ...f, [current.key]: v }))}
            placeholder={current.placeholder}
            multiline={current.multiline}
          />
          <Btn label="Suivant" onPress={next} />
          {step > 0 ? (
            <Btn label="← Précédent" variant="ghost" onPress={() => setStep((s) => s - 1)} />
          ) : null}
          <Btn label="Annuler" variant="ghost" onPress={() => props.go({ name: 'accueil' })} />
        </>
      ) : null}
    </ScrollView>
  );
}

function ProjetView(props: { projet: Projet }) {
  const { projet } = props;
  return (
    <>
      <Text style={t.h2}>{projet.donnees.titre}</Text>
      <Text style={t.muted}>{projet.donnees.domaine ?? '—'}</Text>
      {projet.donnees.probleme ? (
        <Text style={t.para}>Problème : {projet.donnees.probleme}</Text>
      ) : null}
      {projet.donnees.objectif ? (
        <Text style={t.para}>Objectif : {projet.donnees.objectif}</Text>
      ) : null}
      {projet.donnees.kpis?.length ? (
        <Text style={t.muted}>KPIs : {projet.donnees.kpis.join(', ')}</Text>
      ) : null}
      <Badge statut={projet.statut} />
    </>
  );
}

function useProjet(id: string, onError: OnError): [Projet | null, (p: Projet) => void] {
  const [projet, setProjet] = useState<Projet | null>(null);
  useEffect(() => {
    api
      .getProjet(id)
      .then(setProjet)
      .catch((e) => onError(e instanceof Error ? e.message : 'Introuvable'));
  }, [id, onError]);
  return [projet, setProjet];
}

export function DetailScreen(props: { id: string; go: Nav; onError: OnError }) {
  const [projet, setProjet] = useProjet(props.id, props.onError);
  const [busy, setBusy] = useState(false);

  if (!projet) return <ActivityIndicator style={t.body} />;

  const validate = async () => setProjet(await api.setStatut(projet.id, 'prototype_valide'));
  const requestRevision = async () =>
    setProjet(await api.setStatut(projet.id, 'revision_demandee'));
  const preview = async () => {
    setBusy(true);
    try {
      await api.generate(projet.donnees);
      props.onError('Aperçu généré côté serveur (configure ANTHROPIC_API_KEY pour le vrai rendu).');
    } catch (e) {
      props.onError(e instanceof Error ? e.message : 'Génération indisponible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={t.body}>
      <ProjetView projet={projet} />
      {projet.statut === 'prototype_genere' ? (
        <>
          <Btn label="Valider le prototype" variant="secondary" onPress={validate} />
          <Btn label="Demander une révision" variant="ghost" onPress={requestRevision} />
        </>
      ) : (
        <Btn
          label={busy ? 'Génération…' : 'Tester la génération'}
          onPress={preview}
          disabled={busy}
        />
      )}
      <Btn label="← Retour" variant="ghost" onPress={() => props.go({ name: 'accueil' })} />
    </ScrollView>
  );
}

export function AdminScreen(props: { go: Nav; onError: OnError }) {
  const { projets, loading } = useProjets(false, props.onError);
  return (
    <ScrollView contentContainerStyle={t.body}>
      <Text style={t.h2}>Tous les projets (admin)</Text>
      <ProjetList
        projets={projets}
        loading={loading}
        empty="Aucun projet soumis."
        onOpen={(id) => props.go({ name: 'adminDetail', id })}
      />
    </ScrollView>
  );
}

const ADMIN_TRANSITIONS: Statut[] = [
  'prototype_genere',
  'prototype_valide',
  'cadrage_technique',
  'pret_a_packager',
  'certifie',
];

export function AdminDetailScreen(props: { id: string; go: Nav; onError: OnError }) {
  const [projet, setProjet] = useProjet(props.id, props.onError);
  const [busy, setBusy] = useState(false);
  const [journal, setJournal] = useState<string[] | null>(null);

  if (!projet) return <ActivityIndicator style={t.body} />;

  const generate = async () => {
    setBusy(true);
    try {
      const { journal: j } = await api.generate(projet.donnees);
      setJournal(j);
      setProjet(await api.setStatut(projet.id, 'prototype_genere'));
    } catch (e) {
      props.onError(e instanceof Error ? e.message : 'Génération indisponible');
    } finally {
      setBusy(false);
    }
  };
  const setStatut = async (s: Statut) => setProjet(await api.setStatut(projet.id, s));

  return (
    <ScrollView contentContainerStyle={t.body}>
      <ProjetView projet={projet} />
      <Btn
        label={busy ? 'Génération…' : '⚙️ Générer le prototype'}
        onPress={generate}
        disabled={busy}
      />
      <Text style={t.label}>Faire avancer le statut :</Text>
      {ADMIN_TRANSITIONS.map((s) => (
        <Btn key={s} label={s} variant="secondary" onPress={() => setStatut(s)} />
      ))}
      {journal ? (
        <View style={t.journal}>
          {journal.map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static, non-reordered log lines
            <Text key={i} style={t.journalLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      <Btn label="← Retour" variant="ghost" onPress={() => props.go({ name: 'admin' })} />
    </ScrollView>
  );
}
