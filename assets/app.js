// Single-file app logic (demo, no backend). Uses localStorage for demo data.
// Key data: products stored as {id, name, price, sales:[{date,amount}]}

const SELECTORS = {
  userArea: '#user-area',
  nav: '#nav',
  views: '#views',
  loginView: '#view-login',
  dashboardView: '#view-dashboard',
  reportsView: '#view-reports',
  productsView: '#view-products',
  loginForm: '#login-form',
  username: '#username',
  password: '#password',
  userAreaBtn: '#user-area',
  tabBtn: '.tab-btn',
  reportSearch: '#report-search',
  reportSearchBtn: '#report-search-btn',
  reportTable: '#report-table tbody',
  reportPagination: '#report-pagination',
  productsTable: '#products-table tbody',
  productsPagination: '#products-pagination',
  btnAddProduct: '#btn-add-product',
  modal: '#modal',
  modalTitle: '#modal-title',
  productForm: '#product-form',
  productName: '#product-name',
  productPrice: '#product-price',
  modalCancel: '#modal-cancel'
};

const PAGE_SIZE = 5;

// Utilities
function q(sel, root=document) { return root.querySelector(sel); }
function qa(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }
function saveProducts(arr){ localStorage.setItem('products', JSON.stringify(arr)); }
function loadProducts(){ return JSON.parse(localStorage.getItem('products')||'[]'); }
function nextId(){ const p = loadProducts(); return p.length? Math.max(...p.map(x=>x.id))+1:1; }
function requireLogin(){ return !!localStorage.getItem('reporting_user'); }

// Sample seed if empty
function seedIfEmpty(){
  if(loadProducts().length===0){
    const sample = [
      {id:1,name:'Alpha',price:19.99, sales: genSales(6,[10,50])},
      {id:2,name:'Beta',price:29.9, sales: genSales(6,[5,30])},
      {id:3,name:'Gamma',price:9.5, sales: genSales(6,[20,80])},
      {id:4,name:'Delta',price:49.0, sales: genSales(6,[0,25])},
      {id:5,name:'Epsilon',price:15.0, sales: genSales(6,[5,60])},
      {id:6,name:'Zeta',price:99.0, sales: genSales(6,[1,40])}
    ];
    saveProducts(sample);
  }
}
function genSales(months,range=[0,100]){
  const arr=[];
  const now = new Date();
  for(let i=months-1;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    arr.push({date: d.toISOString().slice(0,10), amount: Math.floor(Math.random()*(range[1]-range[0])+range[0])});
  }
  return arr;
}

// Auth UI
function renderUserArea(){
  const el = q(SELECTORS.userArea);
  el.innerHTML = '';
  if(requireLogin()){
    const user = JSON.parse(localStorage.getItem('reporting_user'));
    const span = document.createElement('div');
    span.className = 'user-chip';
    span.textContent = `${user.username}`;
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.className = 'btn-link';
    logoutBtn.onclick = () => { localStorage.removeItem('reporting_user'); init(); };
    el.appendChild(span);
    el.appendChild(logoutBtn);
  } else {
    const form = document.createElement('form');
    form.id = 'inline-login';
    const u = document.createElement('input'); u.placeholder='Username'; u.required=true; u.name='u';
    const p = document.createElement('input'); p.placeholder='Password'; p.type='password'; p.required=true; p.name='p';
    const btn = document.createElement('button'); btn.textContent='Login';
    form.appendChild(u); form.appendChild(p); form.appendChild(btn);
    form.onsubmit = (ev)=>{
      ev.preventDefault();
      localStorage.setItem('reporting_user', JSON.stringify({username: u.value}));
      init();
    };
    el.appendChild(form);
  }
}

// Navigation and view switching
function showNav(show=true){
  const nav = q(SELECTORS.nav);
  if(show) nav.classList.remove('hidden'); else nav.classList.add('hidden');
}
function showView(name){
  // hide all views, show selected
  qa('.view').forEach(v => v.classList.add('hidden'));
  q(`#view-${name}`).classList.remove('hidden');
  // update active tab
  qa(SELECTORS.tabBtn).forEach(b=>b.classList.remove('active'));
  const btn = qa(SELECTORS.tabBtn).find(b=>b.dataset.tab===name);
  if(btn) btn.classList.add('active');
  // optionally render view content
  if(name==='dashboard') renderDashboard();
  if(name==='reports') renderReports(1);
  if(name==='products') renderProducts(1);
}

// Dashboard charts
let pieChart=null, lineChart=null;
function renderDashboard(){
  const products = loadProducts();
  const labels = products.map(p=>p.name);
  const totals = products.map(p=>p.sales.reduce((s,x)=>s+x.amount,0));
  // Pie
  const pieCtx = q('#pieChart').getContext('2d');
  if(pieChart) pieChart.destroy();
  pieChart = new Chart(pieCtx, {
    type:'pie',
    data:{labels, datasets:[{data:totals, backgroundColor: labels.map((_,i)=>`hsl(${i*60%360} 70% 60%)`)}]},
    options:{responsive:true, maintainAspectRatio:false}
  });
  // Line: aggregate by month across products
  const months = products[0]?.sales.map(s=>s.date) || [];
  const datasets = products.map((p,i)=>({
    label: p.name,
    data: p.sales.map(s=>s.amount),
    borderColor: `hsl(${i*60%360} 70% 40%)`,
    tension:0.3,
    fill:false
  }));
  const lineCtx = q('#lineChart').getContext('2d');
  if(lineChart) lineChart.destroy();
  lineChart = new Chart(lineCtx, {
    type:'line',
    data:{labels:months, datasets},
    options:{responsive:true, maintainAspectRatio:false}
  });
}

