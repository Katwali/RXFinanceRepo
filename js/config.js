// js/config.js
const SUPABASE_URL = 'https://xxdaqxefkofmvgrgcewo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZGFxeGVma29mbXZncmdjZXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODgzOTYsImV4cCI6MjA5NzQ2NDM5Nn0.dkv9bNfM9WjjDOyg-GNt6zo4pcwVLzfnK6p4B-yo0Dw';

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: window.localStorage,
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

window._supabase = _supabase;

console.log('✅ Supabase connected');