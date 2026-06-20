// js/auth.js

window.addEventListener('DOMContentLoaded', () => {

  // Listen for auth state changes
  _supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event);
    if (event === 'SIGNED_IN' && session) {
      AppState.setState({ user: session.user, session });
      await loadUserData();
      showView('dashboard');
    }
    if (event === 'SIGNED_OUT') {
      AppState.setState({ user: null, session: null });
      showView('login');
    }
  });

  // Check existing session on load
  async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
      AppState.setState({ user: session.user, session });
      await loadUserData();
      showView('dashboard');
    } else {
      showView('login');
    }
  }

  // ─── SIGN IN ───
  window.signIn = async function() {
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    if (!email || !password) return showAuthError('Please enter email and password');

    const btn = document.querySelector('#form-signin .btn-primary');
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    console.log('SignIn:', { user: data?.user?.id, error: error?.message });

    if (error) {
      showAuthError(error.message);
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  }

  // ─── SIGN UP ───
  window.signUp = async function() {
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const full_name = document.getElementById('signup-name').value.trim();

    if (!email || !password) return showAuthError('Please enter email and password');
    if (password.length < 6) return showAuthError('Password must be at least 6 characters');
    if (!full_name) return showAuthError('Please enter your full name');

    const btn = document.querySelector('#form-signup .btn-primary');
    btn.textContent = 'Creating account...';
    btn.disabled = true;

    const { data, error } = await _supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } }
    });

    console.log('SignUp:', { user: data?.user?.id, error: error?.message });

    if (error) {
      showAuthError(error.message);
      btn.textContent = 'Create Account';
      btn.disabled = false;
    } else {
      showAuthSuccess('Account created! Signing you in...');
    }
  }

  // ─── SIGN OUT ───
  window.signOut = async function() {
    await _supabase.auth.signOut();
  }

  // ─── TAB SWITCHER ───
  window.switchTab = function(tab) {
    document.getElementById('form-signin').classList.toggle('hidden', tab !== 'signin');
    document.getElementById('form-signup').classList.toggle('hidden', tab !== 'signup');
    document.getElementById('tab-signin').classList.toggle('active', tab === 'signin');
    document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
    hideAuthError();
  }

  // ─── HELPERS ───
  function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('auth-success').classList.add('hidden');
  }

  function showAuthSuccess(msg) {
    const el = document.getElementById('auth-success');
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('auth-error').classList.add('hidden');
  }

  function hideAuthError() {
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-success').classList.add('hidden');
  }

  // ─── START ───
  checkSession();

}); // end DOMContentLoaded