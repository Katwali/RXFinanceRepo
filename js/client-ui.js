// js/client-ui.js

// ─── VIEW ROUTER ───
function showView(name) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });
  const el = document.getElementById('view-' + name);
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('active');
  }

  if (name === 'history') renderHistory();
  if (name === 'repayments') renderRepayments();
  if (name === 'profile') loadProfile();
  if (name === 'apply') initWizard();
}

// ─── LOAD USER DATA ───
async function loadUserData() {
  const userId = AppState.user.id;

  const { data: loans } = await _supabase
    .from('applications')
    .select('*, repayments(*), documents(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  AppState.setState({ loans: loans || [] });
  renderDashboard();
}

// ─── DASHBOARD ───
function renderDashboard() {
  const { user, loans } = AppState;

  // Greeting
  const email = user?.email || '';
  document.getElementById('greeting').textContent = 'Welcome, ' + (email.split('@')[0] || 'there') + ' 👋';

  // Stats
  document.getElementById('stat-total').textContent = loans.length;
  document.getElementById('stat-pending').textContent = loans.filter(l => l.status === 'pending' || l.status === 'review').length;
  document.getElementById('stat-completed').textContent = loans.filter(l => l.status === 'completed').length;

  // Active loan
  const active = loans.find(l => l.status === 'active' || l.status === 'disbursed');
  if (active) {
    document.getElementById('no-loan-card').classList.add('hidden');
    document.getElementById('active-loan-card').classList.remove('hidden');
    document.getElementById('active-amount').textContent = 'N$' + Number(active.amount).toLocaleString();
    document.getElementById('active-amount').textContent = 'N$' + Number(active.amount).toLocaleString();
    
    // Add loan ref below amount
    const loanRefEl = document.getElementById('active-loan-ref');
    if (loanRefEl) loanRefEl.textContent = 'Loan ID: ' + (active.loan_ref || '#' + active.id);
    const reps = active.repayments || [];
    const paid = reps.filter(r => r.status === 'paid').length;
    const total = reps.length;
    const pct = total > 0 ? (paid / total) * 100 : 0;
    document.getElementById('loan-progress').style.width = pct + '%';
    document.getElementById('paid-installments').textContent = paid + ' of ' + total + ' paid';

    const next = reps.find(r => r.status === 'pending');
    document.getElementById('next-due').textContent = next
      ? 'Next due: ' + new Date(next.due_date).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })
      : 'All paid ✅';
  } else {
    document.getElementById('active-loan-card').classList.add('hidden');
    document.getElementById('no-loan-card').classList.remove('hidden');
  }
}

// ─── WIZARD ───
let sigCanvas, sigCtx, isDrawing = false;

function initWizard() {
  AppState.currentApp = {
    amount: 0,
    term: 6,
    purpose: '',
    frequency: 'monthly',
    gracePeriod: 3,
    totalRepayable: 0,
    installment: 0,
    numInstallments: 6,
    applicationId: null,
    uploadedDocs: {}
  };
  goToStep(1);
  initSignature();
}

async function goToStep(n) {
  // Create application record before showing document upload
  if (n === 2 && !AppState.currentApp.applicationId) {
    const amount = parseFloat(document.getElementById('loan-amount').value) || 0;
    const term = parseInt(document.getElementById('loan-term').value) || 6;
    const purpose = document.getElementById('loan-purpose').value || '';

    if (!amount || amount < 500) {
      alert('Please enter a valid loan amount (min N$500)');
      return;
    }

    const interest = amount * 0.30;
    const total = amount + interest;
    const installment = total / term;

    // Save to Supabase first
    const { data: app, error } = await _supabase
      .from('applications')
      const { data: app, error } = await _supabase
  .from('applications')
  .insert({
    user_id: AppState.user.id,
    amount,
    term_months: term,
    total_repayable: total,
    purpose,
    status: 'pending',
    repayment_frequency: AppState.currentApp.frequency || 'monthly',
    grace_period_days: AppState.currentApp.gracePeriod || 3
  })
  .select()
  .single();

    if (error) {
      alert('Error saving application: ' + error.message);
      return;
    }

    AppState.currentApp.applicationId = app.id;
    AppState.currentApp.amount = amount;
    AppState.currentApp.term = term;
    AppState.currentApp.totalRepayable = total;
    AppState.currentApp.installment = installment;

    console.log('✅ Application created:', app.id);
  }

  [1, 2, 3].forEach(i => {
    document.getElementById('wizard-step-' + i).classList.add('hidden');
    document.getElementById('step-dot-' + i).classList.remove('active', 'done');
  });
  document.getElementById('wizard-step-' + n).classList.remove('hidden');

  for (let i = 1; i < n; i++) document.getElementById('step-dot-' + i).classList.add('done');
  document.getElementById('step-dot-' + n).classList.add('active');

  if (n === 2) renderDocList();
  if (n === 3) renderReview();
}

