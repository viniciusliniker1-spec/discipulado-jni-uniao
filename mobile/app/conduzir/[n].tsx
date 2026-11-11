import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { BLOCOS, ENC, linkVersiculo } from '../../src/content';
import { C } from '../../src/lib/tema';

function Sec({ t }: { t: string }) {
  return (
    <View style={s.sec}>
      <Text style={s.secChev}>»</Text>
      <Text style={s.secTitulo}>{t}</Text>
    </View>
  );
}

function Lista({ itens, cor }: { itens: string[]; cor: string }) {
  return (
    <View>
      {itens.map((x, i) => (
        <View key={i} style={s.passo}>
          <View style={[s.bola, { backgroundColor: cor }]}><Text style={s.bolaT}>{i + 1}</Text></View>
          <Text style={[s.texto, { flex: 1 }]}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

export default function Conduzir() {
  const { n: nStr } = useLocalSearchParams<{ n: string }>();
  const n = Number(nStr);
  const router = useRouter();
  const e: any = ENC[n - 1];
  if (!e) return null;
  const d = e.disc;
  const cor = (BLOCOS as any)[n] ? (BLOCOS as any)[n][1] : C.cy;
  const bloco = (BLOCOS as any)[n] ? (BLOCOS as any)[n][0] : '';
  return (
    <>
      <Stack.Screen options={{ title: 'Como conduzir ' + n }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }}>
        <View style={[s.pilula, { backgroundColor: cor }]}><Text style={s.pilulaT}>Encontro {n} · {bloco}</Text></View>
        <View style={s.capa}>
          <Text style={[s.capaNum, { color: cor }]}>{n}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.capaTitulo}>{e.t}</Text>
            <Text style={s.capaSub}>{e.s}</Text>
          </View>
        </View>

        <Sec t="Como conduzir" />
        <View style={s.conduzir}>
          <Text style={s.conduzirT}>PASSO A PASSO NA CONVERSA</Text>
          <Lista itens={d.conduzir} cor={C.bl} />
        </View>

        <View style={s.dinamica}>
          <Text style={s.dinamicaT}>DINÂMICA: {String(d.dinamica.nome).toUpperCase()}</Text>
          <View style={s.tempo}><Text style={s.tempoT}>⏱ {d.dinamica.tempo}</Text></View>
          <Lista itens={d.dinamica.passos} cor={C.or} />
        </View>

        <View style={s.vida}>
          <Text style={s.vidaT}>VIDA NA VIDA</Text>
          <Text style={s.texto}>{d.vida}</Text>
        </View>

        <View style={s.espirito}>
          <Text style={s.espiritoT}>PONTO DE ATENÇÃO: DEPENDÊNCIA DO ESPÍRITO</Text>
          <Text style={s.texto}>{e.es} Ore para que o próprio Espírito conduza a conversa e a vida do jovem, e não apenas o seu esforço.</Text>
        </View>

        <Sec t="Conteúdo que o jovem vê" />
        <Text style={s.dica}>Modelo do encontro, sem respostas de ninguém.</Text>

        <View style={s.card}>
          <Text style={s.negrito}>Textos bíblicos</Text>
          <View style={{ marginTop: 10 }}>
            {e.txt.map((r: string) => (
              <Pressable key={r} onPress={() => Linking.openURL(linkVersiculo(r))} style={s.verso}>
                <Text style={s.versoT}>{r}  <Text style={{ fontSize: 12 }}>NVI ↗</Text></Text>
              </Pressable>
            ))}
          </View>
          <View style={s.obs}><Text style={s.italico}><Text style={{ fontWeight: '800', fontStyle: 'normal' }}>Pergunta de observação: </Text>{e.obs}</Text></View>
        </View>

        <View style={s.nucleo}>
          <Text style={s.nucleoT}>NÚCLEO TEOLÓGICO</Text>
          <Text style={s.nucleoP}>{e.nuc}</Text>
        </View>
        <View style={s.naz}>
          <Text style={s.nazT}>CONEXÃO COM A DOUTRINA NAZARENA</Text>
          <Text style={s.texto}>{e.naz}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.negrito}>Perguntas para a conversa</Text>
          <Lista itens={e.perg} cor={C.cy} />
          <View style={s.abrir}>
            <Text style={s.negrito}>Para abrir a conversa:</Text>
            <Text style={s.italico}>{e.abrir}</Text>
          </View>
        </View>

        <View style={s.desafio}>
          <Text style={s.desafioT}>DESAFIO DA SEMANA</Text>
          <Text style={s.desafioP}>{e.des}</Text>
        </View>

        <Sec t="Mensagem de meio de semana" />
        <View style={s.card}>
          <Text style={s.italico}>“{e.msg}”</Text>
          <Pressable style={s.enviar} onPress={() => { Share.share({ message: e.msg }).catch(() => {}); }}>
            <Text style={s.enviarT}>Copiar ou enviar mensagem</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          {n > 1 && <Pressable style={[s.fraco, { flex: 1 }]} onPress={() => router.replace('/conduzir/' + (n - 1))}><Text style={s.fracoT}>← Anterior</Text></Pressable>}
          {n < 10 && <Pressable style={[s.fraco, { flex: 1 }]} onPress={() => router.replace('/conduzir/' + (n + 1))}><Text style={s.fracoT}>Próximo →</Text></Pressable>}
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  pilula: { alignSelf: 'flex-start', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 14, marginBottom: 10 },
  pilulaT: { color: C.white, fontWeight: '800', fontSize: 12 },
  capa: { backgroundColor: C.navy, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  capaNum: { fontSize: 56, fontWeight: '900' },
  capaTitulo: { color: C.white, fontSize: 24, fontWeight: '900', textTransform: 'uppercase' },
  capaSub: { color: '#c9d2ea', marginTop: 6, lineHeight: 20 },
  sec: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26, marginBottom: 10 },
  secChev: { color: C.navy, fontSize: 26, fontWeight: '900', transform: [{ rotate: '-90deg' }], width: 22, textAlign: 'center' },
  secTitulo: { color: C.navy, fontSize: 21, fontWeight: '900', textTransform: 'uppercase', flex: 1 },
  texto: { fontSize: 15, lineHeight: 22, color: C.ink },
  negrito: { fontWeight: '800', color: C.navy, fontSize: 16, marginBottom: 4 },
  dica: { fontSize: 13, color: C.muted, marginBottom: 8 },
  italico: { fontStyle: 'italic', fontSize: 15, lineHeight: 22, color: C.ink, marginTop: 4 },
  passo: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 12 },
  bola: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  bolaT: { color: C.white, fontWeight: '900', fontSize: 13 },
  conduzir: { backgroundColor: '#eef4ff', borderLeftWidth: 6, borderLeftColor: C.bl, borderRadius: 16, padding: 18, marginBottom: 12 },
  conduzirT: { color: C.bl, fontWeight: '900', fontSize: 15 },
  dinamica: { backgroundColor: '#fff3ea', borderLeftWidth: 6, borderLeftColor: C.or, borderRadius: 16, padding: 18, marginBottom: 12 },
  dinamicaT: { color: C.or, fontWeight: '900', fontSize: 15 },
  tempo: { alignSelf: 'flex-start', backgroundColor: C.or, borderRadius: 99, paddingVertical: 3, paddingHorizontal: 12, marginTop: 8 },
  tempoT: { color: C.white, fontWeight: '800', fontSize: 12 },
  vida: { backgroundColor: '#e8f9ff', borderLeftWidth: 6, borderLeftColor: C.cy, borderRadius: 16, padding: 18, marginBottom: 12 },
  vidaT: { color: '#0a86b0', fontWeight: '900', fontSize: 15, marginBottom: 6 },
  espirito: { backgroundColor: '#fff6e8', borderWidth: 1, borderColor: '#f5d9b5', borderLeftWidth: 6, borderLeftColor: C.or, borderRadius: 16, padding: 16, marginBottom: 12 },
  espiritoT: { color: C.or, fontWeight: '900', fontSize: 14, marginBottom: 6 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  verso: { backgroundColor: C.cy, borderRadius: 99, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start', marginBottom: 8 },
  versoT: { color: C.navy, fontWeight: '800', fontSize: 15 },
  obs: { backgroundColor: '#eef4ff', borderLeftWidth: 4, borderLeftColor: C.bl, borderRadius: 10, padding: 12, marginTop: 8 },
  nucleo: { backgroundColor: C.navy, borderLeftWidth: 6, borderLeftColor: C.cy, borderRadius: 16, padding: 18, marginBottom: 12 },
  nucleoT: { color: C.cy, fontWeight: '900', fontSize: 16, marginBottom: 8 },
  nucleoP: { color: C.white, fontSize: 17, fontWeight: '600', lineHeight: 25 },
  naz: { backgroundColor: '#f7eeee', borderLeftWidth: 6, borderLeftColor: C.mar, borderRadius: 16, padding: 18, marginBottom: 12 },
  nazT: { color: C.mar, fontWeight: '900', fontSize: 15, marginBottom: 6 },
  abrir: { backgroundColor: C.paper, borderLeftWidth: 4, borderLeftColor: C.cy, borderRadius: 10, padding: 12, marginTop: 14 },
  desafio: { backgroundColor: C.bl, borderRadius: 16, padding: 20, marginBottom: 12 },
  desafioT: { color: '#cfe0ff', fontWeight: '900', fontSize: 16, marginBottom: 8 },
  desafioP: { color: C.white, fontSize: 17, fontWeight: '600', lineHeight: 25 },
  enviar: { backgroundColor: C.bl, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  enviarT: { color: C.white, fontWeight: '800' },
  fraco: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  fracoT: { color: C.navy, fontWeight: '700' },
});
