import type { ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { c, STATUT_COLOR, t } from './theme';

export function Btn(props: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}) {
  const variant = props.variant ?? 'primary';
  const base = { borderRadius: 10, padding: 14, alignItems: 'center' as const };
  const style =
    variant === 'primary'
      ? { ...base, backgroundColor: c.primary }
      : variant === 'secondary'
        ? { ...base, borderWidth: 1, borderColor: c.ok }
        : { padding: 12, alignItems: 'center' as const };
  const color = variant === 'primary' ? '#fff' : variant === 'secondary' ? c.ok : c.muted;
  return (
    <Pressable style={style} onPress={props.onPress} disabled={props.disabled}>
      <Text style={{ color, fontWeight: '700' }}>{props.label}</Text>
    </Pressable>
  );
}

export function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={t.field}>
      <Text style={t.label}>{props.label}</Text>
      <TextInput
        style={[t.input, props.multiline ? t.inputMultiline : null]}
        value={props.value}
        onChangeText={props.onChange}
        multiline={props.multiline}
        placeholder={props.placeholder}
        placeholderTextColor={c.muted}
      />
    </View>
  );
}

export function Badge(props: { statut: string }) {
  return (
    <Text style={[t.badge, { color: STATUT_COLOR[props.statut] ?? '#374151' }]}>
      {props.statut}
    </Text>
  );
}

export function Header(props: { role: 'demandeur' | 'admin'; onToggleRole: () => void }) {
  return (
    <View style={t.header}>
      <Text style={t.brand}>GetExp · marketplace</Text>
      <Pressable style={t.rolePill} onPress={props.onToggleRole}>
        <Text style={t.rolePillText}>{props.role === 'admin' ? '🛠 admin' : '👤 demandeur'}</Text>
      </Pressable>
    </View>
  );
}

export function Card(props: { children: ReactNode; onPress?: () => void }) {
  if (props.onPress) {
    return (
      <Pressable style={t.card} onPress={props.onPress}>
        {props.children}
      </Pressable>
    );
  }
  return <View style={t.card}>{props.children}</View>;
}
