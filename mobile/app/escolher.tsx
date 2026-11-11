import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../src/lib/api';
import { useSessao } from '../src/lib/sessao';
import { Botao, estilos } from '../src/lib/ui';
import { C } from '../src/lib/tema';

// Pergunta feita a quem entrou com Google pela primeira vez
export default function Escolher() {
  const router = useRouter();
  const { recarregar, usuario } = useSessao();
  const [papel, setPapel] = useState<'aluno' | 'discipulador'>('aluno');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    setErro('');
    if (papel === 'discipulador' && !codigo.trim()) { setErro('Digite o código de discipulador. Peça à liderança.'); return; }
    setEnviando(true);
    try {
      await api.escolherPapel(papel, codigo.trim());
      await recarregar();
      router.replace('/');
    } catch (e: any) {
      setErro(e.message || 'Não foi possível salvar sua escolha.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Text style={estilos.titulo}>Bem-vindo{usuario ? ', ' + usuario.nome.split(' ')[0] : ''}!</Text>
      <Text style={estilos.texto}>Antes de começar, diga qual é o seu caminho. Essa escolha é feita uma única vez.</Text>

      <View style={[estilos.card, { marginTop: 12 }]}>
        <Text style={[estilos.texto, { fontWeight: '800' }]}>Eu sou</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          {(['aluno', 'discipulador'] as const).map(p => (
            <Pressable key={p} onPress={() => setPapel(p)} style={[estilos.chip, { flex: 1, alignItems: 'center' }, papel === p && estilos.chipOn]}>
              <Text style={[estilos.chipTexto, papel === p && estilos.chipTextoOn]}>{p === 'aluno' ? 'Discípulo' : 'Discipulador'}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[estilos.nota, { marginTop: 8 }]}>
          {papel === 'aluno' ? 'Você vai fazer os 10 encontros, com acompanhamento de um discipulador.' : 'Você vai conduzir discípulos. Para isso é preciso o código da liderança.'}
        </Text>

        {papel === 'discipulador' && (
          <>
            <Text style={[estilos.texto, { marginTop: 12 }]}>Código de discipulador</Text>
            <TextInput style={estilos.input} value={codigo} onChangeText={setCodigo} autoCapitalize="none" />
          </>
        )}

        {!!erro && <Text style={estilos.erro}>{erro}</Text>}
        <Botao texto={enviando ? 'Salvando…' : 'Continuar'} onPress={confirmar} disabled={enviando} />
      </View>
      <Text style={[estilos.nota, { color: C.muted }]}>Se escolheu o caminho errado, fale com a liderança.</Text>
    </ScrollView>
  );
}
