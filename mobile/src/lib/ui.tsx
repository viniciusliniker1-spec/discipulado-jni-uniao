import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from './tema';

export const estilos = StyleSheet.create({
  pagina: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line, shadowColor: '#0b1020', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  titulo: { fontSize: 24, fontWeight: '900', color: C.navy, marginBottom: 8, letterSpacing: 0.2 },
  subtitulo: { fontSize: 16, fontWeight: '700', color: C.navy, marginTop: 14, marginBottom: 6 },
  texto: { fontSize: 15, lineHeight: 22, color: '#1d2433' },
  nota: { fontSize: 13, color: C.muted, lineHeight: 18 },
  sep: { height: 1, backgroundColor: C.line, marginVertical: 12 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 16, backgroundColor: '#f7f9fd', color: C.ink, marginTop: 6 },
  rotulo: { fontSize: 13, fontWeight: '700', color: C.navy, letterSpacing: 0.2 },
  cabecalhoMarca: { alignItems: 'center', backgroundColor: C.navy, marginHorizontal: -16, marginTop: -16, paddingTop: 44, paddingBottom: 56, paddingHorizontal: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, borderBottomWidth: 4, borderBottomColor: C.or },
  marcaTitulo: { color: C.white, fontSize: 26, fontWeight: '900', letterSpacing: 2, marginTop: 14 },
  marcaSub: { color: '#9aa6c7', fontSize: 13, marginTop: 4 },
  segmentos: { flexDirection: 'row', backgroundColor: '#e6eaf4', borderRadius: 14, padding: 4, marginTop: -28, marginBottom: 14 },
  segmento: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  segmentoOn: { backgroundColor: C.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segmentoTexto: { fontWeight: '700', color: C.muted },
  segmentoTextoOn: { color: C.navy },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  botao: { backgroundColor: C.bl, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', marginTop: 10, shadowColor: C.bl, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  botaoTexto: { color: C.white, fontWeight: '800', fontSize: 16 },
  botaoFraco: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  botaoFracoTexto: { color: C.navy },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, marginRight: 8, marginBottom: 8, backgroundColor: C.white },
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
      <View style={estilos.barra}><View style={[estilos.barraCheia, { width: (pct + '%') as any }]} /></View>
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