// Reports: search + pagination (report shows product total sales)
function searchReports(query){
  const all = loadProducts().map(p=>({name:p.name, total: p.sales.reduce((s,x)=>s+x.amount,0)}));
  if(!query) return all;
  return all.filter(r=>r.name.toLowerCase().includes(query.toLowerCase()));
}
function renderReports(page=1){
  const query = q(SELECTORS.reportSearch).value || '';
  const rows = searchReports(query);
  paginateRender(rows, page, SELECTORS.reportTable, SELECTORS.reportPagination, (row)=>{
    return `<tr><td>${row.name}</td><td>${row.total}</td></tr>`;
  });
}

// Products: list with pagination and CRUD
function renderProducts(page=1){
  const rows = loadProducts().map(p=>({id:p.id,name:p.name,price:p.price}));
  paginateRender(rows, page, SELECTORS.productsTable, SELECTORS.productsPagination, (r)=>{
    return `<tr>
      <td>${r.id}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>$${Number(r.price).toFixed(2)}</td>
      <td>
        <button data-id="${r.id}" class="btn-edit">Edit</button>
        <button data-id="${r.id}" class="btn-delete">Delete</button>
      </td>
    </tr>`;
  }, ()=> {
    // attach actions
    qa('.btn-edit').forEach(b=>b.onclick = ()=> openProductModal('edit', Number(b.dataset.id)));
    qa('.btn-delete').forEach(b=>b.onclick = ()=> {
      if(confirm('Delete product?')) {
        deleteProduct(Number(b.dataset.id));
        renderProducts(1);
      }
    });
  });
}

function deleteProduct(id){
  const all = loadProducts().filter(p=>p.id!==id);
  saveProducts(all);
}

// Pagination renderer utility
function paginateRender(rows, page, tbodySelector, paginationSelector, rowRenderer, onRendered){
  const tbody = q(tbodySelector);
  const pagination = q(paginationSelector);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  page = Math.min(Math.max(1, page), totalPages);
  const start = (page-1)*PAGE_SIZE;
  const slice = rows.slice(start, start+PAGE_SIZE);
  tbody.innerHTML = slice.map(rowRenderer).join('') || `<tr><td colspan="4">No results</td></tr>`;
  // pagination controls
  const pages = [];
  for(let i=1;i<=totalPages;i++){
    pages.push(`<button data-page="${i}" ${i===page?'disabled':''}>${i}</button>`);
  }
  pagination.innerHTML = pages.join('');
  // attach clicks
  pagination.querySelectorAll('button').forEach(b=>{
    b.onclick = ()=> {
      const p = Number(b.dataset.page);
      // determine caller by paginationSelector
      if(paginationSelector===SELECTORS.productsPagination) renderProducts(p);
      else if(paginationSelector===SELECTORS.reportPagination) renderReports(p);
    };
  });
  if(onRendered) onRendered();
}

// Modal for Add/Edit product
let modalMode='add', modalEditId=null;
function openProductModal(mode='add', id=null){
  modalMode = mode; modalEditId = id;
  const modal = q(SELECTORS.modal);
  q(SELECTORS.modalTitle).textContent = (mode==='add' ? 'Add Product':'Edit Product');
  q(SELECTORS.productForm).reset();
  if(mode==='edit'){
    const p = loadProducts().find(x=>x.id===id);
    if(p){ q(SELECTORS.productName).value = p.name; q(SELECTORS.productPrice).value = p.price; }
  }
  modal.classList.remove('hidden');
}
function closeModal(){ q(SELECTORS.modal).classList.add('hidden'); }

// Save product
function saveProductFromModal(ev){
  ev.preventDefault();
  const name = q(SELECTORS.productName).value.trim();
  const price = Number(q(SELECTORS.productPrice).value);
  if(!name || isNaN(price)) return alert('Provide valid data');
  if(modalMode==='add'){
    const id = nextId();
    const p = {id, name, price, sales: genSales(6,[0,100])};
    const all = loadProducts(); all.push(p); saveProducts(all);
  } else {
    const all = loadProducts();
    const idx = all.findIndex(x=>x.id===modalEditId);
    if(idx!==-1){ all[idx].name = name; all[idx].price=price; saveProducts(all); }
  }
  closeModal();
  renderProducts(1);
  renderDashboard();
}

// Simple escape
function escapeHtml(s){ return String(s).replace(/[&<>"]'/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Add product button handler
function addProductClick(){ openProductModal('add', null); }

// Product form handler bound above
// Report search handler
function onReportSearch(){ renderReports(1); }

// Bind events
function bindEvents(){
  // nav tabs
  qa(SELECTORS.tabBtn).forEach(b=> b.onclick = ()=> {
    showView(b.dataset.tab);
  });
  q(SELECTORS.reportSearchBtn).onclick = onReportSearch;
  q(SELECTORS.btnAddProduct).onclick = addProductClick;
  q(SELECTORS.modalCancel).onclick = closeModal;
  q(SELECTORS.productForm).onsubmit = saveProductFromModal;
  // inline login (top-right) handled in renderUserArea
  // also support login form on main view
  q(SELECTORS.loginForm).onsubmit = (ev)=>{
    ev.preventDefault();
    const u = q(SELECTORS.username).value.trim();
    const p = q(SELECTORS.password).value.trim();
    if(!u||!p) return alert('Enter credentials');
    localStorage.setItem('reporting_user', JSON.stringify({username:u}));
    init();
  };
}

// Initialization
function init(){
  seedIfEmpty();
  renderUserArea();
  bindEvents();
  if(requireLogin()){
    showNav(true);
    // default to dashboard
    showView('dashboard');
  } else {
    showNav(false);
    showView('login');
  }
}

// Start
document.addEventListener('DOMContentLoaded', init);
