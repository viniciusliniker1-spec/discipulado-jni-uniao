import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Share, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BLOCOS, ENC, linkVersiculo } from '../../src/content';
import { api } from '../../src/lib/api';
import { useSessao } from '../../src/lib/sessao';
import { Carregando } from '../../src/lib/ui';
import { C } from '../../src/lib/tema';

const VAZIO = () => ({
  bal: [false, false, false], txt: [false, false, false], perg: {} as Record<string, string>,
  dias: [false, false, false, false, false], reg: [['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', '']],
  quiz: -1, comp: '', done: false,
});
const COLS = ['Data', 'O que percebi em Deus', 'O que pratiquei', 'Próximo passo'];

function Sec({ t }: { t: string }) {
  return (
    <View style={s.sec}>
      <Text style={s.secChev}>»</Text>
      <Text style={s.secTitulo}>{t}</Text>
    </View>
  );
}

export default function Encontro() {
  const { n: nStr } = useLocalSearchParams<{ n: string }>();
  const n = Number(nStr);
  const enc: any = ENC[n - 1];
  const router = useRouter();
  const { usuario } = useSessao();
  const [e, setE] = useState<any>(null);
  const [aprof, setAprof] = useState(false);
  const salvoEm = useRef<any>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!usuario) return;
    api.progressoDe(usuario.id).then(p => setE({ ...VAZIO(), ...(p[n] || {}) }));
  }, [usuario, n]);

  function mudar(parcial: any, agora = false) {
    setE((antes: any) => {
      const novo = { ...antes, ...parcial };
      clearTimeout(salvoEm.current);
      const gravar = () => api.salvarEncontro(n, novo)
        .then(() => setStatus('Salvo'))
        .catch(() => setStatus('Sem conexão. Não foi salvo; tente de novo quando voltar a internet.'));
      if (agora) gravar(); else salvoEm.current = setTimeout(gravar, 700);
      return novo;
    });
  }

  if (!enc) return null;
  if (!e) return <Carregando />;
  const cor = (BLOCOS as any)[n] ? (BLOCOS as any)[n][1] : C.cy;
  const bloco = (BLOCOS as any)[n] ? (BLOCOS as any)[n][0] : '';

  const abrirVersiculo = (ref: string, i: number) => {
    const novo = [...e.txt]; novo[i] = true;
    mudar({ txt: novo });
    Linking.openURL(linkVersiculo(ref));
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Encontro ' + n }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
        <View style={[s.pilula, { backgroundColor: cor }]}><Text style={s.pilulaTexto}>Encontro {n} · {bloco}</Text></View>
        <View style={s.capa}>
          <Text style={[s.capaNum, { color: cor }]}>{n}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.capaTitulo}>{enc.t}</Text>
            <Text style={s.capaSub}>{enc.s}</Text>
          </View>
        </View>

        <Sec t="Conversa" />
        <View style={s.card}>
          <Text style={s.negrito}>Balizas da conversa</Text>
          <Text style={s.dica}>Marque cada baliza quando a conversa passar por ela.</Text>
          {enc.bal.map((b: string, i: number) => (
            <Pressable key={i} onPress={() => { const novo = [...e.bal]; novo[i] = !novo[i]; mudar({ bal: novo }, true); }}
              style={[s.check, e.bal[i] && s.checkOn]}>
              <View style={[s.caixa, e.bal[i] && s.caixaOn]}>{e.bal[i] && <Text style={s.visto}>✓</Text>}</View>
              <Text style={[s.texto, { flex: 1 }]}>{b}</Text>
            </Pressable>
          ))}
          <View style={[s.abrir, { marginTop: 12 }]}>
            <Text style={s.negrito}>Para abrir a conversa:</Text>
            <Text style={s.italico}>{enc.abrir}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.negritoG}>Textos bíblicos da conversa</Text>
          <Text style={s.dica}>Toque em um texto para abrir a NVI no app YouVersion, no versículo indicado. Depois de ler em voz alta, o texto fica marcado.</Text>
          <View style={{ marginTop: 10 }}>
            {enc.txt.map((ref: string, i: number) => (
              <Pressable key={ref} onPress={() => abrirVersiculo(ref, i)} style={[s.verso, e.txt[i] && s.versoOn]}>
                <Text style={[s.versoTexto, e.txt[i] && { color: C.white }]}>{e.txt[i] ? '✓ ' : ''}{ref}  <Text style={{ fontSize: 12 }}>NVI ↗</Text></Text>
              </Pressable>
            ))}
          </View>
          <View style={s.obs}>
            <Text style={s.italico}><Text style={{ fontWeight: '800', fontStyle: 'normal' }}>Pergunta de observação: </Text>{enc.obs}</Text>
          </View>
        </View>

        <View style={s.espirito}>
          <Text style={s.espiritoT}>ESPÍRITO SANTO NESTE ENCONTRO</Text>
          <Text style={s.texto}>{enc.es}</Text>
        </View>

        <Sec t="Doutrina em diálogo" />
        <View style={s.nucleo}>
          <Text style={s.nucleoT}>NÚCLEO TEOLÓGICO</Text>
          <Text style={s.nucleoP}>{enc.nuc}</Text>
        </View>
        <View style={s.naz}>
          <Text style={s.nazT}>CONEXÃO COM A DOUTRINA NAZARENA</Text>
          <Text style={s.texto}>{enc.naz}</Text>
        </View>
        <Pressable onPress={() => setAprof(a => !a)} style={s.detalhe}>
          <Text style={s.detalheT}>{aprof ? '▼' : '▶'} Aprofundamento teológico</Text>
          {aprof && <Text style={[s.texto, { marginTop: 10 }]}>{enc.aprof}</Text>}
        </Pressable>

        <Sec t="Perguntas para a conversa" />
        <View style={s.card}>
          {enc.perg.map((p: string, i: number) => (
            <View key={i} style={{ marginBottom: 16 }}>
              <Text style={s.negritoG}>{i + 1}. {p}</Text>
              <TextInput style={s.area} multiline placeholder="Escreva sua resposta…" placeholderTextColor="#9aa3b8"
                value={e.perg[i] || ''} onChangeText={v => mudar({ perg: { ...e.perg, [i]: v } })} />
            </View>
          ))}
        </View>

        <Sec t="Verifique o entendimento" />
        <View style={s.card}>
          <Text style={s.negritoG}>{enc.quiz[0]}</Text>
          {enc.quiz[1].map((o: string, i: number) => {
            const sel = e.quiz === i, certo = enc.quiz[2] === i;
            return (
              <Pressable key={i} onPress={() => mudar({ quiz: i }, true)}
                style={[s.check, sel && (certo ? s.quizOk : s.quizErro)]}>
                <View style={[s.radio, sel && { borderColor: certo ? C.ok : C.mar }]}>{sel && <View style={[s.radioPonto, { backgroundColor: certo ? C.ok : C.mar }]} />}</View>
                <Text style={[s.texto, { flex: 1 }]}>{o}</Text>
              </Pressable>
            );
          })}
          {e.quiz >= 0 && <Text style={[s.dica, { marginTop: 10 }]}>{enc.quiz[3]}</Text>}
        </View>

        <Sec t="Desafio da semana" />
        <View style={s.desafio}>
          <Text style={s.desafioT}>SEU DESAFIO</Text>
          <Text style={s.desafioP}>{enc.des}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.negritoG}>Dias praticados</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {e.dias.map((d: boolean, i: number) => (
              <Pressable key={i} onPress={() => { const dias = [...e.dias]; dias[i] = !dias[i]; mudar({ dias }, true); }} style={[s.dia, d && s.diaOn]}>
                <Text style={[s.diaT, d && { color: C.white }]}>Dia {i + 1}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.dica}>{e.dias.filter(Boolean).length}/5 dias</Text>
        </View>

        <Sec t="Registro do discípulo" />
        <Text style={s.dica}>Visível só para você e para o seu discipulador.</Text>
        {e.reg.map((linha: string[], i: number) => (
          <View key={i} style={s.card}>
            <Text style={s.negritoG}>Dia {i + 1}</Text>
            {COLS.map((rotulo, j) => (
              <View key={j} style={{ marginTop: 8 }}>
                <Text style={s.dica}>{rotulo}</Text>
                <TextInput style={s.campo} value={linha[j] || ''} onChangeText={v => {
                  const reg = e.reg.map((r: string[], ri: number) => ri === i ? r.map((c, cj) => cj === j ? v : c) : r);
                  mudar({ reg });
                }} />
              </View>
            ))}
          </View>
        ))}

        <Sec t="Mensagem de meio de semana" />
        <View style={s.card}>
          <Text style={s.italico}>“{enc.msg}”</Text>
          <Pressable style={s.fraco} onPress={() => { Share.share({ message: enc.msg }).catch(() => {}); }}>
            <Text style={s.fracoT}>Copiar ou enviar mensagem</Text>
          </Pressable>
        </View>

        <Sec t="Oração e compromisso" />
        <View style={s.card}>
          <Text style={s.negritoG}>Compromisso combinado</Text>
          <TextInput style={s.area} multiline placeholder="O que vocês combinaram para esta semana?" placeholderTextColor="#9aa3b8"
            value={e.comp} onChangeText={v => mudar({ comp: v })} />
        </View>

        <Pressable onPress={() => mudar({ done: !e.done }, true)} style={[s.concluir, e.done && s.concluirOk]}>
          <Text style={[s.concluirT, e.done && { color: C.navy }]}>{e.done ? '✓ Encontro concluído (desfazer)' : 'Marcar encontro como concluído'}</Text>
        </Pressable>
        {!!status && <Text style={[s.dica, { marginTop: 8, color: status.startsWith('Sem') ? C.mar : C.ok }]}>{status}</Text>}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Pressable style={[s.fraco, { flex: 1 }]} onPress={() => router.replace('/')}><Text style={s.fracoT}>← Início</Text></Pressable>
          {n < 10 && <Pressable style={[s.fraco, { flex: 2 }]} onPress={() => router.replace('/encontro/' + (n + 1))}><Text style={s.fracoT} numberOfLines={1}>{(ENC[n] as any).t} →</Text></Pressable>}
        </View>
      </ScrollView>
    </>
  );
}

