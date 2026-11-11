import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../src/lib/api';
import { useSessao } from '../src/lib/sessao';
import { C } from '../src/lib/tema';

function Campo({ rotulo, ...props }: { rotulo: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <TextInput placeholderTextColor="#9aa3b8" style={s.input} {...props} />
    </View>
  );
}

function Aba({ ativo, texto, onPress }: { ativo: boolean; texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.aba, ativo && s.abaOn]}>
      <Text style={[s.abaTexto, ativo && s.abaTextoOn]}>{texto}</Text>
    </Pressable>
  );
}

function Escolha({ ativo, texto, onPress }: { ativo: boolean; texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.escolha, ativo && s.escolhaOn]}>
      <Text style={[s.escolhaTexto, ativo && s.escolhaTextoOn]}>{texto}</Text>
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
  const [verSenha, setVerSenha] = useState(false);
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

  const cadastro = aba === 'cadastro';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
        {/* Topo com a marca */}
        <View style={s.topo}>
          <Image source={require('../assets/icon.png')} style={s.icone} />
          <Text style={s.marca}>DISCIPULADO</Text>
          <Text style={s.marcaSub}>JNI União · acompanhamento individual</Text>
          <Text style={s.frase}>
            Cresça na fé. <Text style={{ color: C.or }}>Caminhe com Jesus.</Text>
          </Text>
          <View style={s.faixa}>
            <View style={{ flex: 1, backgroundColor: C.cy }} />
            <View style={{ flex: 1, backgroundColor: C.bl }} />
            <View style={{ flex: 1, backgroundColor: C.or }} />
          </View>
        </View>

        {/* Abas sobrepostas ao cartão */}
        <View style={s.abas}>
          <Aba ativo={!cadastro} texto="Entrar" onPress={() => { setAba('entrar'); setErro(''); }} />
          <Aba ativo={cadastro} texto="Criar conta" onPress={() => { setAba('cadastro'); setErro(''); }} />
        </View>

        <View style={s.cartao}>
          {cadastro && (
            <>
              <Campo rotulo="Nome" value={nome} onChangeText={setNome} placeholder="Como você se chama?" />
              <Text style={[s.rotulo, { marginTop: 16 }]}>Eu sou</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Escolha ativo={papel === 'aluno'} texto="Discípulo" onPress={() => setPapel('aluno')} />
                <Escolha ativo={papel === 'discipulador'} texto="Discipulador" onPress={() => setPapel('discipulador')} />
              </View>
              {papel === 'discipulador' && (
                <Campo rotulo="Código de discipulador" value={codigo} onChangeText={setCodigo} autoCapitalize="none" placeholder="Peça à liderança" />
              )}
            </>
          )}

          <Campo rotulo="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="seu@email.com" />

          <View style={{ marginTop: 16 }}>
            <Text style={s.rotulo}>Senha</Text>
            <View style={s.senhaBox}>
              <TextInput
                placeholderTextColor="#9aa3b8"
                style={[s.input, { flex: 1, marginTop: 0, borderWidth: 0, backgroundColor: 'transparent' }]}
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!verSenha}
                placeholder={cadastro ? 'Mínimo de 6 caracteres' : 'Sua senha'}
              />
              <Pressable onPress={() => setVerSenha(v => !v)} hitSlop={10}>
                <Text style={s.mostrar}>{verSenha ? 'Ocultar' : 'Mostrar'}</Text>
              </Pressable>
            </View>
          </View>

          {!!erro && <Text style={s.erro}>{erro}</Text>}

          <Pressable onPress={enviar} disabled={enviando} style={[s.botao, enviando && { opacity: 0.6 }]}>
            <Text style={s.botaoTexto}>{enviando ? 'Aguarde…' : cadastro ? 'Criar conta' : 'Entrar'}</Text>
          </Pressable>

          <View style={s.separador}>
            <View style={s.linhaSep} />
            <Text style={s.ou}>Ou</Text>
            <View style={s.linhaSep} />
          </View>

          <View style={s.dica}>
            <View style={s.dicaIcone}><Text style={s.dicaIconeTexto}>?</Text></View>
            <Text style={s.dicaTexto}>
              {cadastro ? 'Discipulador precisa do código fornecido pela liderança.' : 'Ainda não tem conta? Toque em '}
              {!cadastro && <Text style={{ color: C.bl, fontWeight: '700' }}>"Criar conta"</Text>}
              {!cadastro && '.'}
            </Text>
          </View>
        </View>

        {/* Rodapé com versículo */}
        <View style={s.rodape}>
          <Text style={s.versiculo}>“E conhecereis a verdade, e a verdade vos libertará.”</Text>
          <View style={s.refLinha}>
            <View style={s.refTraco} />
            <Text style={s.refTexto}>João 8:32</Text>
            <View style={s.refTraco} />
          </View>
          <View style={s.logoRodape}>
            <Text style={s.logoJni}>JNI</Text>
            <View style={s.logoDivisor} />
            <Text style={s.logoUniao}>U N I Ã O</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  topo: { backgroundColor: C.navy, marginHorizontal: -16, marginTop: -16, paddingTop: 58, paddingBottom: 56, alignItems: 'center', paddingHorizontal: 20 },
  icone: { width: 104, height: 104, borderRadius: 26, borderWidth: 2, borderColor: C.cy },
  marca: { color: C.white, fontSize: 34, fontWeight: '900', letterSpacing: 1.5, marginTop: 16 },
  marcaSub: { color: '#9aa6c7', fontSize: 13, marginTop: 4, textAlign: 'center' },
  frase: { color: C.white, fontSize: 16, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  faixa: { flexDirection: 'row', height: 4, width: 120, borderRadius: 2, overflow: 'hidden', marginTop: 16 },

  abas: { flexDirection: 'row', backgroundColor: C.white, borderRadius: 18, padding: 5, marginTop: -28, marginHorizontal: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  aba: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14 },
  abaOn: { backgroundColor: C.bl },
  abaTexto: { fontWeight: '800', color: C.muted, fontSize: 15 },
  abaTextoOn: { color: C.white },

  cartao: { backgroundColor: C.white, borderRadius: 26, padding: 22, marginTop: 14, marginHorizontal: 4, shadowColor: '#0b1020', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  rotulo: { fontSize: 14, fontWeight: '800', color: C.navy },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, fontSize: 16, backgroundColor: '#f7f9fd', color: C.ink, marginTop: 8 },
  senhaBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: '#f7f9fd', marginTop: 8, paddingRight: 14 },
  mostrar: { color: C.bl, fontWeight: '700', fontSize: 14 },
  escolha: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: '#f7f9fd' },
  escolhaOn: { borderColor: C.bl, backgroundColor: '#eaf0ff' },
  escolhaTexto: { fontWeight: '700', color: C.muted },
  escolhaTextoOn: { color: C.bl },
  erro: { backgroundColor: '#fde8e8', color: '#8a1c1c', padding: 12, borderRadius: 12, marginTop: 16, fontWeight: '600' },

  botao: { backgroundColor: C.bl, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 22, shadowColor: C.bl, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  botaoTexto: { color: C.white, fontWeight: '900', fontSize: 17, letterSpacing: 0.3 },

  separador: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  linhaSep: { flex: 1, height: 1, backgroundColor: C.line },
  ou: { color: C.muted, fontWeight: '700' },
  dica: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dicaIcone: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.bl, alignItems: 'center', justifyContent: 'center' },
  dicaIconeTexto: { color: C.bl, fontWeight: '900', fontSize: 14 },
  dicaTexto: { flex: 1, color: C.ink, fontSize: 14, lineHeight: 20 },

  rodape: { alignItems: 'center', marginTop: 28, paddingHorizontal: 12 },
  versiculo: { color: C.navy, fontStyle: 'italic', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  refLinha: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  refTraco: { width: 36, height: 2, backgroundColor: C.or, borderRadius: 1 },
  refTexto: { color: C.navy, fontWeight: '900', fontSize: 15 },
  logoRodape: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22 },
  logoJni: { color: C.navy, fontWeight: '900', fontSize: 26, letterSpacing: 1 },
  logoDivisor: { width: 2, height: 26, backgroundColor: C.navy },
  logoUniao: { color: C.navy, fontWeight: '600', fontSize: 14, letterSpacing: 4 },
});
