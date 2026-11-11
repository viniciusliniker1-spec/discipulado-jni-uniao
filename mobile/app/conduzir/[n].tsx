import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ENC } from '../../src/content';
import { estilos } from '../../src/lib/ui';
import { C } from '../../src/lib/tema';

export default function Conduzir() {
  const { n: nStr } = useLocalSearchParams<{ n: string }>();
  const n = Number(nStr);
  const e: any = ENC[n - 1];
  if (!e) return null;
  const d = e.disc;
  return (
    <>
      <Stack.Screen options={{ title: 'Como conduzir ' + n }} />
      <ScrollView contentContainerStyle={estilos.pagina}>
        <Text style={estilos.titulo}>{n}. {e.t}</Text>
        <Text style={estilos.texto}>{e.s}</Text>

        <View style={estilos.card}>
          <Text style={[estilos.subtitulo, { marginTop: 0 }]}>Passo a passo na conversa</Text>
          {d.conduzir.map((x: string, i: number) => (
            <Text key={i} style={[estilos.texto, { marginTop: 8 }]}>{i + 1}. {x}</Text>
          ))}
        </View>

        <View style={estilos.card}>
          <Text style={[estilos.subtitulo, { marginTop: 0 }]}>Dinâmica: {d.dinamica.nome}</Text>
          <Text style={estilos.nota}>{d.dinamica.tempo}</Text>
          {d.dinamica.passos.map((x: string, i: number) => (
            <Text key={i} style={[estilos.texto, { marginTop: 8 }]}>{i + 1}. {x}</Text>
          ))}
        </View>

        <View style={estilos.card}>
          <Text style={[estilos.subtitulo, { marginTop: 0 }]}>Vida na vida</Text>
          <Text style={estilos.texto}>{d.vida}</Text>
        </View>

        <View style={[estilos.card, { borderColor: C.ok }]}>
          <Text style={[estilos.subtitulo, { marginTop: 0, color: C.ok }]}>Ponto de atenção: dependência do Espírito</Text>
          <Text style={estilos.texto}>{e.es} Ore para que o próprio Espírito conduza a conversa e a vida do jovem, e não apenas o seu esforço.</Text>
        </View>

        <Text style={estilos.subtitulo}>Conteúdo que o jovem vê</Text>
        <Text style={estilos.nota}>Modelo do encontro, sem respostas de ninguém.</Text>
        <View style={estilos.card}>
          <Text style={[estilos.texto, { fontWeight: '700' }]}>Textos para ler</Text>
          {e.txt.map((r: string) => <Text key={r} style={estilos.texto}>• {r} (NVI)</Text>)}
          <Text style={[estilos.texto, { fontWeight: '700', marginTop: 12 }]}>Perguntas</Text>
          {e.perg.map((p: string, i: number) => <Text key={i} style={[estilos.texto, { marginTop: 6 }]}>{i + 1}. {p}</Text>)}
          <Text style={[estilos.texto, { fontWeight: '700', marginTop: 12 }]}>Abertura</Text>
          <Text style={estilos.texto}>{e.abrir}</Text>
        </View>
      </ScrollView>
    </>
  );
}