const card = { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line } as const;
const s = StyleSheet.create({
  pilula: { alignSelf: 'flex-start', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 14, marginBottom: 10 },
  pilulaTexto: { color: C.white, fontWeight: '800', fontSize: 12 },
  capa: { backgroundColor: C.navy, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  capaNum: { fontSize: 56, fontWeight: '900' },
  capaTitulo: { color: C.white, fontSize: 24, fontWeight: '900', textTransform: 'uppercase' },
  capaSub: { color: '#c9d2ea', marginTop: 6, lineHeight: 20 },
  sec: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26, marginBottom: 10 },
  secChev: { color: C.navy, fontSize: 26, fontWeight: '900', transform: [{ rotate: '-90deg' }], width: 22, textAlign: 'center' },
  secTitulo: { color: C.navy, fontSize: 21, fontWeight: '900', textTransform: 'uppercase', flex: 1 },
  card,
  texto: { fontSize: 15, lineHeight: 22, color: C.ink },
  negrito: { fontWeight: '800', color: C.navy, fontSize: 15 },
  negritoG: { fontWeight: '800', color: C.ink, fontSize: 16, lineHeight: 23 },
  dica: { fontSize: 13, color: C.muted, lineHeight: 18, marginTop: 4 },
  italico: { fontStyle: 'italic', fontSize: 15, lineHeight: 22, color: C.ink, marginTop: 4 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, marginTop: 8 },
  checkOn: { backgroundColor: '#eaf9ff', borderColor: C.cy },
  caixa: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#9aa3b8', alignItems: 'center', justifyContent: 'center' },
  caixaOn: { backgroundColor: C.bl, borderColor: C.bl },
  visto: { color: C.white, fontWeight: '900', fontSize: 14 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#9aa3b8', alignItems: 'center', justifyContent: 'center' },
  radioPonto: { width: 10, height: 10, borderRadius: 5 },
  quizOk: { backgroundColor: '#e8f7ef', borderColor: C.ok },
  quizErro: { backgroundColor: '#fbeaea', borderColor: C.mar },
  abrir: { backgroundColor: C.paper, borderLeftWidth: 4, borderLeftColor: C.cy, borderRadius: 10, padding: 12 },
  verso: { backgroundColor: C.cy, borderRadius: 99, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start', marginBottom: 8 },
  versoOn: { backgroundColor: C.navy },
  versoTexto: { color: C.navy, fontWeight: '800', fontSize: 15 },
  obs: { backgroundColor: '#eef4ff', borderLeftWidth: 4, borderLeftColor: C.bl, borderRadius: 10, padding: 12, marginTop: 8 },
  espirito: { backgroundColor: '#fff6e8', borderWidth: 1, borderColor: '#f5d9b5', borderLeftWidth: 6, borderLeftColor: C.or, borderRadius: 16, padding: 16, marginBottom: 12 },
  espiritoT: { color: C.or, fontWeight: '900', fontSize: 15, marginBottom: 6, letterSpacing: 0.3 },
  nucleo: { backgroundColor: C.navy, borderLeftWidth: 6, borderLeftColor: C.cy, borderRadius: 16, padding: 18, marginBottom: 12 },
  nucleoT: { color: C.cy, fontWeight: '900', fontSize: 16, marginBottom: 8 },
  nucleoP: { color: C.white, fontSize: 17, fontWeight: '600', lineHeight: 25 },
  naz: { backgroundColor: '#f7eeee', borderLeftWidth: 6, borderLeftColor: C.mar, borderRadius: 16, padding: 18, marginBottom: 12 },
  nazT: { color: C.mar, fontWeight: '900', fontSize: 15, marginBottom: 6 },
  detalhe: { backgroundColor: C.white, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, borderRadius: 12, padding: 14 },
  detalheT: { color: C.bl, fontWeight: '800', fontSize: 15 },
  area: { borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, minHeight: 100, textAlignVertical: 'top', fontSize: 15, backgroundColor: C.white, color: C.ink, marginTop: 8 },
  campo: { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, backgroundColor: C.white, color: C.ink, marginTop: 4 },
  desafio: { backgroundColor: C.bl, borderRadius: 16, padding: 20, marginBottom: 12 },
  desafioT: { color: '#cfe0ff', fontWeight: '900', fontSize: 16, marginBottom: 8 },
  desafioP: { color: C.white, fontSize: 17, fontWeight: '600', lineHeight: 25 },
  dia: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 2, borderColor: C.line, backgroundColor: C.white },
  diaOn: { backgroundColor: C.bl, borderColor: C.bl },
  diaT: { fontWeight: '800', color: C.navy },
  fraco: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginTop: 10 },
  fracoT: { color: C.navy, fontWeight: '700' },
  concluir: { backgroundColor: C.or, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  concluirOk: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  concluirT: { color: C.white, fontWeight: '900', fontSize: 16 },
});
