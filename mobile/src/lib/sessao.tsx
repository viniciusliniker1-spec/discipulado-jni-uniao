import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, Perfil } from './api';
import { supabase } from './supabase';

type Caps = { curso: boolean; conduzir: boolean; admin: boolean };
type Sessao = {
  carregando: boolean;
  usuario: Perfil | null;
  caps: Caps;
  discipulador: Perfil | null;
  modos: string[];
  modoAtual: string | null;
  setModo: (m: string) => void;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
};

const Ctx = createContext<Sessao | null>(null);
const CHAVE_MODO = 'modo';

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState<Perfil | null>(null);
  const [caps, setCaps] = useState<Caps>({ curso: false, conduzir: false, admin: false });
  const [discipulador, setDiscipulador] = useState<Perfil | null>(null);
  const [modo, setModoState] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const eu = await api.eu();
      setUsuario(eu ? eu.usuario : null);
      setCaps(eu ? eu.caps : { curso: false, conduzir: false, admin: false });
      setDiscipulador(eu ? eu.discipulador : null);
    } catch {
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_MODO).then(m => setModoState(m));
    recarregar();
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') { setUsuario(null); }
    });
    return () => data.subscription.unsubscribe();
  }, [recarregar]);

  // Modos disponíveis conforme a conta (mesma regra do site)
  const modos = useMemo(() => {
    const m: string[] = [];
    if (caps.curso) m.push('aluno');
    if (caps.conduzir) m.push('discipulador');
    if (caps.admin) m.push('admin');
    return m;
  }, [caps]);

  const modoAtual = useMemo(() => {
    if (!modos.length) return null;
    if (modo && modos.includes(modo)) return modo;
    if (usuario && usuario.papel === 'admin') return 'admin';
    return modos.includes('discipulador') ? 'discipulador' : modos[0];
  }, [modos, modo, usuario]);

  const setModo = useCallback((m: string) => {
    setModoState(m);
    AsyncStorage.setItem(CHAVE_MODO, m);
  }, []);

  const sair = useCallback(async () => {
    await api.sair();
    setUsuario(null);
  }, []);

  const valor: Sessao = { carregando, usuario, caps, discipulador, modos, modoAtual, setModo, recarregar, sair };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSessao(): Sessao {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSessao fora do SessaoProvider');
  return v;
}
