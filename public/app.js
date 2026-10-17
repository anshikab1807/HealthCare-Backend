

const state = {
  accessToken: localStorage.getItem('healthcare_access_token') || null,
  refreshToken: localStorage.getItem('healthcare_refresh_token') || null,
  user: JSON.parse(localStorage.getItem('healthcare_user') || 'null'),
  patients: [],
  doctors: []
};

const authUserChip = document.getElementById('auth-user-chip');
const navLoginBtn = document.getElementById('nav-login-btn');
const userAvatar = document.getElementById('user-avatar');
const userEmailText = document.getElementById('user-email-text');
const logoutBtn = document.getElementById('logout-btn');
const tokenDisplayBox = document.getElementById('token-display-box');
const activeTokenString = document.getElementById('active-token-string');
const patientsAuthNotice = document.getElementById('patients-auth-notice');

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  updateAuthUI();
  setupSpecialtyPills();
  setupFormListeners();
  setupExplorer();
  checkHealth();

  if (state.accessToken) {
    loadPatients();
    loadDoctors();
  } else {
    loadDoctors(); 
  }
});

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');

      if (btn.dataset.tab === 'tab-patients') loadPatients();
      if (btn.dataset.tab === 'tab-doctors') loadDoctors();
      if (btn.dataset.tab === 'tab-mappings') populateMappingDropdowns();
    });
  });
}

function setupSpecialtyPills() {
  document.querySelectorAll('.pill-chip').forEach(pill => {
    pill.addEventListener('click', () => {
      const input = document.getElementById('doctor-specialty');
      if (input) input.value = pill.dataset.spec;
    });
  });
}

function updateAuthUI() {
  if (state.accessToken && state.user) {
    authUserChip.style.display = 'flex';
    navLoginBtn.style.display = 'none';
    userAvatar.textContent = (state.user.email || 'U').charAt(0).toUpperCase();
    userEmailText.textContent = state.user.email;
    tokenDisplayBox.style.display = 'block';
    activeTokenString.textContent = state.accessToken;
    if (patientsAuthNotice) patientsAuthNotice.style.display = 'none';
  } else {
    authUserChip.style.display = 'none';
    navLoginBtn.style.display = 'inline-block';
    tokenDisplayBox.style.display = 'none';
    activeTokenString.textContent = 'None';
    if (patientsAuthNotice) patientsAuthNotice.style.display = 'block';
  }
}

