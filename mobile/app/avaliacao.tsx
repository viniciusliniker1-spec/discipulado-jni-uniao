import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AREAS } from '../src/content';
import { estilos } from '../src/lib/ui';
import { C } from '../src/lib/tema';

const ENCAMINHAMENTOS = [
  'Em risco de violência, abuso, automutilação, ideação suicida ou ameaça, envolva imediatamente a liderança responsável e os serviços competentes.',
  'Em sofrimento emocional persistente, transtornos alimentares, uso problemático de substâncias ou sintomas intensos, incentive avaliação profissional.',
  'Em conflitos doutrinários, não responda com improviso. Registre a dúvida e procure a liderança pastoral para uma resposta responsável.',
];

export default function Avaliacao() {
  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Text style={estilos.titulo}>Avaliação pastoral do percurso</Text>
      <Text style={estilos.texto}>Use esta avaliação para discernir próximos passos, não para dar uma nota espiritual. O discípulo pode avançar mesmo com dúvidas. O critério principal é disposição para caminhar com Cristo, receber cuidado e praticar obediência.</Text>
      {AREAS.map((a: string[]) => (
        <View key={a[0]} style={[estilos.card, { borderLeftWidth: 6, borderLeftColor: a[3] }]}>
          <Text style={[estilos.texto, { fontWeight: '800' }]}>{a[0]}</Text>
          <Text style={[estilos.texto, { marginTop: 6 }]}>Sinais: {a[1]}</Text>
          <Text style={[estilos.texto, { marginTop: 6 }]}>Próximo cuidado: {a[2]}</Text>
        </View>
      ))}
      <View style={[estilos.card, { borderColor: C.mar }]}>
        <Text style={[estilos.subtitulo, { marginTop: 0, color: C.mar }]}>Encaminhamentos</Text>
        {ENCAMINHAMENTOS.map((t, i) => <Text key={i} style={[estilos.texto, { marginTop: 6 }]}>• {t}</Text>)}
      </View>
    </ScrollView>
  );
}