function setClientType(type) {
  AppState.clientType = type;
  document.getElementById('type-individual').classList.toggle('active', type === 'individual');
  document.getElementById('type-sme').classList.toggle('active', type === 'sme');
}

function setFrequency(freq) {
  AppState.currentApp.frequency = freq;
  document.getElementById('freq-monthly').classList.toggle('active', freq === 'monthly');
  document.getElementById('freq-weekly').classList.toggle('active', freq === 'weekly');
  updateCalc();
}

function setGrace(days) {
  AppState.currentApp.gracePeriod = days;
  document.getElementById('grace-3').classList.toggle('active', days === 3);
  document.getElementById('grace-5').classList.toggle('active', days === 5);
}

// Live calculator
document.addEventListener('DOMContentLoaded', () => {
  ['loan-amount', 'loan-term'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateCalc);
  });
});

function updateCalc() {
  const amount = parseFloat(document.getElementById('loan-amount').value) || 0;
  const term = parseInt(document.getElementById('loan-term').value) || 1;
  const freq = document.getElementById('loan-frequency').value || 'monthly';
  const interestRate = 0.30;

  const interest = amount * interestRate;
  const total = amount + interest;

  let installment, numInstallments;
  if (freq === 'weekly') {
    numInstallments = term * 4;
    installment = total / numInstallments;
  } else {
    numInstallments = term;
    installment = total / numInstallments;
  }

  document.getElementById('c-principal').textContent = 'N$' + amount.toLocaleString();
  document.getElementById('c-interest').textContent = 'N$' + interest.toFixed(2);
  document.getElementById('c-total').textContent = 'N$' + total.toFixed(2);
  document.getElementById('c-installment').textContent = 'N$' + installment.toFixed(2) + 
    ' × ' + numInstallments + ' ' + (freq === 'weekly' ? 'weeks' : 'months');

  AppState.currentApp.amount = amount;
  AppState.currentApp.term = term;
  AppState.currentApp.frequency = freq;
  AppState.currentApp.totalRepayable = total;
  AppState.currentApp.installment = installment;
  AppState.currentApp.numInstallments = numInstallments;
}

// ─── DOCUMENT LIST ───
const DOC_TYPES = {
  individual: [
    { type: 'id', title: 'National ID / Passport', hint: 'Clear photo of your ID document' },
    { type: 'payslip', title: 'Latest Payslip', hint: 'Most recent payslip (PDF or photo)' },
    { type: 'bank_statement', title: 'Bank Statement', hint: 'Last 3 months from FNB, Standard Bank, etc.' }
  ],
  sme: [
    { type: 'company_reg', title: 'Company Registration', hint: 'BIPA registration certificate' },
    { type: 'owner_id', title: 'Owner ID', hint: 'Director or owner National ID' },
    { type: 'bank_statement', title: 'Business Bank Statement', hint: 'Last 3 months business account' },
    { type: 'invoice', title: 'Invoice / Quote', hint: 'What the loan will be used for' }
  ]
};

function renderDocList() {
  const docs = DOC_TYPES[AppState.clientType];
  const container = document.getElementById('doc-list');
  container.innerHTML = docs.map(doc => `
    <div class="doc-item" id="doc-item-${doc.type}">
      <div class="doc-title">${doc.title}</div>
      <div class="doc-subtitle">${doc.hint}</div>
      <input type="file" id="file-${doc.type}" accept=".pdf,.jpg,.jpeg,.png"
        style="display:none" onchange="handleFileUpload('${doc.type}', this)" />
      <button class="doc-upload-btn" onclick="document.getElementById('file-${doc.type}').click()">
        📎 Choose File
      </button>
      <div class="doc-status hidden" id="doc-status-${doc.type}">✅ Uploaded</div>
    </div>
  `).join('');
}

