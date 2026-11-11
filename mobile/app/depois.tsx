import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../src/lib/api';
import { Carregando, estilos } from '../src/lib/ui';

const CAMPOS: [string, string, string][] = [
  ['m', 'Minha decisão', ''],
  ['c', 'Como vou praticar', ''],
  ['a', 'Quem vai caminhar comigo', ''],
];

export default function Depois() {
  const [d, setD] = useState<any>(null);
  const [status, setStatus] = useState('');
  const timer = useRef<any>(null);
  useEffect(() => { api.depoisGet().then(setD).catch(() => setD({ m: '', c: '', a: '' })); }, []);

  function mudar(campo: string, valor: string) {
    const novo = { ...d, [campo]: valor };
    setD(novo);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.depoisSalvar(novo).then(() => setStatus('Salvo')).catch(() => setStatus('Sem conexão. Não foi salvo; tente de novo quando voltar a internet.'));
    }, 700);
  }

  if (!d) return <Carregando />;
  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Text style={estilos.titulo}>Depois do décimo encontro</Text>
      <Text style={estilos.texto}>O encerramento não é o fim da caminhada. Converse com seu discipulador e com a liderança sobre o próximo passo: continuar em acompanhamento, entrar em uma equipe de serviço, iniciar outro percurso de formação ou acompanhar alguém que está começando.</Text>
      {CAMPOS.map(([campo, rotulo]) => (
        <View key={campo} style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '800', color: C_NAVY }]}>{rotulo}</Text>
          <TextInput style={[estilos.input, estilos.inputMulti]} multiline value={d[campo] || ''} onChangeText={v => mudar(campo, v)} />
        </View>
      ))}
      {!!status && <Text style={estilos.nota}>{status}</Text>}
      <Text style={[estilos.texto, { textAlign: 'center', marginTop: 20, fontWeight: '800', color: '#f26a1b' }]}>Marche! Em frente!</Text>
    </ScrollView>
  );
}
const C_NAVY = '#0b1020';