async function apiRequest(endpoint, options = {}) {
  const startTime = performance.now();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.accessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${state.accessToken}`;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers
    });
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = { text: await res.text() };
    }

    logResponse(res.status, res.statusText, duration, data);

    if (res.status === 401 && state.refreshToken && !options._retry) {
      const refreshed = await refreshToken();
      if (refreshed) {
        options._retry = true;
        return apiRequest(endpoint, options);
      }
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    logResponse(500, 'Network/Client Error', duration, { error: err.message });
    return { ok: false, status: 500, data: { error: err.message } };
  }
}

function logResponse(status, statusText, durationMs, data) {
  
  if (status >= 400) {
    console.warn(`[API ${status}] (${durationMs}ms):`, data);
  } else {
    console.log(`[API ${status}] (${durationMs}ms):`, data);
  }
}

async function checkHealth() {
  try {
    const res = await fetch('/health');
    const data = await res.json();
    if (data.status === 'ok') {
      document.getElementById('stat-health').textContent = '200 OK';
      document.getElementById('server-status-text').textContent = 'Online (:3000)';
    }
  } catch (e) {
    document.getElementById('stat-health').textContent = 'Offline';
    document.getElementById('server-status-text').textContent = 'Unreachable';
  }
}

function setupFormListeners() {
  
  navLoginBtn.addEventListener('click', () => {
    document.getElementById('tab-btn-auth').click();
  });

  logoutBtn.addEventListener('click', () => {
    state.accessToken = null;
    state.refreshToken = null;
    state.user = null;
    localStorage.removeItem('healthcare_access_token');
    localStorage.removeItem('healthcare_refresh_token');
    localStorage.removeItem('healthcare_user');
    updateAuthUI();
    loadPatients();
    logResponse(200, 'Signed Out', 0, { message: 'Signed out successfully. Session cleared.' });
  });

  document.getElementById('btn-copy-token').addEventListener('click', () => {
    if (state.accessToken) {
      navigator.clipboard.writeText(state.accessToken);
      const btn = document.getElementById('btn-copy-token');
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = 'Copy'), 1500);
    }
  });

  document.getElementById('btn-refresh-token').addEventListener('click', refreshToken);

  document.getElementById('btn-fill-register-demo').addEventListener('click', () => {
    const rand = Math.floor(Math.random() * 900) + 100;
    document.getElementById('reg-name').value = 'Dr. Sarah Connor';
    document.getElementById('reg-email').value = `doctor${rand}@healthcare.com`;
    document.getElementById('reg-password').value = 'Password123!';
  });

  document.getElementById('btn-fill-login-demo').addEventListener('click', () => {
    document.getElementById('login-email').value = 'patientuser@example.com';
    document.getElementById('login-password').value = 'Password123';
  });

  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    const payload = { email, password };
    if (name) payload.name = name;

    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      
      document.getElementById('login-email').value = email;
      document.getElementById('login-password').value = password;
      
      await doLogin(email, password);
    }
  });

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    await doLogin(email, password);
  });

  document.getElementById('btn-fill-patient-demo').addEventListener('click', () => {
    const names = [
      { first: 'Emma', last: 'Watson', dob: '1990-04-15' },
      { first: 'Robert', last: 'Downey', dob: '1985-06-20' },
      { first: 'Grace', last: 'Hopper', dob: '1975-12-09' }
    ];
    const item = names[Math.floor(Math.random() * names.length)];
    document.getElementById('patient-firstname').value = item.first;
    document.getElementById('patient-lastname').value = item.last;
    document.getElementById('patient-dob').value = item.dob;
  });

  document.getElementById('form-create-patient').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('patient-firstname').value.trim();
    const lastName = document.getElementById('patient-lastname').value.trim();
    const birthDate = document.getElementById('patient-dob').value;

    const res = await apiRequest('/api/patients', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, birthDate })
    });

    if (res.ok) {
      loadPatients();
      document.getElementById('form-create-patient').reset();
    }
  });

  document.getElementById('btn-refresh-patients').addEventListener('click', loadPatients);

  document.getElementById('btn-fill-doctor-demo').addEventListener('click', () => {
    const sampleDocs = [
      { first: 'Gregory', last: 'House', spec: 'Diagnostics' },
      { first: 'Meredith', last: 'Grey', spec: 'General Surgery' },
      { first: 'Stephen', last: 'Strange', spec: 'Neurology' },
      { first: 'Leonard', last: 'McCoy', spec: 'Cardiology' }
    ];
    const d = sampleDocs[Math.floor(Math.random() * sampleDocs.length)];
    document.getElementById('doctor-firstname').value = d.first;
    document.getElementById('doctor-lastname').value = d.last;
    document.getElementById('doctor-specialty').value = d.spec;
  });

  document.getElementById('form-create-doctor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('doctor-firstname').value.trim();
    const lastName = document.getElementById('doctor-lastname').value.trim();
    const specialty = document.getElementById('doctor-specialty').value.trim();

    const res = await apiRequest('/api/doctors', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, specialty })
    });

    if (res.ok) {
      loadDoctors();
      document.getElementById('form-create-doctor').reset();
    }
  });

  document.getElementById('btn-refresh-doctors').addEventListener('click', loadDoctors);

  document.getElementById('form-create-mapping').addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = document.getElementById('mapping-patient-select').value;
    const doctorId = parseInt(document.getElementById('mapping-doctor-select').value, 10);

    if (!patientId || !doctorId) return;

    const res = await apiRequest(`/api/patients/${patientId}/mappings`, {
      method: 'POST',
      body: JSON.stringify({ doctorId })
    });

    if (res.ok) {
      document.getElementById('filter-mapping-patient').value = patientId;
      loadMappingsForPatient(patientId);
    }
  });

  document.getElementById('filter-mapping-patient').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) loadMappingsForPatient(val);
  });

}

async function doLogin(email, password) {
  const res = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (res.ok && res.data.accessToken) {
    state.accessToken = res.data.accessToken;
    state.refreshToken = res.data.refreshToken;
    state.user = res.data.user || { email };
    localStorage.setItem('healthcare_access_token', state.accessToken);
    localStorage.setItem('healthcare_refresh_token', state.refreshToken);
    localStorage.setItem('healthcare_user', JSON.stringify(state.user));
    updateAuthUI();
    loadPatients();
    loadDoctors();
  }
}

async function refreshToken() {
  if (!state.refreshToken) return false;
  const res = await apiRequest('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: state.refreshToken })
  });

  if (res.ok && res.data.accessToken) {
    state.accessToken = res.data.accessToken;
    localStorage.setItem('healthcare_access_token', state.accessToken);
    updateAuthUI();
    return true;
  }
  return false;
}

async function loadPatients() {
  const container = document.getElementById('patients-list');
  const countBadge = document.getElementById('patients-count-badge');
  const statCount = document.getElementById('stat-patients');

  if (!state.accessToken) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔒</div>
        <p>Authentication Required</p>
        <span class="text-muted">Sign in to view your patient records.</span>
      </div>`;
    countBadge.textContent = '0';
    statCount.textContent = '0';
    return;
  }

  const res = await apiRequest('/api/patients');
  if (res.ok && Array.isArray(res.data)) {
    state.patients = res.data;
    countBadge.textContent = state.patients.length;
    statCount.textContent = state.patients.length;
    populateMappingDropdowns();

    if (state.patients.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏥</div>
          <p>No patients recorded yet.</p>
          <span class="text-muted">Add a patient using the form.</span>
        </div>`;
      return;
    }

    container.innerHTML = state.patients.map(p => `
      <div class="item-entry-card" id="patient-card-${p.id}">
        <div class="item-entry-main">
          <div class="item-name">${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</div>
          <div class="item-details">
            <span>ID: #${p.id}</span>
            <span>DOB: ${p.birthDate ? p.birthDate.split('T')[0] : 'N/A'}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn-secondary-sm" onclick="quickViewPatient(${p.id})">Inspect</button>
          <button class="btn-action-del" onclick="deletePatient(${p.id})">Delete</button>
        </div>
      </div>
    `).join('');
  }
}

window.deletePatient = async function(id) {
  if (!confirm(`Delete patient #${id}? This will also delete all doctor mappings.`)) return;
  const res = await apiRequest(`/api/patients/${id}`, { method: 'DELETE' });
  if (res.ok) loadPatients();
};

window.quickViewPatient = async function(id) {
  await apiRequest(`/api/patients/${id}`);
};

async function loadDoctors() {
  const container = document.getElementById('doctors-list');
  const countBadge = document.getElementById('doctors-count-badge');
  const statCount = document.getElementById('stat-doctors');

  const res = await apiRequest('/api/doctors');
  if (res.ok && Array.isArray(res.data)) {
    state.doctors = res.data;
    countBadge.textContent = state.doctors.length;
    statCount.textContent = state.doctors.length;
    populateMappingDropdowns();

    if (state.doctors.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🩺</div>
          <p>No doctors in directory.</p>
          <span class="text-muted">Register doctors to populate this list.</span>
        </div>`;
      return;
    }

    container.innerHTML = state.doctors.map(d => `
      <div class="item-entry-card" id="doctor-card-${d.id}">
        <div class="item-entry-main">
          <div class="item-name">${escapeHtml(d.firstName)} ${escapeHtml(d.lastName)}</div>
          <div class="item-details">
            <span>ID: #${d.id}</span>
            <span class="pill-chip">${escapeHtml(d.specialty)}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn-secondary-sm" onclick="quickViewDoctor(${d.id})">Inspect</button>
          <button class="btn-action-del" onclick="deleteDoctor(${d.id})">Delete</button>
        </div>
      </div>
    `).join('');
  }
}

window.deleteDoctor = async function(id) {
  if (!confirm(`Delete doctor #${id}?`)) return;
  const res = await apiRequest(`/api/doctors/${id}`, { method: 'DELETE' });
  if (res.ok) loadDoctors();
};

window.quickViewDoctor = async function(id) {
  await apiRequest(`/api/doctors/${id}`);
};

function populateMappingDropdowns() {
  const patientSelect = document.getElementById('mapping-patient-select');
  const filterSelect = document.getElementById('filter-mapping-patient');
  const doctorSelect = document.getElementById('mapping-doctor-select');

  if (patientSelect && state.patients) {
    const currentVal = patientSelect.value;
    patientSelect.innerHTML = '<option value="">-- Choose Patient --</option>' +
      state.patients.map(p => `<option value="${p.id}">${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)} (#${p.id})</option>`).join('');
    if (currentVal) patientSelect.value = currentVal;
  }

  if (filterSelect && state.patients) {
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="">-- Select Patient to view mappings --</option>' +
      state.patients.map(p => `<option value="${p.id}">${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)} (#${p.id})</option>`).join('');
    if (currentVal) filterSelect.value = currentVal;
  }

  if (doctorSelect && state.doctors) {
    const currentVal = doctorSelect.value;
    doctorSelect.innerHTML = '<option value="">-- Choose Doctor --</option>' +
      state.doctors.map(d => `<option value="${d.id}">${escapeHtml(d.firstName)} ${escapeHtml(d.lastName)} (${escapeHtml(d.specialty)})</option>`).join('');
    if (currentVal) doctorSelect.value = currentVal;
  }
}

async function loadMappingsForPatient(patientId) {
  const container = document.getElementById('mappings-list');
  const res = await apiRequest(`/api/patients/${patientId}/mappings`);
  
  if (res.ok && Array.isArray(res.data)) {
    document.getElementById('stat-mappings').textContent = res.data.length;
    if (res.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔗</div>
          <p>No doctors assigned to this patient.</p>
          <span class="text-muted">Assign a doctor using the form on the left.</span>
        </div>`;
      return;
    }

    container.innerHTML = res.data.map(m => {
      const doc = m.doctor || {};
      return `
        <div class="item-entry-card">
          <div class="item-entry-main">
            <div class="item-name">${doc.firstName ? escapeHtml(doc.firstName + ' ' + doc.lastName) : 'Doctor #' + m.doctorId}</div>
            <div class="item-details">
              <span>Mapping ID: #${m.id}</span>
              ${doc.specialty ? `<span class="pill-chip">${escapeHtml(doc.specialty)}</span>` : ''}
            </div>
          </div>
          <div class="item-actions">
            <button class="btn-action-del" onclick="deleteMapping(${patientId}, ${m.id})">Unlink</button>
          </div>
        </div>`;
    }).join('');
  }
}

window.deleteMapping = async function(patientId, mappingId) {
  const res = await apiRequest(`/api/patients/${patientId}/mappings/${mappingId}`, { method: 'DELETE' });
  if (res.ok) loadMappingsForPatient(patientId);
};

function setupExplorer() {
  const methodSelect = document.getElementById('explorer-method');
  const urlInput = document.getElementById('explorer-url');
  const bodyInput = document.getElementById('explorer-body');
  const sendBtn = document.getElementById('btn-send-explorer');

  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      methodSelect.value = chip.dataset.method;
      urlInput.value = chip.dataset.url;
    });
  });

  sendBtn.addEventListener('click', async () => {
    const method = methodSelect.value;
    const url = urlInput.value.trim();
    const bodyStr = bodyInput.value.trim();

    const options = { method };
    if (['POST', 'PUT', 'PATCH'].includes(method) && bodyStr) {
      try {
        JSON.parse(bodyStr); 
        options.body = bodyStr;
      } catch (e) {
        alert('Invalid JSON in request body');
        return;
      }
    }

    await apiRequest(url, options);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
