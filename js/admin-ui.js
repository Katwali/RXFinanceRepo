// js/admin-ui.js
let allApplications = [];
let currentFilter = 'all';
let currentApp = null;

window.addEventListener('DOMContentLoaded', () => {

  // ─── AUTH ───
  // Hardcoded admin emails - add yours here
  const ADMIN_EMAILS = ['cartallax2013@gmail.com'];

  function isAdmin(email) {
    return ADMIN_EMAILS.includes(email);
  }

  // ─── AUTH ───
  _supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      if (!isAdmin(session.user.email)) {
        await _supabase.auth.signOut();
        showAuthError('Access denied. Admin only.');
        return;
      }
      document.getElementById('admin-email-label').textContent = session.user.email;
      await loadApplications();
      showAdminView('pipeline');
    }
    if (event === 'SIGNED_OUT') {
      showAdminView('login');
    }
  });

  async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session && isAdmin(session.user.email)) {
      document.getElementById('admin-email-label').textContent = session.user.email;
      await loadApplications();
      showAdminView('pipeline');
    } else {
      showAdminView('login');
    }
  }

  window.adminSignIn = async function() {
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    if (!email || !password) return showAuthError('Enter email and password');

    const btn = document.querySelector('#view-login .btn-primary');
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showAuthError(error.message);
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  }

  window.adminSignOut = async function() {
    await _supabase.auth.signOut();
  }

  function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  // ─── VIEW ROUTER ───
  window.showAdminView = function(name) {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
      v.classList.add('hidden');
    });
    const el = document.getElementById('view-' + name);
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('active');
    }
  }

  // ─── LOAD ALL APPLICATIONS ───
  async function loadApplications() {
    const { data, error } = await _supabase
      .from('applications')
      .select(`
        *,
        documents (*),
        repayments (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Load error:', error);
      return;
    }

    // Fetch profiles separately
    const userIds = [...new Set(data.map(a => a.user_id))];
    const { data: profiles } = await _supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    // Attach profiles to applications
    allApplications = (data || []).map(app => ({
      ...app,
      profiles: profiles?.find(p => p.id === app.user_id) || {}
    }));

    updateStats();
    renderPipeline();

    // Realtime subscription
    _supabase
      .channel('applications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'applications'
      }, async () => {
        await loadApplications();
      })
      .subscribe();
  }

  // ─── UPDATE STATS ───
  function updateStats() {
    document.getElementById('stat-all').textContent = allApplications.length;
    document.getElementById('stat-pending').textContent = allApplications.filter(a => a.status === 'pending').length;
    document.getElementById('stat-review').textContent = allApplications.filter(a => a.status === 'review').length;
    document.getElementById('stat-approved').textContent = allApplications.filter(a => a.status === 'approved').length;
    document.getElementById('stat-active').textContent = allApplications.filter(a => a.status === 'active').length;
    document.getElementById('stat-overdue').textContent = allApplications.filter(a => a.status === 'overdue').length;
  }

  // ─── FILTER ───
  window.filterApps = function(filter) {
    currentFilter = filter;
    renderPipeline();
  }

  // ─── RENDER PIPELINE ───
  window.renderPipeline = function() {
    const search = document.getElementById('search-input')?.value.toLowerCase() || '';
    const tbody = document.getElementById('pipeline-body');

    let apps = allApplications;

    if (currentFilter !== 'all') {
      apps = apps.filter(a => a.status === currentFilter);
    }

    if (search) {
      apps = apps.filter(a =>
        a.profiles?.full_name?.toLowerCase().includes(search) ||
        a.purpose?.toLowerCase().includes(search)
      );
    }

    if (!apps.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">No applications found</td></tr>';
      return;
    }

    tbody.innerHTML = apps.map(app => `
      <tr onclick="openDetail(${app.id})">
        <td>
          <div style="font-weight:600">${app.profiles?.full_name || 'Unknown'}</div>
          <div style="font-size:12px;color:#6b7280">${app.profiles?.phone || '—'}</div>
        </td>
        <td><strong>N$${Number(app.amount).toLocaleString()}</strong></td>
        <td>${app.term_months} mo</td>
        <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${app.purpose || '—'}</td>
        <td>${new Date(app.created_at).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td><span class="badge badge-${app.status}">${app.status}</span></td>
        <td><button class="btn-ghost-sm" onclick="event.stopPropagation();openDetail(${app.id})">View →</button></td>
      </tr>
    `).join('');
  }

  // ─── OPEN DETAIL ───
  window.openDetail = function(appId) {
    currentApp = allApplications.find(a => a.id === appId);
    if (!currentApp) return;

    const profile = currentApp.profiles || {};
    const amount = Number(currentApp.amount);
    const interest = amount * 0.30;
    const total = Number(currentApp.total_repayable);
    const installment = total / currentApp.term_months;

    document.getElementById('d-name').textContent = profile.full_name || '—';
    document.getElementById('d-email').textContent = '—';
    document.getElementById('d-phone').textContent = profile.phone || '—';
    document.getElementById('d-idnum').textContent = profile.id_number || '—';
    document.getElementById('d-amount').textContent = 'N$' + amount.toLocaleString();
    document.getElementById('d-term').textContent = currentApp.term_months + ' months';
    document.getElementById('d-interest').textContent = 'N$' + interest.toFixed(2);
    document.getElementById('d-total').textContent = 'N$' + total.toFixed(2);
    document.getElementById('d-installment').textContent = 'N$' + installment.toFixed(2);
    document.getElementById('d-purpose').textContent = currentApp.purpose || '—';
    document.getElementById('d-date').textContent = new Date(currentApp.created_at).toLocaleDateString('en-NA');
    document.getElementById('d-status').innerHTML = `<span class="badge badge-${currentApp.status}">${currentApp.status}</span>`;
    document.getElementById('d-loanref').textContent = currentApp.loan_ref || '#' + currentApp.id;
    document.getElementById('d-frequency').textContent = currentApp.repayment_frequency || 'monthly';
    document.getElementById('d-grace').textContent = (currentApp.grace_period_days || 3) + ' days';
    document.getElementById('admin-notes').value = currentApp.admin_notes || '';

    // Documents
    const docs = currentApp.documents || [];
    document.getElementById('d-docs').innerHTML = docs.length
      ? docs.map(doc => `
          <div class="doc-link">
            <span>${doc.doc_type.replace('_', ' ').toUpperCase()} — ${doc.file_name}</span>
            <a href="#" onclick="viewDoc('${doc.file_url}');return false;">View</a>
          </div>
        `).join('')
      : '<p style="color:#6b7280;font-size:14px">No documents uploaded</p>';

    // Repayments
    const reps = currentApp.repayments || [];
    if (reps.length) {
      document.getElementById('repayment-card').style.display = 'block';
      const sorted = reps.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      document.getElementById('d-repayments').innerHTML = `
        <table class="rep-table">
          <thead>
            <tr><th>#</th><th>Due Date</th><th>Amount</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${sorted.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${new Date(r.due_date).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td>N$${Number(r.amount).toFixed(2)}</td>
                <td><span class="badge badge-${r.status}">${r.status}</span></td>
                <td>${r.status === 'pending'
                  ? `<button class="btn-success" style="padding:4px 10px;font-size:12px" onclick="markPaid(${r.id})">Mark Paid</button>`
                  : '—'
                }</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      document.getElementById('repayment-card').style.display = 'none';
    }

    renderActionButtons();
    showAdminView('detail');
  }

  // ─── ACTION BUTTONS ───
  function renderActionButtons() {
    const status = currentApp.status;
    const container = document.getElementById('action-buttons');
    document.getElementById('disburse-section').classList.add('hidden');
    document.getElementById('action-msg').classList.add('hidden');

    let buttons = '';

    if (status === 'pending') {
      buttons = `
        <button class="btn-warning" onclick="updateStatus('review')">Mark In Review</button>
        <button class="btn-success" onclick="approveApplication()">Approve</button>
        <button class="btn-danger" onclick="updateStatus('rejected')">Reject</button>
      `;
    } else if (status === 'review') {
      buttons = `
        <button class="btn-success" onclick="approveApplication()">Approve</button>
        <button class="btn-danger" onclick="updateStatus('rejected')">Reject</button>
      `;
    } else if (status === 'approved') {
      buttons = `<button class="btn-warning" onclick="showDisburse()">Mark as Disbursed</button>`;
    } else if (status === 'active' || status === 'disbursed') {
      buttons = `<button class="btn-danger" onclick="updateStatus('overdue')">Mark Overdue</button>`;
    } else {
      buttons = `<p style="color:#6b7280;font-size:14px">No actions available for this status</p>`;
    }

    container.innerHTML = buttons;
  }

  // ─── UPDATE STATUS ───
  window.updateStatus = async function(newStatus) {
    const notes = document.getElementById('admin-notes').value;
    const { error } = await _supabase
      .from('applications')
      .update({ status: newStatus, admin_notes: notes })
      .eq('id', currentApp.id);

    if (error) return showActionMsg('Error: ' + error.message, false);

    currentApp.status = newStatus;
    currentApp.admin_notes = notes;
    renderActionButtons();
    updateStats();
    showActionMsg('Status updated to ' + newStatus, true);
    await loadApplications();
  }

  // ─── APPROVE + GENERATE SCHEDULE ───
  window.approveApplication = async function() {
  const notes = document.getElementById('admin-notes').value;
  const interestRate = parseFloat(document.getElementById('admin-interest-rate').value) / 100 || 0.30;
  const lateFeeRate = parseFloat(document.getElementById('admin-late-fee').value) / 100 || 0.02;

  const amount = Number(currentApp.amount);
  const interest = amount * interestRate;
  const total = amount + interest;
  const freq = currentApp.repayment_frequency || 'monthly';
  const numInstallments = freq === 'weekly' ? currentApp.term_months * 4 : currentApp.term_months;
  const installment = total / numInstallments;

  // Update application with final pricing
  const { error } = await _supabase
    .from('applications')
    .update({
      status: 'approved',
      admin_notes: notes,
      interest_rate: interestRate * 100,
      late_fee_rate: lateFeeRate * 100,
      total_repayable: total
    })
    .eq('id', currentApp.id);

  if (error) return showActionMsg('Error: ' + error.message, false);

  // Generate repayment schedule
  const repayments = [];
  const startDate = new Date();

  for (let i = 1; i <= numInstallments; i++) {
    const dueDate = new Date(startDate);
    if (freq === 'weekly') {
      dueDate.setDate(dueDate.getDate() + (i * 7));
    } else {
      dueDate.setMonth(dueDate.getMonth() + i);
    }
    repayments.push({
      application_id: currentApp.id,
      due_date: dueDate.toISOString().split('T')[0],
      amount: parseFloat(installment.toFixed(2)),
      status: 'pending'
    });
  }

  const { error: repError } = await _supabase
    .from('repayments')
    .insert(repayments);

  if (repError) return showActionMsg('Approved but schedule error: ' + repError.message, false);

  showActionMsg('✅ Approved! ' + numInstallments + ' ' + freq + ' installments of N$' + installment.toFixed(2), true);
  await loadApplications();
  openDetail(currentApp.id);
}
  // ─── DISBURSE ───
  window.showDisburse = function() {
    document.getElementById('disburse-section').classList.remove('hidden');
  }

  window.markDisbursed = async function() {
    const ref = document.getElementById('disburse-ref').value.trim();
    if (!ref) return showActionMsg('Please enter a transaction reference', false);

    const { error } = await _supabase
      .from('applications')
      .update({ status: 'active' })
      .eq('id', currentApp.id);

    if (error) return showActionMsg('Error: ' + error.message, false);

    showActionMsg('✅ Marked as disbursed. Loan is now active.', true);
    currentApp.status = 'active';
    renderActionButtons();
    await loadApplications();
  }

  // ─── MARK REPAYMENT PAID ───
  window.markPaid = async function(repId) {
    const { error } = await _supabase
      .from('repayments')
      .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
      .eq('id', repId);

    if (error) return alert('Error: ' + error.message);
    await loadApplications();
    openDetail(currentApp.id);
  }

  // ─── VIEW DOCUMENT ───
  window.viewDoc = async function(filePath) {
    const { data, error } = await _supabase.storage
      .from('kyc-documents')
      .createSignedUrl(filePath, 60);

    if (error) return alert('Error loading document: ' + error.message);
    window.open(data.signedUrl, '_blank');
  }

  // ─── ACTION MESSAGE ───
  function showActionMsg(msg, success) {
    const el = document.getElementById('action-msg');
    el.textContent = msg;
    el.className = success ? 'success-msg' : 'error-msg';
    el.classList.remove('hidden');
  }

  // ─── START ───
  checkSession();

});