async function handleFileUpload(docType, input) {
  const file = input.files[0];
  if (!file) return;

  const item = document.getElementById('doc-item-' + docType);
  item.querySelector('.doc-upload-btn').textContent = 'Uploading...';

  try {
    const ext = file.name.split('.').pop();
    const path = `${AppState.user.id}/${docType}_${Date.now()}.${ext}`;

    const { error } = await _supabase.storage
      .from('kyc-documents')
      .upload(path, file);

    if (error) throw error;

    AppState.currentApp.uploadedDocs[docType] = path;
    item.classList.add('uploaded');
    item.querySelector('.doc-upload-btn').textContent = '✅ Change File';
    document.getElementById('doc-status-' + docType).classList.remove('hidden');
  } catch (err) {
    item.querySelector('.doc-upload-btn').textContent = '❌ Retry';
    alert('Upload failed: ' + err.message);
  }
}

// ─── REVIEW ───
function renderReview() {
  const { amount, term, totalRepayable, installment } = AppState.currentApp;
  const purpose = document.getElementById('loan-purpose')?.value || '—';

  document.getElementById('review-summary').innerHTML = `
    <div class="review-row"><span>Loan Amount</span><span>N$${Number(amount).toLocaleString()}</span></div>
    <div class="review-row"><span>Term</span><span>${term} month${term > 1 ? 's' : ''}</span></div>
    <div class="review-row"><span>Interest (30%)</span><span>N$${(amount * 0.3).toFixed(2)}</span></div>
    <div class="review-row"><span>Total Repayable</span><span>N$${totalRepayable.toFixed(2)}</span></div>
    <div class="review-row"><span>Monthly Installment</span><span>N$${installment.toFixed(2)}</span></div>
    <div class="review-row"><span>Purpose</span><span>${purpose}</span></div>
    <div class="review-row"><span>Documents Uploaded</span><span>${Object.keys(AppState.currentApp.uploadedDocs).length}</span></div>
  `;
}

// ─── SIGNATURE ───
function initSignature() {
  sigCanvas = document.getElementById('sig-canvas');
  if (!sigCanvas) return;
  sigCtx = sigCanvas.getContext('2d');
  sigCtx.strokeStyle = '#1a1a2e';
  sigCtx.lineWidth = 2;
  sigCtx.lineCap = 'round';

  sigCanvas.addEventListener('mousedown', startDraw);
  sigCanvas.addEventListener('mousemove', draw);
  sigCanvas.addEventListener('mouseup', () => isDrawing = false);
  sigCanvas.addEventListener('touchstart', e => { e.preventDefault(); startDraw(e.touches[0]); }, { passive: false });
  sigCanvas.addEventListener('touchmove', e => { e.preventDefault(); draw(e.touches[0]); }, { passive: false });
  sigCanvas.addEventListener('touchend', () => isDrawing = false);
}

function startDraw(e) {
  isDrawing = true;
  const r = sigCanvas.getBoundingClientRect();
  sigCtx.beginPath();
  sigCtx.moveTo(e.clientX - r.left, e.clientY - r.top);
}

function draw(e) {
  if (!isDrawing) return;
  const r = sigCanvas.getBoundingClientRect();
  sigCtx.lineTo(e.clientX - r.left, e.clientY - r.top);
  sigCtx.stroke();
}

function clearSig() {
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
}

