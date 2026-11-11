import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/lib/api';
import { useSessao } from '../src/lib/sessao';
import { Barra, Carregando, Semanas, estilos } from '../src/lib/ui';
import { dataBR, statusAtividade } from '../src/lib/status';
import { C } from '../src/lib/tema';

function Linha({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View style={[estilos.linha, { paddingVertical: 4 }]}>
      <Text style={estilos.nota}>{titulo}</Text>
      <Text style={[estilos.texto, { fontWeight: '700' }]}>{valor}</Text>
    </View>
  );
}

function RelatorioDiscipulador() {
  const router = useRouter();
  const [r, setR] = useState<any>(null);
  useEffect(() => { api.relatorioDiscipulador().then(setR).catch(() => setR({ discipulos: [], minhasNotas: { ultimaAtividade: null, semanas: [0,0,0,0,0,0,0,0] } })); }, []);
  if (!r) return <Carregando />;
  return (
    <>
      <View style={estilos.card}>
        <Text style={[estilos.texto, { fontWeight: '800' }]}>Suas anotações nos discípulos</Text>
        <Text style={estilos.nota}>Última vez que você salvou notas: {dataBR(r.minhasNotas.ultimaAtividade)}</Text>
        <Semanas dados={r.minhasNotas.semanas} />
      </View>
      {r.discipulos.length === 0 && <Text style={estilos.nota}>Nenhum discípulo designado ainda.</Text>}
      {r.discipulos.map((d: any) => (
        <Pressable key={d.id} onPress={() => router.push({ pathname: '/discipulo/[id]', params: { id: d.id, nome: d.nome } })} style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '800' }]}>{d.nome}</Text>
          <Text style={estilos.nota}>{statusAtividade(d.ultimaAtividade, d.diasAtivos7)} · última: {dataBR(d.ultimaAtividade)}</Text>
          <View style={{ marginTop: 6 }}><Barra valor={d.concluidos} total={10} /></View>
          <Linha titulo="Dias do desafio" valor={d.dias + '/50'} />
          <Linha titulo="Respostas" valor={String(d.respostas)} />
          <Linha titulo="Registros" valor={String(d.registros)} />
          <Linha titulo="Notas suas" valor={String(d.notas)} />
          <Semanas dados={d.semanas} />
        </Pressable>
      ))}
    </>
  );
}

function RelatorioAdmin() {
  const [r, setR] = useState<any>(null);
  useEffect(() => { api.relatorioAdmin().then(setR).catch(() => setR({ alunos: [], discipuladores: [] })); }, []);
  if (!r) return <Carregando />;
  return (
    <>
      <Text style={estilos.subtitulo}>Por discipulador</Text>
      {r.discipuladores.length === 0 && <Text style={estilos.nota}>Nenhum discipulador ainda.</Text>}
      {r.discipuladores.map((d: any) => (
        <View key={d.id} style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '800' }]}>{d.nome}</Text>
          <Linha titulo="Discípulos" valor={String(d.discipulos)} />
          <Linha titulo="Média de encontros" valor={d.mediaConcluidos + '/10'} />
          <Linha titulo="Sem atividade (7 dias)" valor={String(d.semAtividade7)} />
        </View>
      ))}
      <Text style={estilos.subtitulo}>Por discípulo</Text>
      <Text style={estilos.nota}>Mostra só números e datas. Respostas e registro não aparecem aqui.</Text>
      {r.alunos.map((a: any) => (
        <View key={a.id} style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '800' }]}>{a.nome}</Text>
          <Text style={estilos.nota}>Discipulador: {a.discipulador || '—'}</Text>
          <Text style={estilos.nota}>{statusAtividade(a.ultimaAtividade, a.diasAtivos7)} · última: {dataBR(a.ultimaAtividade)}</Text>
          <View style={{ marginTop: 6 }}><Barra valor={a.concluidos} total={10} /></View>
          <Linha titulo="Dias do desafio" valor={a.dias + '/50'} />
          <Semanas dados={a.semanas} />
        </View>
      ))}
    </>
  );
}

export default function Relatorios() {
  const { modoAtual } = useSessao();
  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Text style={estilos.titulo}>Relatórios</Text>
      {modoAtual === 'admin' ? <RelatorioAdmin /> : <RelatorioDiscipulador />}
    </ScrollView>
  );
}
