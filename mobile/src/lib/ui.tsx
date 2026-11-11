import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from './tema';

export const estilos = StyleSheet.create({
  pagina: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  titulo: { fontSize: 22, fontWeight: '800', color: C.navy, marginBottom: 8 },
  subtitulo: { fontSize: 16, fontWeight: '700', color: C.navy, marginTop: 14, marginBottom: 6 },
  texto: { fontSize: 15, lineHeight: 22, color: '#1d2433' },
  nota: { fontSize: 13, color: C.muted, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, fontSize: 15, backgroundColor: C.white, color: C.navy, marginTop: 6 },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  botao: { backgroundColor: C.navy, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginTop: 10 },
  botaoTexto: { color: C.white, fontWeight: '700', fontSize: 15 },
  botaoFraco: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  botaoFracoTexto: { color: C.navy },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.line, marginRight: 8, marginBottom: 8 },
  chipOn: { backgroundColor: C.navy, borderColor: C.navy },
  chipTexto: { color: C.navy, fontWeight: '600' },
  chipTextoOn: { color: C.white },
  erro: { backgroundColor: '#fde8e8', color: '#8a1c1c', padding: 10, borderRadius: 10, marginTop: 10 },
  barra: { height: 10, backgroundColor: '#e6eaf4', borderRadius: 999, overflow: 'hidden', marginTop: 6 },
  barraCheia: { height: 10, backgroundColor: C.cy },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export function Carregando() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper }}>
      <ActivityIndicator color={C.navy} />
    </View>
  );
}

export function Botao({ texto, onPress, fraco, disabled }: { texto: string; onPress: () => void; fraco?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[estilos.botao, fraco && estilos.botaoFraco, disabled && { opacity: 0.5 }]}>
      <Text style={[estilos.botaoTexto, fraco && estilos.botaoFracoTexto]}>{texto}</Text>
    </Pressable>
  );
}

export function Barra({ valor, total }: { valor: number; total: number }) {
  const pct = total ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return (
    <View>
      <View style={estilos.barra}><View style={[estilos.barraCheia, { width: pct + '%' }]} /></View>
      <Text style={estilos.nota}>{valor}/{total} encontros</Text>
    </View>
  );
}

// Barras das últimas 8 semanas (dias ativos por semana, máximo 7)
export function Semanas({ dados }: { dados: number[] }) {
  const s = dados && dados.length === 8 ? dados : [0, 0, 0, 0, 0, 0, 0, 0];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 6, marginTop: 8 }}>
        {s.map((v, i) => (
          <View key={i} style={{ flex: 1, height: 4 + Math.round((v / 7) * 56), backgroundColor: v ? C.cy : '#c9d2ea', borderRadius: 4 }} />
        ))}
      </View>
      <Text style={estilos.nota}>Dias ativos nas últimas 8 semanas (a barra da direita é a mais recente).</Text>
    </View>
  );
}
