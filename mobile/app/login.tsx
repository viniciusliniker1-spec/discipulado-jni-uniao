import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../src/lib/api';
import { useSessao } from '../src/lib/sessao';
import { Botao, estilos } from '../src/lib/ui';
import { C } from '../src/lib/tema';
import { Marca } from '../src/lib/marca';

function Campo({ rotulo, ...props }: { rotulo: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput placeholderTextColor={C.muted} style={estilos.input} {...props} />
    </View>
  );
}

function Opcao({ ativo, texto, onPress }: { ativo: boolean; texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[estilos.segmento, ativo && estilos.segmentoOn]}>
      <Text style={[estilos.segmentoTexto, ativo && estilos.segmentoTextoOn]}>{texto}</Text>
    </Pressable>
  );
}

export default function Login() {
  const router = useRouter();
  const { recarregar } = useSessao();
  const [aba, setAba] = useState<'entrar' | 'cadastro'>('entrar');
  const [papel, setPapel] = useState<'aluno' | 'discipulador'>('aluno');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setErro('');
    if (!email.trim() || !senha) { setErro('Preencha e-mail e senha.'); return; }
    setEnviando(true);
    try {
      if (aba === 'entrar') await api.entrar(email.trim(), senha);
      else {
        if (!nome.trim()) throw new Error('Informe seu nome.');
        if (senha.length < 6) throw new Error('A senha precisa de pelo menos 6 caracteres.');
        await api.cadastrar(nome.trim(), email.trim(), senha, papel, codigo.trim());
        await api.entrar(email.trim(), senha);
      }
      await recarregar();
      router.replace('/');
    } catch (e: any) {
      setErro(e.message || 'Não foi possível entrar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={estilos.pagina} keyboardShouldPersistTaps="handled">
        <View style={estilos.cabecalhoMarca}>
          <Marca tamanho={64} />
          <Text style={estilos.marcaTitulo}>DISCIPULADO</Text>
          <Text style={estilos.marcaSub}>JNI União · acompanhamento individual</Text>
        </View>

        <View style={estilos.segmentos}>
          <Opcao ativo={aba === 'entrar'} texto="Entrar" onPress={() => { setAba('entrar'); setErro(''); }} />
          <Opcao ativo={aba === 'cadastro'} texto="Criar conta" onPress={() => { setAba('cadastro'); setErro(''); }} />
        </View>

        <View style={[estilos.card, { padding: 18 }]}>
          {aba === 'cadastro' && (
            <>
              <Campo rotulo="Nome" value={nome} onChangeText={setNome} placeholder="Como você se chama?" />
              <Text style={[estilos.rotulo, { marginTop: 14 }]}>Eu sou</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Opcao ativo={papel === 'aluno'} texto="Discípulo" onPress={() => setPapel('aluno')} />
                <Opcao ativo={papel === 'discipulador'} texto="Discipulador" onPress={() => setPapel('discipulador')} />
              </View>
              {papel === 'discipulador' && (
                <>
                  <Campo rotulo="Código de discipulador" value={codigo} onChangeText={setCodigo} autoCapitalize="none" placeholder="Peça à liderança" />
                </>
              )}
            </>
          )}
          <Campo rotulo="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="seu@email.com" />
          <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry placeholder={aba === 'cadastro' ? 'Mínimo de 6 caracteres' : 'Sua senha'} />
          {!!erro && <Text style={estilos.erro}>{erro}</Text>}
          <View style={{ marginTop: 18 }}>
            <Botao texto={enviando ? 'Aguarde…' : aba === 'entrar' ? 'Entrar' : 'Criar conta'} onPress={enviar} disabled={enviando} />
          </View>
        </View>

        <Text style={[estilos.nota, { textAlign: 'center', marginTop: 4 }]}>
          {aba === 'entrar' ? 'Ainda não tem conta? Toque em "Criar conta".' : 'Discipulador precisa do código fornecido pela liderança.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
