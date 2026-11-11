import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ENC, linkVersiculo } from '../../src/content';
import { api, sanitizarEncontro } from '../../src/lib/api';
import { useSessao } from '../../src/lib/sessao';
import { Botao, Carregando, estilos } from '../../src/lib/ui';
import { C } from '../../src/lib/tema';

const VAZIO = () => ({
  bal: [false, false, false], txt: [false, false, false], perg: {} as Record<string, string>,
  dias: [false, false, false, false, false], reg: [['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', '']],
  quiz: -1, comp: '', des: '', done: false,
});

function Secao({ titulo, texto }: { titulo: string; texto?: string }) {
  if (!texto) return null;
  return (
    <View style={estilos.card}>
      <Text style={[estilos.texto, { fontWeight: '800', color: C.navy }]}>{titulo}</Text>
      <Text style={[estilos.texto, { marginTop: 6 }]}>{texto}</Text>
    </View>
  );
}

export default function Encontro() {
  const { n: nStr } = useLocalSearchParams<{ n: string }>();
  const n = Number(nStr);
  const enc: any = ENC[n - 1];
  const { usuario } = useSessao();
  const [e, setE] = useState<any>(null);
  const salvoEm = useRef<any>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!usuario) return;
    api.progressoDe(usuario.id).then(p => setE({ ...VAZIO(), ...(p[n] || {}) }));
  }, [usuario, n]);

  // salva com atraso (evita gravar a cada tecla)
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

  const abrirVersiculo = (ref: string, i: number) => {
    const novo = [...e.txt]; novo[i] = true;
    mudar({ txt: novo });
    Linking.openURL(linkVersiculo(ref));
  };

  return (
    <>
      <Stack.Screen options={{ title: n + '. ' + enc.t }} />
      <ScrollView contentContainerStyle={estilos.pagina}>
        <Text style={estilos.titulo}>{enc.t}</Text>
        <Text style={estilos.texto}>{enc.s}</Text>

        <Secao titulo="Abertura" texto={enc.abrir} />

        <View style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '800', color: C.navy }]}>Textos para ler</Text>
          {enc.txt.map((ref: string, i: number) => (
            <Pressable key={ref} onPress={() => abrirVersiculo(ref, i)} style={[estilos.chip, e.txt[i] && estilos.chipOn, { marginTop: 8 }]}>
              <Text style={[estilos.chipTexto, e.txt[i] && estilos.chipTextoOn]}>{e.txt[i] ? '✓ ' : ''}{ref} (NVI)</Text>
            </Pressable>
          ))}
          <Text style={estilos.nota}>Toque para abrir no aplicativo YouVersion (NVI). Instale o YouVersion se ainda não tiver.</Text>
          <Text style={[estilos.texto, { marginTop: 10 }]}>{enc.obs}</Text>
        </View>

        <View style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '800', color: C.navy }]}>Para refletir</Text>
          {enc.bal.map((b: string, i: number) => (
            <Pressable key={i} onPress={() => { const novo = [...e.bal]; novo[i] = !novo[i]; mudar({ bal: novo }, true); }} style={{ flexDirection: 'row', marginTop: 8 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>{e.bal[i] ? '☑' : '☐'}</Text>
              <Text style={[estilos.texto, { flex: 1 }]}>{b}</Text>
            </Pressable>
          ))}
        </View>

        <Secao titulo="Ponto central" texto={enc.nuc} />
        <Secao titulo="Perspectiva nazarena" texto={enc.naz} />
        <Secao titulo="Aprofundamento" texto={enc.aprof} />
        <Secao titulo="Essência: Espírito Santo" texto={enc.es} />

        <View style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '800', color: C.navy }]}>Suas respostas</Text>
          {enc.perg.map((p: string, i: number) => (
            <View key={i} style={{ marginTop: 10 }}>
              <Text style={estilos.texto}>{p}</Text>
              <TextInput style={[estilos.input, estilos.inputMulti]} multiline value={e.perg[i] || ''} onChangeText={v => mudar({ perg: { ...e.perg, [i]: v } })} />
            </View>
          ))}
        </View>

        <View style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '800', color: C.navy }]}>Verificação rápida</Text>
          <Text style={[estilos.texto, { marginTop: 6 }]}>{enc.quiz[0]}</Text>
          {enc.quiz[1].map((o: string, i: number) => (
            <Pressable key={i} onPress={() => mudar({ quiz: i }, true)} style={{ flexDirection: 'row', marginTop: 8 }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>{e.quiz === i ? '◉' : '○'}</Text>
              <Text style={[estilos.texto, { flex: 1 }]}>{o}</Text>
            </Pressable>
          ))}
          {e.quiz >= 0 && <Text style={[estilos.nota, { marginTop: 8 }]}>{e.quiz === enc.quiz[2] ? '✓ ' : ''}{enc.quiz[3]}</Text>}
        </View>

        <View style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '800', color: C.navy }]}>Registro da semana</Text>
          <Text style={estilos.nota}>Visível só para você e para o seu discipulador.</Text>
          {e.reg.map((linha: string[], i: number) => (
            <View key={i} style={{ marginTop: 10, borderTopWidth: 1, borderColor: C.line, paddingTop: 8 }}>
              <Text style={[estilos.texto, { fontWeight: '700' }]}>Dia {i + 1}</Text>
              {['O que percebi em Deus', 'O que pratiquei', 'Próximo passo'].map((rotulo, j) => (
                <View key={j}>
                  <Text style={estilos.nota}>{rotulo}</Text>
                  <TextInput style={estilos.input} value={linha[j + 1] || ''} onChangeText={v => {
                    const reg = e.reg.map((r: string[], ri: number) => ri === i ? r.map((c, cj) => cj === j + 1 ? v : c) : r);
                    mudar({ reg });
                  }} />
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '800', color: C.navy }]}>Dias do desafio</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {e.dias.map((d: boolean, i: number) => (
              <Pressable key={i} onPress={() => { const dias = [...e.dias]; dias[i] = !dias[i]; mudar({ dias }, true); }} style={[estilos.chip, d && estilos.chipOn]}>
                <Text style={[estilos.chipTexto, d && estilos.chipTextoOn]}>Dia {i + 1}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={estilos.nota}>{e.dias.filter(Boolean).length}/5 dias</Text>
        </View>

        <View style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '800', color: C.navy }]}>Compromisso</Text>
          <Text style={estilos.texto}>{enc.des}</Text>
          <TextInput style={[estilos.input, estilos.inputMulti]} multiline value={e.comp} onChangeText={v => mudar({ comp: v })} />
        </View>

        <Botao
          texto={e.done ? 'Encontro concluído ✓ (desfazer)' : 'Marcar encontro como concluído'}
          fraco={e.done}
          onPress={() => mudar({ done: !e.done }, true)}
        />
        <Text style={[estilos.nota, { marginTop: 10 }]}>{enc.msg}</Text>
        {!!status && <Text style={[estilos.nota, { marginTop: 6, color: status.startsWith('Sem') ? C.mar : C.ok }]}>{status}</Text>}
      </ScrollView>
    </>
  );
}
