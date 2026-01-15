import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import Constants from 'expo-constants';

const getEnvVar = (key: string): string => {
  const value =
    Constants.expoConfig?.extra?.[key] ||
    process.env[key] ||
    Constants.manifest?.extra?.[key];

  if (!value) {
    console.error(`Missing environment variable: ${key}`);
    return '';
  }

  return value;
};

const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Authentication will not work.');
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
