const MAX_PERMS_WARN = 5000;   // soglia avviso lentezza
const MAX_PERMS_SHOW = 60;     // max permutazioni mostrate in lista


document.getElementById('compute-btn').addEventListener('click', compute);

['tree1-input', 'tree2-input'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') compute();
  });
});

document.getElementById('clear-btn').addEventListener('click', () => {
  document.getElementById('tree1-input').value = '';
  document.getElementById('tree2-input').value = '';
  clearAll();
});

// Esempi pre-caricati
document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('tree1-input').value = btn.dataset.t1;
    document.getElementById('tree2-input').value = btn.dataset.t2;
    compute();
  });
});


//  HELPER UI

function showError(msg) {
  const el = document.getElementById('error-bar');
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
}

function clearAll() {
  showError('');
  ['wrapper1', 'wrapper2', 'wrapper-result'].forEach(clearTree);
  document.getElementById('perms-list').innerHTML = '';
  setBadge('badge1', null);
  setBadge('badge2', null);
  setBadge('badge-result', null);
}

function setBadge(id, n) {
  const el = document.getElementById(id);
  if (n === null) {
    el.textContent = '';
    el.className = 'perm-badge';
  } else if (n === 0) {
    el.textContent = '∅ vuota';
    el.className = 'perm-badge badge-empty';
  } else {
    el.textContent = `${n} perm.`;
    el.className = 'perm-badge badge-ok';
  }
}

function renderPermsList(perms) {
  const el = document.getElementById('perms-list');
  if (!perms || perms.length === 0) {
    el.innerHTML = '<span class="no-perms">Nessuna permutazione comune.</span>';
    return;
  }

  const shown    = perms.slice(0, MAX_PERMS_SHOW);
  const overflow = perms.length - shown.length;

  const items = shown.map(p =>
    `<span class="perm-tag">${p.join(' ')}</span>`
  ).join('');

  const more = overflow > 0
    ? `<span class="perm-more">…e altre ${overflow} permutazioni</span>`
    : '';

  el.innerHTML = `<div class="perms-label">Permutazioni valide</div>
    <div class="perms-grid">${items}${more}</div>`;
}

// ─────────────────────────────────────────
//  CALCOLO PRINCIPALE
// ─────────────────────────────────────────

function compute() {
  clearAll();

  const s1 = document.getElementById('tree1-input').value.trim();
  const s2 = document.getElementById('tree2-input').value.trim();

  if (!s1 || !s2) {
    showError('Inserisci entrambi gli alberi prima di calcolare.');
    return;
  }

  // Parse
  let t1, t2;
  try { t1 = parseTree(s1); }
  catch (e) { showError(`Errore nell'Albero 1: ${e.message}`); return; }
  try { t2 = parseTree(s2); }
  catch (e) { showError(`Errore nell'Albero 2: ${e.message}`); return; }

  // Controlla insiemi foglie
  const lv1 = new Set(getLeaves(t1));
  const lv2 = new Set(getLeaves(t2));
  const same = [...lv1].every(v => lv2.has(v)) && [...lv2].every(v => lv1.has(v));
  if (!same) {
    showError(
      `⚠ I due alberi hanno insiemi di foglie diversi ` +
      `(Albero 1: {${[...lv1].join(',')}} · Albero 2: {${[...lv2].join(',')}}).`
    );
    return;
  }

  // Genera permutazioni
  let perms1, perms2;
  try { perms1 = generateLeafOrderings(t1); }
  catch (e) { showError(`Errore permutazioni Albero 1: ${e.message}`); return; }
  try { perms2 = generateLeafOrderings(t2); }
  catch (e) { showError(`Errore permutazioni Albero 2: ${e.message}`); return; }

  const maxP = Math.max(perms1.length, perms2.length);
  if (maxP > MAX_PERMS_WARN) {
    const ok = confirm(
      `Attenzione: ci sono ${maxP} permutazioni da processare.\n` +
      `L'operazione potrebbe richiedere alcuni secondi.\nContinuare?`
    );
    if (!ok) return;
  }

  setBadge('badge1', perms1.length);
  setBadge('badge2', perms2.length);

  // Visualizza alberi di input
  renderTree(t1, 'wrapper1');
  renderTree(t2, 'wrapper2');

  // Intersezione
  const inter = intersectPermutations(perms1, perms2);
  setBadge('badge-result', inter.length);
  renderPermsList(inter);

  if (inter.length === 0) {
    clearTree('wrapper-result');
    document.getElementById('wrapper-result').innerHTML =
      '<div class="empty-msg">Intersezione vuota</div>';
    return;
  }

  // Ricostruisci e visualizza
  const resultTree = reconstructTree(inter);
  if (resultTree) {
    renderTree(resultTree, 'wrapper-result');
  } else {
    document.getElementById('wrapper-result').innerHTML =
      '<div class="empty-msg">Impossibile ricostruire l\'albero</div>';
  }
}

// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────

// Carica il primo esempio all'avvio
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.example-btn');
  if (btn) {
    document.getElementById('tree1-input').value = btn.dataset.t1;
    document.getElementById('tree2-input').value = btn.dataset.t2;
  }
});
