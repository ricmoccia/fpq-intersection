//  PARSER
function parseTree(raw) {
  const str = raw.replace(/\s/g, '');
  let pos = 0;

  function peek() { return str[pos]; }

  function consume(ch) {
    if (str[pos] !== ch)
      throw new Error(`Atteso '${ch}' alla pos ${pos}, trovato '${str[pos] ?? 'fine'}'`);
    pos++;
  }

  function parseNode() {
    if (pos >= str.length) throw new Error('Fine input inattesa');
    const ch = peek();

    if (ch === 'F' || ch === 'P' || ch === 'Q') {
      const type = ch; pos++;
      consume('(');
      const children = [];
      while (pos < str.length && peek() !== ')') {
        if (peek() === ',') { pos++; continue; }
        children.push(parseNode());
      }
      consume(')');
      if (children.length === 0) throw new Error(`Nodo ${type} senza figli`);
      return { type, children };
    }

    if (/[0-9]/.test(ch)) {
      const start = pos;
      while (pos < str.length && /[0-9]/.test(str[pos])) pos++;
      return { type: 'leaf', value: parseInt(str.slice(start, pos)) };
    }

    throw new Error(`Carattere inatteso '${ch}' alla pos ${pos}`);
  }

  const tree = parseNode();
  if (pos !== str.length)
    throw new Error(`Testo inatteso dalla pos ${pos}: "${str.slice(pos)}"`);
  return tree;
}


//  funzioni per generare e manipolare permutazioni di foglie
function indexPermutations(n) {
  if (n === 0) return [[]];
  if (n === 1) return [[0]];
  const result = [];
  for (let i = 0; i < n; i++) {
    for (const p of indexPermutations(n - 1)) {
      result.push([i, ...p.map(x => (x >= i ? x + 1 : x))]);
    }
  }
  return result;
}

function cartesian(arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap(a => arr.map(b => [...a, ...b])),
    [[]]
  );
}

