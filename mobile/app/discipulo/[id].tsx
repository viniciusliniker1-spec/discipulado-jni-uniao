import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ENC } from '../../src/content';
import { api, notaVazia } from '../../src/lib/api';
import { Barra, Botao, Carregando, Semanas, estilos } from '../../src/lib/ui';
import { C } from '../../src/lib/tema';

const CAMPOS: [string, string][] = [
  ['percepcoes', 'O que percebi na vida dele(a)'],
  ['compromisso', 'Compromisso combinado'],
  ['acompanhamento', 'Acompanhamento e próximo passo'],
  ['anotacoes', 'Anotações da conversa'],
];

export default function Discipulo() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome: string }>();
  const [m, setM] = useState<any>(null);
  const [prog, setProg] = useState<Record<number, any>>({});
  const [n, setN] = useState(1);
  const [nota, setNota] = useState<any>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.metricas(id).then(setM).catch(() => setM(null));
    api.progressoDe(id).then(setProg).catch(() => setProg({}));
  }, [id]);

  useEffect(() => {
    setNota(null);
    api.notasDe(id, n).then(setNota).catch(() => setNota(notaVazia()));
  }, [id, n]);

  async function salvar() {
    setStatus('');
    try { await api.salvarNotas(id, n, nota); setStatus('Anotações salvas.'); }
    catch (e: any) { setStatus(e.message); }
  }

  return (
    <>
      <Stack.Screen options={{ title: nome || 'Discípulo' }} />
      <ScrollView contentContainerStyle={estilos.pagina}>
        <Text style={estilos.titulo}>{nome}</Text>
        {!m ? <Carregando /> : (
          <View style={estilos.card}>
            <Barra valor={m.concluidos} total={10} />
            <Text style={[estilos.nota, { marginTop: 6 }]}>{m.diasAtivos7 ? m.diasAtivos7 + ' dia(s) ativo(s) nos últimos 7' : 'Sem atividade nos últimos 7 dias'}</Text>
            <Text style={[estilos.texto, { marginTop: 10, fontWeight: '700' }]}>Encontros</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              {ENC.map((e: any) => {
                const feito = prog[e.n] && prog[e.n].done;
                return <View key={e.n} style={[estilos.chip, { backgroundColor: feito ? C.ok : '#c9d2ea', borderColor: 'transparent' }]}><Text style={{ color: feito ? C.white : C.navy, fontWeight: '700' }}>{e.n}</Text></View>;
              })}
            </View>
            <Text style={[estilos.texto, { marginTop: 10, fontWeight: '700' }]}>Atividade nas últimas 8 semanas</Text>
            <Semanas dados={m.semanas} />
          </View>
        )}

        <Text style={estilos.subtitulo}>Anotações do discipulador</Text>
        <Text style={estilos.nota}>Só você vê estas anotações.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {ENC.map((e: any) => (
            <Pressable key={e.n} onPress={() => setN(e.n)} style={[estilos.chip, n === e.n && estilos.chipOn]}>
              <Text style={[estilos.chipTexto, n === e.n && estilos.chipTextoOn]}>{e.n}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[estilos.texto, { fontWeight: '700' }]}>{ENC[n - 1].t}</Text>
        {!nota ? <Carregando /> : (
          <View style={estilos.card}>
            {CAMPOS.map(([campo, rotulo]) => (
              <View key={campo} style={{ marginTop: 8 }}>
                <Text style={estilos.texto}>{rotulo}</Text>
                <TextInput style={[estilos.input, estilos.inputMulti]} multiline value={nota[campo] || ''} onChangeText={v => setNota({ ...nota, [campo]: v })} />
              </View>
            ))}
            <Botao texto="Salvar anotações" onPress={salvar} />
            {!!status && <Text style={[estilos.nota, { marginTop: 8 }]}>{status}</Text>}
          </View>
        )}
      </ScrollView>
    </>
  );
}
