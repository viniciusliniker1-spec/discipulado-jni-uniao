import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const CHAVE = 'credenciais';

export async function biometriaDisponivel(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch { return false; }
}
export async function temCredenciais(): Promise<boolean> {
  try { return !!(await SecureStore.getItemAsync(CHAVE)); } catch { return false; }
}
export async function guardarCredenciais(email: string, senha: string) {
  await SecureStore.setItemAsync(CHAVE, JSON.stringify({ email, senha }));
}
export async function apagarCredenciais() {
  try { await SecureStore.deleteItemAsync(CHAVE); } catch {}
}
// Pede a digital/rosto/PIN e devolve as credenciais guardadas (ou null)
export async function lerComBiometria(): Promise<{ email: string; senha: string } | null> {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Entrar no Discipulado', cancelLabel: 'Cancelar' });
  if (!r.success) return null;
  try {
    const v = await SecureStore.getItemAsync(CHAVE);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}