function dedupPerms(perms) {
  const seen = new Set();
  return perms.filter(p => {
    const k = p.join(',');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}


//  GENERAZIONE PERMUTAZIONI FOGLIE

/**
 * Regole FPQ:
 *  F → ordine fisso (solo la disposizione originale dei figli)
 *  Q → ordine originale OPPURE rovesciato
 *  P → qualsiasi permutazione dei figli
 */
function generateLeafOrderings(node) {
  if (node.type === 'leaf') return [[node.value]];

  const childPerms = node.children.map(generateLeafOrderings);

  if (node.type === 'F') {
    return cartesian(childPerms);
  }

  if (node.type === 'Q') {
    const orig = cartesian(childPerms);
    const rev  = cartesian([...childPerms].reverse());
    return dedupPerms([...orig, ...rev]);
  }

  // P: tutte le permutazioni degli indici dei figli
  const all = [];
  for (const ip of indexPermutations(node.children.length)) {
    all.push(...cartesian(ip.map(i => childPerms[i])));
  }
  return dedupPerms(all);
}

//  INTERSEZIONE

function intersectPermutations(perms1, perms2) {
  const set1 = new Set(perms1.map(p => p.join(',')));
  return perms2.filter(p => set1.has(p.join(',')));
}

//  FOGLIE DI UN ALBERO

function getLeaves(node) {
  if (node.type === 'leaf') return [node.value];
  return node.children.flatMap(getLeaves);
}

// ─────────────────────────────────────────
//  RICOSTRUZIONE ALBERO FPQ DA INSIEME DI PERMUTAZIONI
// ─────────────────────────────────────────

/**
 * Algoritmo basato sui "moduli forti" (strong modules).
 *
 * Un insieme S di elementi è un MODULO se in ogni permutazione
 * le foglie di S formano un blocco contiguo (non necessariamente nello stesso ordine)
 *
 * Un modulo è FORTE se non si sovrappone (in senso insiemistico) a
 * nessun altro modulo: per ogni altro modulo M', o M∩M'=∅, oppure
 * M⊆M' o M'⊆M. I moduli forti formano una famiglia laminare(WIKIPEDIA: laminar set family: is a set family 
 * in which each pair of sets are either disjoint or related by containment) e
 * corrispondono esattamente ai nodi dell'FPQ-tree canonico.
 *
 * I nodi interni sono identificati come F, Q o P in base al numero
 * di ordinamenti distinti dei figli presenti nelle permutazioni.
 */
function reconstructTree(permutations) {
  permutations = dedupPerms(permutations);
  if (!permutations || permutations.length === 0) return null;

  const p0 = permutations[0];
  const n  = p0.length;

  if (n === 0) return null;
  if (n === 1) return { type: 'leaf', value: p0[0] };

  // 1. Calcola tutti i moduli (intervalli universalmente consecutivi) 

  const modCache = new Map();

  function isModule(i, j) {
    const key = `${i},${j}`;
    if (modCache.has(key)) return modCache.get(key);
    if (i === j) { modCache.set(key, true); return true; }

    const S = new Set(p0.slice(i, j + 1));
    let ok = true;

    outer:
    for (const perm of permutations) {
      const positions = [];
      for (let t = 0; t < perm.length; t++) {
        if (S.has(perm[t])) positions.push(t);
      }
      for (let t = 1; t < positions.length; t++) {
        if (positions[t] !== positions[t - 1] + 1) { ok = false; break outer; }
      }
    }

    modCache.set(key, ok);
    return ok;
  }

  const allModules = [];
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (isModule(i, j)) allModules.push([i, j]);
    }
  }

  // 2. Filtra per moduli FORTI (nessuna sovrapposizione con altri moduli) 
  //
  // Due intervalli [a,b] e [c,d] si SOVRAPPONGONO se:
  //   - hanno elementi in comune  (a <= d && c <= b)
  //   - nessuno contiene l'altro  (!aContainsC && !cContainsA)

  function overlaps(a, b, c, d) {
    if (a === c && b === d) return false;  // stesso intervallo
    const intersect = a <= d && c <= b;
    if (!intersect) return false;
    const aContainsC = a <= c && b >= d;
    const cContainsA = c <= a && d >= b;
    return !aContainsC && !cContainsA;
  }

  const strongModules = allModules.filter(([a, b]) =>
    !allModules.some(([c, d]) => overlaps(a, b, c, d))
  );

  const strongSet = new Set(strongModules.map(([a, b]) => `${a},${b}`));

  //  3. Figli diretti di [start, end] 

  function directChildren(start, end) {
    if (start === end) return [[start, end]];

    // Moduli forti strettamente interni a [start, end]
    const inner = strongModules.filter(
      ([a, b]) => a >= start && b <= end && !(a === start && b === end)
    );

    // Tra questi, i massimali (non contenuti in altri inner)
    const maximal = inner
      .filter(([a, b]) => !inner.some(([c, d]) => c <= a && d >= b && !(c === a && d === b)))
      .sort((x, y) => x[0] - y[0]);

    // Assembla la partizione colmando buchi con foglie singole
    const partition = [];
    let cur = start;
    for (const [a, b] of maximal) {
      for (let i = cur; i < a; i++) partition.push([i, i]);
      partition.push([a, b]);
      cur = b + 1;
    }
    for (let i = cur; i <= end; i++) partition.push([i, i]);

    return partition;
  }

  // 4. Costruzione ricorsiva 

  function factorial(m) {
    let r = 1;
    for (let i = 2; i <= m; i++) r *= i;
    return r;
  }

  function buildNode(start, end) {
    if (start === end) return { type: 'leaf', value: p0[start] };

    const children = directChildren(start, end);

    if (children.length === 1) {
      // Nodo degenere: ricadi sul figlio unico
      return buildNode(children[0][0], children[0][1]);
    }

    const childNodes = children.map(([s, e]) => buildNode(s, e));

    // Mappa valore → indice figlio
    const childOf = {};
    children.forEach(([s, e], ci) => {
      for (let i = s; i <= e; i++) childOf[p0[i]] = ci;
    });

    const S = new Set(p0.slice(start, end + 1));
    const orderSet = new Set();
    const blockLen = end - start + 1;

    for (const perm of permutations) {
      let bStart = -1;
      for (let t = 0; t < perm.length; t++) {
        if (S.has(perm[t])) { bStart = t; break; }
      }
      if (bStart === -1) continue;

      const order = [];
      for (let t = bStart; t < bStart + blockLen; t++) {
        const ci = childOf[perm[t]];
        if (order.length === 0 || order[order.length - 1] !== ci) order.push(ci);
      }
      orderSet.add(order.join(','));
    }

    const uniqueOrders = [...orderSet];
    const k = children.length;

    let type;
    if (uniqueOrders.length === 1) {
      type = 'F';
    } else if (uniqueOrders.length === 2) {
      const o1 = uniqueOrders[0].split(',').map(Number);
      const o2 = uniqueOrders[1].split(',').map(Number);
      const isRev = o1.length === k && o1.every((v, i) => v === o2[k - 1 - i]);
      type = isRev ? 'Q' : 'P';
    } else if (uniqueOrders.length === factorial(k)) {
      type = 'P';
    } else {
      type = 'P';  // approssimazione
    }

    return { type, children: childNodes };
  }

  return buildNode(0, n - 1);
}