// ─── SUBMIT ───
async function submitApplication() {
  const { amount, term, totalRepayable, installment } = AppState.currentApp;
  const purpose = document.getElementById('loan-purpose')?.value || '';
  const agreed = document.getElementById('terms-check').checked;

  if (!amount || amount < 500) return showSubmitError('Please enter a valid loan amount (min N$500)');
  if (!agreed) return showSubmitError('Please agree to the loan terms');

  const sigData = sigCanvas.toDataURL();
  const btn = document.querySelector('.btn-submit');
  btn.textContent = 'Submitting...';
  btn.disabled = true;

  try {
    // Insert application
    const { data: app, error: appErr } = await _supabase
      .from('applications')
      .insert({
        user_id: AppState.user.id,
        amount,
        term_months: term,
        total_repayable: totalRepayable,
        purpose,
        status: 'pending'
      })
      .select()
      .single();

    if (appErr) throw appErr;

    // Insert documents records
    const docInserts = Object.entries(AppState.currentApp.uploadedDocs).map(([docType, fileUrl]) => ({
      application_id: app.id,
      doc_type: docType,
      file_name: fileUrl.split('/').pop(),
      file_url: fileUrl
    }));

    if (docInserts.length > 0) {
      await _supabase.from('documents').insert(docInserts);
    }

    // Save signature
    await _supabase.from('contracts').insert({
      application_id: app.id,
      signature_data: sigData,
      signed_ip: 'client'
    }).select();

    // Refresh data and go back
    await loadUserData();
    showView('dashboard');
    alert('✅ Application submitted! We will review and contact you within 24 hours.');
  } catch (err) {
    showSubmitError(err.message);
    btn.textContent = 'Submit Application';
    btn.disabled = false;
  }
}

function showSubmitError(msg) {
  const el = document.getElementById('submit-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ─── HISTORY ───
function renderHistory() {
  const container = document.getElementById('history-list');
  const { loans } = AppState;

  if (!loans.length) {
    container.innerHTML = '<div class="loading">No applications yet</div>';
    return;
  }

 container.innerHTML = loans.map(loan => `
  <div class="loan-card">
    <div class="loan-ref-badge">Loan ID: ${loan.loan_ref || '#' + loan.id}</div>
    <div class="loan-card-top">
      <div class="loan-card-amount">N$${Number(loan.amount).toLocaleString()}</div>
      <span class="status-badge badge-${loan.status}">${loan.status}</span>
    </div>
    <div style="font-size:13px;color:var(--gray-mid)">
      ${loan.term_months} months · 
      ${loan.repayment_frequency || 'monthly'} · 
      Applied ${new Date(loan.created_at).toLocaleDateString('en-NA')}
    </div>
    ${loan.admin_notes ? `
      <div style="margin-top:8px;font-size:13px;background:var(--navy-pale);
        padding:8px;border-radius:8px;color:var(--navy)">
        ${loan.admin_notes}
      </div>` : ''}
  </div>
`).join('');
}

// ─── REPAYMENTS ───
function renderRepayments() {
  const container = document.getElementById('repayments-list');
  const allReps = AppState.loans.flatMap(l => l.repayments || []);

  if (!allReps.length) {
    container.innerHTML = '<div class="loading">No repayments scheduled yet</div>';
    return;
  }

  const sorted = allReps.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  container.innerHTML = sorted.map(r => `
    <div class="repayment-item">
      <div>
        <div class="rep-date">${new Date(r.due_date).toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div class="rep-amount">N$${Number(r.amount).toFixed(2)}</div>
      </div>
      <div class="rep-status rep-${r.status}">${r.status.toUpperCase()}</div>
    </div>
  `).join('');
}

// ─── PROFILE ───
async function loadProfile() {
  const { data } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', AppState.user.id)
    .single();

  if (data) {
    document.getElementById('profile-name').value = data.full_name || '';
    document.getElementById('profile-phone').value = data.phone || '';
    document.getElementById('profile-id').value = data.id_number || '';
  }
}

async function saveProfile() {
  const full_name = document.getElementById('profile-name').value.trim();
  const phone = document.getElementById('profile-phone').value.trim();
  const id_number = document.getElementById('profile-id').value.trim();

  const { error } = await _supabase
    .from('profiles')
    .upsert({ id: AppState.user.id, full_name, phone, id_number });

  const msg = document.getElementById('profile-msg');
  msg.classList.remove('hidden');
  if (error) {
    msg.textContent = '❌ ' + error.message;
    msg.style.color = '#ef4444';
  } else {
    msg.textContent = '✅ Profile saved!';
    msg.style.color = '#10b981';
  }
}