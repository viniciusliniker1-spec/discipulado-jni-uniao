import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../src/lib/api';
import { useSessao } from '../src/lib/sessao';
import { Botao, estilos } from '../src/lib/ui';
import { C } from '../src/lib/tema';

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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={estilos.pagina}>
        <Text style={[estilos.titulo, { textAlign: 'center', marginTop: 20 }]}>JNI União</Text>
        <Text style={[estilos.nota, { textAlign: 'center', marginBottom: 18 }]}>Discipulado individual</Text>

        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
          {(['entrar', 'cadastro'] as const).map(a => (
            <Pressable key={a} onPress={() => { setAba(a); setErro(''); }} style={[estilos.chip, { flex: 1, alignItems: 'center' }, aba === a && estilos.chipOn]}>
              <Text style={[estilos.chipTexto, aba === a && estilos.chipTextoOn]}>{a === 'entrar' ? 'Entrar' : 'Criar conta'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={estilos.card}>
          {aba === 'cadastro' && (
            <>
              <Text style={estilos.texto}>Nome</Text>
              <TextInput style={estilos.input} value={nome} onChangeText={setNome} />
              <Text style={[estilos.texto, { marginTop: 12 }]}>Eu sou</Text>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                {(['aluno', 'discipulador'] as const).map(p => (
                  <Pressable key={p} onPress={() => setPapel(p)} style={[estilos.chip, papel === p && estilos.chipOn]}>
                    <Text style={[estilos.chipTexto, papel === p && estilos.chipTextoOn]}>{p === 'aluno' ? 'Discípulo' : 'Discipulador'}</Text>
                  </Pressable>
                ))}
              </View>
              {papel === 'discipulador' && (
                <>
                  <Text style={[estilos.texto, { marginTop: 8 }]}>Código de discipulador</Text>
                  <TextInput style={estilos.input} value={codigo} onChangeText={setCodigo} autoCapitalize="none" />
                  <Text style={estilos.nota}>Peça o código à liderança.</Text>
                </>
              )}
            </>
          )}
          <Text style={[estilos.texto, { marginTop: 12 }]}>E-mail</Text>
          <TextInput style={estilos.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Text style={[estilos.texto, { marginTop: 12 }]}>Senha</Text>
          <TextInput style={estilos.input} value={senha} onChangeText={setSenha} secureTextEntry />
          {!!erro && <Text style={estilos.erro}>{erro}</Text>}
          <Botao texto={enviando ? 'Aguarde…' : aba === 'entrar' ? 'Entrar' : 'Criar conta'} onPress={enviar} disabled={enviando} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
