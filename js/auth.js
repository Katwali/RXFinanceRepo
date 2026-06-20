// js/auth.js
window.addEventListener('DOMContentLoaded', () => {

  // ─── AUTH STATE ───
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
    if (event === 'PASSWORD_RECOVERY') {
      showView('login');
      switchTab('signin');
      showAuthSuccess('Enter your new password below.');
    }
  });

  // ─── CHECK SESSION ───
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

    if (!email) return showAuthError('Please enter your email address');
    if (!password) return showAuthError('Please enter your password');

    const btn = document.querySelector('#form-signin .btn-primary');
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Invalid login')) {
        showAuthError('Incorrect email or password. Please try again.');
      } else {
        showAuthError(error.message);
      }
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  }

  // ─── SIGN UP ───
 window.signUp = async function() {
  const full_name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const phone = document.getElementById('signup-phone').value.trim();

  if (!full_name) return showAuthError('Please enter your full name');
  if (!email) return showAuthError('Please enter your email address');
  if (!password || password.length < 6) return showAuthError('Password must be at least 6 characters');

  const btn = document.querySelector('#form-signup .btn-primary');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  try {
    // Step 1: Sign up with Supabase Auth
    const { data, error } = await _supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    if (!data.user) throw new Error('Account creation failed. Please try again.');

    // Step 2: Manually create profile (bypasses broken trigger)
    await _supabase.from('profiles').upsert({
      id: data.user.id,
      full_name,
      phone
    });

    // Step 3: Sign in immediately
    const { data: signInData, error: signInError } = await _supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) throw signInError;

    showAuthSuccess('✅ Welcome to RX Finance, ' + full_name + '!');

  } catch (err) {
    console.log('Signup error:', err);
    showAuthError(err.message || 'Signup failed. Please try again.');
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
}

  // ─── FORGOT PASSWORD ───
  window.sendReset = async function() {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) return showAuthError('Please enter your email address');

    const btn = document.querySelector('#form-forgot .btn-primary');
    btn.textContent = 'Sending...';
    btn.disabled = true;

    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href
    });

    if (error) {
      showAuthError(error.message);
    } else {
      showAuthSuccess('✅ Reset link sent! Check your email inbox.');
    }

    btn.textContent = 'Send Reset Link';
    btn.disabled = false;
  }

  // ─── SIGN OUT ───
  window.signOut = async function() {
    await _supabase.auth.signOut();
  }

  // ─── TAB SWITCHER ───
  window.switchTab = function(tab) {
    ['signin', 'signup', 'forgot'].forEach(t => {
      document.getElementById('form-' + t).classList.toggle('hidden', t !== tab);
      document.getElementById('tab-' + t)?.classList.toggle('active', t === tab);
    });
    hideAuthMessages();
  }

  // ─── SHOW/HIDE PASSWORD ───
  window.togglePass = function(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  // ─── MESSAGES ───
  function showAuthError(msg) {
    document.getElementById('auth-error').textContent = msg;
    document.getElementById('auth-error').classList.remove('hidden');
    document.getElementById('auth-success').classList.add('hidden');
  }

  function showAuthSuccess(msg) {
    document.getElementById('auth-success').textContent = msg;
    document.getElementById('auth-success').classList.remove('hidden');
    document.getElementById('auth-error').classList.add('hidden');
  }

  function hideAuthMessages() {
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-success').classList.add('hidden');
  }

  // expose for external use
  window.showAuthError = showAuthError;
  window.showAuthSuccess = showAuthSuccess;

  // ─── START ───
  checkSession();

}); // end DOMContentLoaded