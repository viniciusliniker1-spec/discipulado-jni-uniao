import React from 'react';
import { Text, View } from 'react-native';
import { C } from './tema';

// Marca JNI União: bloco com o nome em destaque (sem dependências extras)
export function Marca({ tamanho = 56 }: { tamanho?: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, borderRadius: tamanho * 0.24, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.cy }}>
      <Text style={{ color: C.cy, fontWeight: '900', fontSize: tamanho * 0.28, letterSpacing: 1 }}>JNI</Text>
      <View style={{ height: 3, width: tamanho * 0.5, backgroundColor: C.or, borderRadius: 2, marginTop: 2 }} />
    </View>
  );
}
