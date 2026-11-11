import { Redirect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ENC, BLOCOS } from '../src/content';
import { api, Perfil, ErroApp } from '../src/lib/api';
import { useSessao } from '../src/lib/sessao';
import { Barra, Botao, Carregando, Semanas, estilos } from '../src/lib/ui';
import { C } from '../src/lib/tema';

const NOMES_MODO: Record<string, string> = { aluno: 'Discípulo', discipulador: 'Discipulador', admin: 'Administração' };

function Seletor() {
  const { modos, modoAtual, setModo } = useSessao();
  if (modos.length < 2) return null;
  return (
    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
      {modos.map(m => (
        <Pressable key={m} onPress={() => setModo(m)} style={[estilos.chip, { flex: 1, alignItems: 'center' }, modoAtual === m && estilos.chipOn]}>
          <Text style={[estilos.chipTexto, modoAtual === m && estilos.chipTextoOn]}>{NOMES_MODO[m]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Avisos() {
  const [lista, setLista] = useState<{ id: number; texto: string }[]>([]);
  const carregar = useCallback(() => { api.avisos().then(setLista).catch(() => setLista([])); }, []);
  useEffect(() => { carregar(); }, [carregar]);
  if (!lista.length) return null;
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={estilos.subtitulo}>Avisos</Text>
      {lista.map(a => (
        <View key={a.id} style={estilos.card}>
          <Text style={estilos.texto}>{a.texto}</Text>
          <Botao fraco texto="Entendi" onPress={async () => { await api.marcarAvisoLido(a.id); carregar(); }} />
        </View>
      ))}
    </View>
  );
}

function Atalhos({ itens }: { itens: { rotulo: string; rota: string }[] }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
      {itens.map(i => (
        <Pressable key={i.rota} onPress={() => router.push(i.rota as any)} style={[estilos.chip, { marginRight: 8 }]}>
          <Text style={estilos.chipTexto}>{i.rotulo}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function HomeAluno() {
  const { discipulador } = useSessao();
  const router = useRouter();
  const [prog, setProg] = useState<Record<number, any>>({});
  const { usuario } = useSessao();
  useEffect(() => { if (usuario) api.progressoDe(usuario.id).then(setProg).catch(() => {}); }, [usuario]);
  return (
    <>
      <Text style={estilos.titulo}>Olá, {usuario ? usuario.nome.split(' ')[0] : ''}</Text>
      <Text style={estilos.texto}>{discipulador ? 'Seu discipulador: ' + discipulador.nome : 'Você ainda não tem um discipulador designado.'}</Text>
      <Avisos />
      <Atalhos itens={[{ rotulo: 'Depois do décimo', rota: '/depois' }, { rotulo: 'Ritmo do encontro', rota: '/ritmo' }]} />
      <Text style={estilos.subtitulo}>Encontros</Text>
      {ENC.map((e: any) => {
        const feito = prog[e.n] && prog[e.n].done;
        return (
          <Pressable key={e.n} onPress={() => router.push('/encontro/' + e.n)} style={estilos.card}>
            <View style={estilos.linha}>
              <Text style={[estilos.texto, { fontWeight: '700', flex: 1 }]}>{e.n}. {e.t}</Text>
              <Text style={{ color: feito ? C.ok : C.muted, fontWeight: '700' }}>{feito ? 'Concluído' : 'Abrir'}</Text>
            </View>
            <Text style={estilos.nota}>{BLOCOS[e.n] ? BLOCOS[e.n][0] : ''}</Text>
          </Pressable>
        );
      })}
    </>
  );
}

function CartaoDiscipulo({ d }: { d: Perfil }) {
  const router = useRouter();
  const [m, setM] = useState<any>(null);
  useEffect(() => { api.metricas(d.id).then(setM).catch(() => setM(null)); }, [d.id]);
  return (
    <Pressable onPress={() => router.push({ pathname: '/discipulo/[id]', params: { id: d.id, nome: d.nome } })} style={estilos.card}>
      <Text style={[estilos.texto, { fontWeight: '800' }]}>{d.nome}</Text>
      {m ? (
        <>
          <Barra valor={m.concluidos} total={10} />
          <Text style={[estilos.nota, { marginTop: 6 }]}>
            {m.diasAtivos7 ? m.diasAtivos7 + ' dia(s) ativo(s) nos últimos 7' : 'Sem atividade nos últimos 7 dias'}
          </Text>
          <Semanas dados={m.semanas} />
        </>
      ) : <Text style={estilos.nota}>Carregando progresso…</Text>}
      <Text style={{ color: C.bl, fontWeight: '700', marginTop: 8 }}>Ver acompanhamento →</Text>
    </Pressable>
  );
}

function HomeDiscipulador() {
  const router = useRouter();
  const [lista, setLista] = useState<Perfil[] | null>(null);
  useEffect(() => { api.discipulos().then(setLista).catch(() => setLista([])); }, []);
  return (
    <>
      <Text style={estilos.titulo}>Conduzir é viver junto</Text>
      <Text style={estilos.texto}>Você conduz conversas, não dá aulas. Sua vida com Deus é o primeiro material que o discípulo vê.</Text>
      <Avisos />
      <Atalhos itens={[{ rotulo: 'Relatórios', rota: '/relatorios' }, { rotulo: 'Avaliação pastoral', rota: '/avaliacao' }, { rotulo: 'Ritmo', rota: '/ritmo' }]} />
      <Text style={estilos.subtitulo}>Manual do discipulador</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {ENC.map((e: any) => (
          <Pressable key={e.n} onPress={() => router.push('/conduzir/' + e.n)} style={[estilos.chip, { marginRight: 6 }]}>
            <Text style={estilos.chipTexto}>{e.n}. {e.t}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={estilos.subtitulo}>Progresso dos meus discípulos</Text>
      {lista === null && <Carregando />}
      {lista && lista.length === 0 && <Text style={estilos.nota}>Nenhum discípulo designado ainda. A liderança faz essa indicação.</Text>}
      {lista && lista.map(d => <CartaoDiscipulo key={d.id} d={d} />)}
    </>
  );
}

function PainelAdmin() {
  const { caps, recarregar } = useSessao();
  const [usuarios, setUsuarios] = useState<any[] | null>(null);
  const [codigo, setCodigo] = useState('');
  const [discs, setDiscs] = useState<any[]>([]);
  const carregar = useCallback(async () => {
    const u = await api.usuariosAdmin();
    setUsuarios(u);
    setDiscs(u.filter((x: any) => x.papel === 'discipulador'));
  }, []);
  useEffect(() => { carregar().catch(() => setUsuarios([])); }, [carregar]);

  function designar(aluno: any) {
    const botoes = discs.map((d: any) => ({
      text: d.nome,
      onPress: async () => {
        try { await api.designar(aluno.id, d.id); await carregar(); }
        catch (e: any) { Alert.alert('Não foi possível designar', e.message); }
      },
    }));
    if (aluno.discipuladorId) botoes.push({ text: 'Remover discipulador', onPress: async () => { await api.designar(aluno.id, null); carregar(); } } as any);
    botoes.push({ text: 'Cancelar', style: 'cancel' } as any);
    Alert.alert('Designar discipulador', 'Para ' + aluno.nome, botoes as any);
  }

  async function liberar() {
    try { await api.ativarAcesso(codigo.trim()); await recarregar(); Alert.alert('Acesso liberado', 'Agora aparecem os três modos.'); }
    catch (e: any) { Alert.alert('Código inválido', e.message); }
  }

  return (
    <>
      <Text style={estilos.titulo}>Administração</Text>
      {!caps.curso && (
        <View style={estilos.card}>
          <Text style={estilos.subtitulo}>Liberar versão completa</Text>
          <Text style={estilos.nota}>Digite o código de acesso para usar também as funções de discípulo e discipulador.</Text>
          <TextInput style={estilos.input} value={codigo} onChangeText={setCodigo} autoCapitalize="none" />
          <Botao texto="Liberar acesso" onPress={liberar} />
        </View>
      )}
      <Text style={estilos.subtitulo}>Designações</Text>
      <Text style={estilos.nota}>Toque em um discípulo para designar o discipulador. Respostas e registro não aparecem aqui.</Text>
      {usuarios === null && <Carregando />}
      {usuarios && usuarios.filter((u: any) => u.papel === 'aluno').map((u: any) => {
        const disc = usuarios.find((x: any) => x.id === u.discipuladorId);
        return (
          <Pressable key={u.id} onPress={() => designar(u)} style={estilos.card}>
            <Text style={[estilos.texto, { fontWeight: '700' }]}>{u.nome}</Text>
            <Text style={estilos.nota}>Discipulador: {disc ? disc.nome : 'nenhum'} · Encontros concluídos: {u.concluidos.length}/10</Text>
          </Pressable>
        );
      })}
    </>
  );
}

export default function Home() {
  const { carregando, usuario, modoAtual } = useSessao();
  if (carregando) return <Carregando />;
  if (!usuario) return <Redirect href="/login" />;
  if (usuario.pendente) return <Redirect href="/escolher" />;
  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Seletor />
      {modoAtual === 'admin' && <Atalhos itens={[{ rotulo: 'Relatórios', rota: '/relatorios' }]} />}
      {modoAtual === 'aluno' && <HomeAluno />}
      {modoAtual === 'discipulador' && <HomeDiscipulador />}
      {modoAtual === 'admin' && <PainelAdmin />}
    </ScrollView>
  );
}
