import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ETAPAS } from '../src/content/ritmo';
import { Botao, estilos } from '../src/lib/ui';
import { C } from '../src/lib/tema';

function formatar(s: number) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

export default function Ritmo() {
  const [i, setI] = useState(0);
  const [restante, setRestante] = useState(ETAPAS[0][0] * 60);
  const [rodando, setRodando] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!rodando) return;
    timer.current = setInterval(() => {
      setRestante(r => {
        if (r <= 1) { setRodando(false); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [rodando]);

  function escolher(k: number) {
    setRodando(false);
    setI(k);
    setRestante(ETAPAS[k][0] * 60);
  }

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Text style={estilos.titulo}>Ritmo do encontro</Text>
      <Text style={estilos.texto}>Escolha uma etapa e acompanhe o tempo sem perder o fio da conversa.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
        {ETAPAS.map(([min, nome], k) => (
          <Pressable key={k} onPress={() => escolher(k)} style={[estilos.card, { flexBasis: '48%', flexGrow: 1, marginRight: 6, backgroundColor: i === k ? C.navy : C.white }]}>
            <Text style={{ color: i === k ? C.white : C.navy, fontWeight: '800' }}>{min} min</Text>
            <Text style={{ color: i === k ? C.white : C.muted }}>{nome}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontSize: 56, fontWeight: '800', textAlign: 'center', color: restante === 0 ? C.ok : C.navy, marginVertical: 16 }}>{formatar(restante)}</Text>
      {restante === 0 && <Text style={[estilos.texto, { textAlign: 'center', color: C.ok, fontWeight: '700' }]}>Etapa concluída: {ETAPAS[i][1]}</Text>}
      <Botao texto={rodando ? 'Pausar' : 'Iniciar'} onPress={() => { if (restante > 0) setRodando(!rodando); }} />
      <Botao texto="Zerar" fraco onPress={() => { setRodando(false); setRestante(ETAPAS[i][0] * 60); }} />
    </ScrollView>
  );
}
