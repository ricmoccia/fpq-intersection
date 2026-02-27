//Rendering degli FPQ-tree
const NODE_R   = 22;   // raggio nodi P e foglie
const NODE_W   = 54;   // larghezza nodi Q/F
const NODE_H   = 30;   // altezza nodi Q/F
const H_GAP    = 70;   // distanza orizzontale minima tra foglie
const V_GAP    = 90;   // distanza verticale tra livelli

/**
 * Calcola la profondità massima di un albero.
 */
function treeDepth(node) {
  if (!node.children || node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(treeDepth));
}

/**
 * Conta le foglie.
 */
function leafCount(node) {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + leafCount(c), 0);
}

/**
 * Renderizza un FPQ-tree in un elemento <div> contenitore.
 * Crea internamente un SVG scrollabile.
 *
 * @param {object|null} treeData  - nodo radice
 * @param {string}      wrapperId - id del div contenitore
 * @param {string}      label     - etichetta opzionale
 */
function renderTree(treeData, wrapperId, label = '') {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  wrapper.innerHTML = '';

  if (!treeData) {
    wrapper.innerHTML = '<div class="empty-msg">Nessun albero</div>';
    return;
  }

  const leaves  = leafCount(treeData);
  const depth   = treeDepth(treeData);
  const svgW    = Math.max(320, leaves * H_GAP + 60);
  const svgH    = Math.max(200, (depth + 1) * V_GAP + 60);

  const svg = d3.select(wrapper)
    .append('svg')
    .attr('width',  svgW)
    .attr('height', svgH);

  // Filtro glow per highlight
  const defs = svg.append('defs');
  const glow = defs.append('filter').attr('id', `glow-${wrapperId}`);
  glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
  const merge = glow.append('feMerge');
  merge.append('feMergeNode').attr('in', 'blur');
  merge.append('feMergeNode').attr('in', 'SourceGraphic');

  const margin = { top: 44, left: 30, right: 30, bottom: 20 };
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const root   = d3.hierarchy(treeData, d => d.children);
  const layout = d3.tree()
    .size([svgW - margin.left - margin.right, svgH - margin.top - margin.bottom])
    .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.6));

  layout(root);

  // Link 
  g.selectAll('.fpq-link')
    .data(root.links())
    .enter()
    .append('path')
    .attr('class', 'fpq-link')
    .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y));

  //  Nodi
  const nodeG = g.selectAll('.fpq-node')
    .data(root.descendants())
    .enter()
    .append('g')
    .attr('class', d => `fpq-node fpq-${d.data.type}`)
    .attr('transform', d => `translate(${d.x},${d.y})`);

  // Foglie: cerchio piccolo
  nodeG.filter(d => d.data.type === 'leaf')
    .append('circle')
    .attr('r', NODE_R - 4)
    .attr('class', 'leaf-shape');

  // Nodi P: cerchio grande
  nodeG.filter(d => d.data.type === 'P')
    .append('circle')
    .attr('r', NODE_R)
    .attr('class', 'p-shape');

  // Nodi Q: rettangolo arrotondato
  nodeG.filter(d => d.data.type === 'Q')
    .append('rect')
    .attr('x',      -NODE_W / 2)
    .attr('y',      -NODE_H / 2)
    .attr('width',   NODE_W)
    .attr('height',  NODE_H)
    .attr('rx',      6)
    .attr('class',  'q-shape');

  // Nodi F: rettangolo netto
  nodeG.filter(d => d.data.type === 'F')
    .append('rect')
    .attr('x',      -NODE_W / 2)
    .attr('y',      -NODE_H / 2)
    .attr('width',   NODE_W)
    .attr('height',  NODE_H)
    .attr('rx',      2)
    .attr('class',  'f-shape');

  // Testo etichette
  nodeG.append('text')
    .attr('class', 'node-label')
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .text(d => d.data.type === 'leaf' ? d.data.value : d.data.type);

  // Contatore figli (piccolo badge sotto i nodi interni)
  nodeG.filter(d => d.data.type !== 'leaf')
    .append('text')
    .attr('class', 'node-badge')
    .attr('dy', NODE_H / 2 + 14)
    .attr('text-anchor', 'middle')
    .text(d => d.data.children ? `(${d.data.children.length})` : '');

  // Etichetta SVG in alto
  if (label) {
    svg.append('text')
      .attr('class', 'svg-label')
      .attr('x', svgW / 2)
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .text(label);
  }
}

/**
 * Cancella il contenuto di un wrapper.
 */
function clearTree(wrapperId) {
  const wrapper = document.getElementById(wrapperId);
  if (wrapper) wrapper.innerHTML = '';
}
