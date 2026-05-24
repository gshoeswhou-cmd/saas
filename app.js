
// Business OS SaaS static MVP v1
// Public anon key is safe for frontend usage. Never place service role key here.
const SUPABASE_URL = "https://uhrtawnxfnwdikwhwkho.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVocnRhd254Zm53ZGlrd2h3a2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTA3NzEsImV4cCI6MjA5NTE4Njc3MX0.XrqnsHxlQyFxSAfZxRMDc_c7AN968vM_WpjkDMIeUhI";

const PLATFORM_GCASH_ACCOUNTS = [
  { label: "GCash 1", name: "Monaliza V.", number: "0960 597 1283", qr: "./assets/qr-monaliza.jpg" },
  { label: "GCash 2", name: "Lorna Diaz", number: "0912 669 9412", qr: "./assets/qr-lorna.jpg" },
  { label: "GCash 3", name: "Myra V.", number: "0994 983 9551", qr: "./assets/qr-myra.jpg" },
];

const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $app = document.getElementById("app");

let STATE = {
  session: null,
  user: null,
  member: null,
  business: null,
  settings: null,
};

const money = n => "₱" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0,10);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function setHash(route){ location.hash = route; }
function route(){ return location.hash.replace("#","") || "/login"; }
function setMsg(id, text, type=""){ const el=document.getElementById(id); if(el){ el.className = `msg ${type}`; el.textContent=text; el.classList.toggle("hidden", !text); } }

async function refreshSession(){
  const { data } = await supa.auth.getSession();
  STATE.session = data.session;
  STATE.user = data.session?.user || null;
  if(STATE.user) await loadCurrentBusiness();
}

async function loadCurrentBusiness(){
  STATE.member = null; STATE.business = null; STATE.settings = null;
  const { data: members, error } = await supa
    .from("business_members")
    .select("*, businesses(*)")
    .eq("user_id", STATE.user.id)
    .eq("is_active", true)
    .limit(1);
  if(error || !members || !members.length) return;
  STATE.member = members[0];
  STATE.business = members[0].businesses;
  const { data: settings } = await supa.from("business_settings").select("*").eq("business_id", STATE.business.id).maybeSingle();
  STATE.settings = settings;
}

async function init(){
  await refreshSession();
  window.addEventListener("hashchange", render);
  render();
}
init();

function render(){
  const r = route();
  if(!STATE.user && !["/login","/signup"].includes(r)) return renderLogin();
  if(STATE.user && !STATE.business && !["/onboarding"].includes(r)) return renderOnboarding();
  if(STATE.business && STATE.business.status === "pending_payment" && !["/payment","/payment-pending","/logout"].includes(r)) return renderPayment();
  if(r === "/signup") return renderSignup();
  if(r === "/login") return renderLogin();
  if(r === "/onboarding") return renderOnboarding();
  if(r === "/payment" || r === "/payment-pending") return renderPayment();
  if(r === "/logout") return logout();
  return renderAppShell(r);
}

function renderLogin(){
  $app.innerHTML = authShell("Login", "Access your business dashboard.", `
    <div id="authMsg" class="msg hidden"></div>
    <label>Email</label><input id="email" type="email" autocomplete="email">
    <label>Password</label><input id="password" type="password" autocomplete="current-password">
    <div class="grid" style="margin-top:16px">
      <button class="btn primary block" onclick="login()">Login</button>
      <button class="btn block" onclick="setHash('/signup')">Create account</button>
    </div>
  `);
}

function renderSignup(){
  $app.innerHTML = authShell("Create account", "Start your business workspace setup.", `
    <div id="authMsg" class="msg hidden"></div>
    <label>Email</label><input id="email" type="email" autocomplete="email">
    <label>Password</label><input id="password" type="password" autocomplete="new-password">
    <div class="grid" style="margin-top:16px">
      <button class="btn primary block" onclick="signup()">Create account</button>
      <button class="btn block" onclick="setHash('/login')">I already have an account</button>
    </div>
    <p class="small" style="margin-top:14px">For testing, disable email confirmation in Supabase if rate limits happen.</p>
  `);
}

function authShell(title, subtitle, form){
  return `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-hero">
          <div class="brand"><div class="logo">B</div><div><h1 style="font-size:18px;margin:0;letter-spacing:0">Business OS</h1><p>Small business operating system</p></div></div>
          <h1>Track sales, stock, expenses, invoices & profit.</h1>
          <p>Built for Filipino small business owners: product-based, service-based, or both.</p>
          <div class="grid two" style="margin-top:24px">
            <div class="kpi"><span>Templates</span><strong>10+</strong></div>
            <div class="kpi"><span>Core tools</span><strong>All-in</strong></div>
          </div>
        </div>
        <div class="auth-form">
          <h2 style="margin:0 0 8px">${title}</h2>
          <p style="color:var(--muted);margin:0 0 22px">${subtitle}</p>
          <div class="grid">${form}</div>
        </div>
      </div>
    </div>
  `;
}

async function signup(){
  setMsg("authMsg","Creating account…");
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const { error } = await supa.auth.signUp({ email, password });
  if(error) return setMsg("authMsg", error.message, "error");
  setMsg("authMsg","Account created. Check email if confirmation is enabled, then login.", "good");
}

async function login(){
  setMsg("authMsg","Logging in…");
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  if(error) return setMsg("authMsg", error.message, "error");
  STATE.session = data.session; STATE.user = data.user;
  await loadCurrentBusiness();
  if(!STATE.business) return setHash("/onboarding");
  if(STATE.business.status === "pending_payment") return setHash("/payment");
  setHash("/dashboard");
}

async function logout(){
  await supa.auth.signOut();
  STATE = { session:null, user:null, member:null, business:null, settings:null };
  setHash("/login");
}

function defaultTemplateKey(model){
  if(model === "service_based") return "universal_service_based";
  if(model === "both") return "universal_both";
  return "universal_product_based";
}

function renderOnboarding(){
  $app.innerHTML = `
    <div class="auth-wrap">
      <div class="card" style="width:min(980px,100%)">
        <div class="card-hd"><h3>Business Setup</h3><button class="btn" onclick="logout()">Logout</button></div>
        <div class="card-bd">
          <p class="small">Choose only your main business model now. You can choose a specific industry template later inside the dashboard.</p>
          <div id="onboardMsg" class="msg hidden"></div>
          <div class="grid two">
            <div><label>Business Name</label><input id="business_name" placeholder="Example: 2FLYGALLERIA"></div>
            <div><label>Business Model</label><select id="business_model">
              <option value="product_based">Product-Based</option>
              <option value="service_based">Service-Based</option>
              <option value="both">Both Product + Service</option>
            </select></div>
            <div><label>Owner Name</label><input id="owner_name" placeholder="Your name"></div>
            <div><label>Phone Number</label><input id="phone" placeholder="09xxxxxxxxx"></div>
            <div><label>Business Email</label><input id="email" value="${esc(STATE.user?.email || "")}"></div>
            <div><label>Brand Color</label><input id="brand_color" value="#2563EB"></div>
          </div>
          <div style="margin-top:16px"><button class="btn primary" onclick="createWorkspace()">Create workspace</button></div>
        </div>
      </div>
    </div>
  `;
}

async function createWorkspace(){
  setMsg("onboardMsg","Creating workspace…");
  const business_model = document.getElementById("business_model").value;
  const payload = {
    p_business_name: document.getElementById("business_name").value.trim(),
    p_business_model: business_model,
    p_template_key: defaultTemplateKey(business_model),
    p_owner_name: document.getElementById("owner_name").value.trim(),
    p_phone: document.getElementById("phone").value.trim(),
    p_email: document.getElementById("email").value.trim(),
    p_address: null,
    p_logo_url: null,
    p_brand_color: document.getElementById("brand_color").value.trim() || "#2563EB",
    p_gcash_name: null,
    p_gcash_number: null,
  };
  const { error } = await supa.rpc("create_business_workspace", payload);
  if(error) return setMsg("onboardMsg", error.message, "error");
  await refreshSession();
  setHash("/payment");
}

function renderPayment(){
  const b = STATE.business;
  $app.innerHTML = `
    <div class="content" style="max-width:1180px;margin:auto">
      <div class="card">
        <div class="card-hd">
          <div><h3>Account Pending Payment / Approval</h3><p class="small">Pay using any GCash account below, then upload proof for approval.</p></div>
          <button class="btn" onclick="logout()">Logout</button>
        </div>
        <div class="card-bd grid">
          <div class="msg warn">Business: <b>${esc(b?.business_name)}</b><br>Status: <b>${esc(b?.status)}</b></div>
          <div class="payment-cards">${PLATFORM_GCASH_ACCOUNTS.map(a=>`
            <div class="pay-card">
              <span class="badge">${a.label}</span>
              <h4>${a.name}</h4>
              <div class="number">${a.number}</div>
              <img src="${a.qr}" alt="${a.name} QR">
            </div>`).join("")}</div>
          <div class="card" style="box-shadow:none">
            <div class="card-hd"><h3>Submit Payment Proof</h3></div>
            <div class="card-bd">
              <div id="payMsg" class="msg hidden"></div>
              <div class="grid two">
                <div><label>Amount Paid</label><input id="amount" type="number" placeholder="1990"></div>
                <div><label>Reference Number</label><input id="reference_number" placeholder="GCash reference no."></div>
              </div>
              <label style="margin-top:12px">Payment Method</label><select id="payment_method"><option>GCash</option><option>Bank Transfer</option><option>Maya</option></select>
              <label style="margin-top:12px">Upload Proof</label><input id="proof" type="file" accept="image/*,.pdf">
              <label style="margin-top:12px">Notes</label><textarea id="notes" placeholder="Optional notes"></textarea>
              <div class="actions" style="margin-top:14px">
                <button class="btn primary" onclick="submitPlatformPayment()">Submit Payment Proof</button>
                <button class="btn" onclick="refreshAndRoute()">Refresh Status</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

async function submitPlatformPayment(){
  setMsg("payMsg","Uploading proof…");
  const file = document.getElementById("proof").files[0];
  let proof_url = null;
  if(file){
    const path = `${STATE.business.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;
    const up = await supa.storage.from("payment-proofs").upload(path, file, { upsert:false, contentType:file.type });
    if(up.error) return setMsg("payMsg", up.error.message, "error");
    proof_url = supa.storage.from("payment-proofs").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await supa.from("platform_payments").insert({
    business_id: STATE.business.id,
    plan_name: "MVP Access",
    amount: Number(document.getElementById("amount").value || 0),
    payment_method: document.getElementById("payment_method").value,
    reference_number: document.getElementById("reference_number").value.trim(),
    proof_url,
    status: "pending",
    notes: document.getElementById("notes").value.trim(),
  });
  if(error) return setMsg("payMsg", error.message, "error");
  setMsg("payMsg","Payment proof submitted. Wait for super admin approval.", "good");
}

async function refreshAndRoute(){
  await refreshSession();
  if(STATE.business?.status === "active") setHash("/dashboard");
  else renderPayment();
}

function navButton(path,label){ return `<button class="${route()===path?'active':''}" onclick="setHash('${path}')">${label}</button>` }

function renderAppShell(r){
  const b = STATE.business || {};
  const labels = STATE.settings?.labels || {};
  const title = pageTitle(r, labels);
  $app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><div class="logo">B</div><div><h1>${esc(b.business_name || "Business OS")}</h1><p>${esc(b.business_model || "")}</p></div></div>
        <div class="nav">
          ${navButton("/dashboard","Dashboard")}
          ${navButton("/orders", labels.orders || "Orders")}
          ${STATE.settings?.modules?.includes("products") ? navButton("/products", labels.products || "Products") : ""}
          ${STATE.settings?.modules?.includes("services") ? navButton("/services", labels.services || "Services") : ""}
          ${navButton("/inventory", labels.inventory || "Inventory")}
          ${navButton("/expenses","Expenses")}
          ${navButton("/payments","Payments")}
          ${navButton("/invoices","Invoices")}
          ${navButton("/reports","Reports")}
          ${navButton("/team","Team Members")}
          ${navButton("/settings","Settings")}
          ${navButton("/super-admin","Super Admin")}
          <button onclick="logout()">Logout</button>
        </div>
      </aside>
      <main class="main">
        <div class="topbar"><div class="title"><h2>${title}</h2><p>${esc(STATE.user?.email || "")}</p></div><span class="badge good">${esc(b.status || "")}</span></div>
        <div class="content" id="page"></div>
      </main>
    </div>`;
  renderPage(r);
}

function pageTitle(r, labels){
  return ({
    "/dashboard":"Dashboard",
    "/orders":labels.orders || "Orders",
    "/products":labels.products || "Products",
    "/services":labels.services || "Services",
    "/inventory":labels.inventory || "Inventory",
    "/expenses":"Expenses",
    "/payments":"Payments",
    "/invoices":"Invoices",
    "/reports":"Reports",
    "/team":"Team Members",
    "/settings":"Settings",
    "/super-admin":"Super Admin",
  })[r] || "Dashboard";
}

function renderPage(r){
  if(r === "/orders") return renderOrders();
  if(r === "/products") return renderProducts();
  if(r === "/services") return renderServices();
  if(r === "/inventory") return renderInventory();
  if(r === "/expenses") return renderExpenses();
  if(r === "/payments") return renderPayments();
  if(r === "/invoices") return renderInvoices();
  if(r === "/reports") return renderReports();
  if(r === "/team") return renderTeam();
  if(r === "/settings") return renderSettings();
  if(r === "/super-admin") return renderSuperAdmin();
  return renderDashboard();
}

async function renderDashboard(){
  const page = document.getElementById("page");
  page.innerHTML = `<div class="grid four">
    <div class="kpi"><span>Total Sales</span><strong id="kSales">—</strong></div>
    <div class="kpi"><span>Orders</span><strong id="kOrders">—</strong></div>
    <div class="kpi"><span>Expenses</span><strong id="kExpenses">—</strong></div>
    <div class="kpi"><span>Estimated Profit</span><strong id="kProfit">—</strong></div>
  </div><div class="card" style="margin-top:16px"><div class="card-hd"><h3>Current Setup</h3></div><div class="card-bd"><p>Business Model: <b>${esc(STATE.business.business_model)}</b></p><p>Template controls your labels, statuses, and categories. Go to Settings to choose an industry template.</p></div></div>`;
  const bid = STATE.business.id;
  const [{data:orders=[]},{data:expenses=[]}] = await Promise.all([
    supa.from("orders").select("total_amount,total_cost").eq("business_id", bid),
    supa.from("expenses").select("amount").eq("business_id", bid)
  ]);
  const sales = orders.reduce((s,o)=>s+Number(o.total_amount||0),0);
  const cost = orders.reduce((s,o)=>s+Number(o.total_cost||0),0);
  const exp = expenses.reduce((s,o)=>s+Number(o.amount||0),0);
  document.getElementById("kSales").textContent = money(sales);
  document.getElementById("kOrders").textContent = orders.length;
  document.getElementById("kExpenses").textContent = money(exp);
  document.getElementById("kProfit").textContent = money(sales - cost - exp);
}

async function renderOrders(){
  const page=document.getElementById("page");
  const labels = STATE.settings?.labels || {};
  page.innerHTML = `
    <div class="card"><div class="card-hd"><h3>Add ${esc(labels.orders || "Order")}</h3></div><div class="card-bd">
      <div id="orderMsg" class="msg hidden"></div>
      <div class="grid three">
        <div><label>Customer Name</label><input id="customer_name"></div>
        <div><label>Status</label><select id="status">${(STATE.settings?.order_statuses||["pending"]).map(s=>`<option value="${s}">${s}</option>`).join("")}</select></div>
        <div><label>Order Date</label><input type="date" id="order_date" value="${today()}"></div>
        <div><label>Subtotal</label><input type="number" id="subtotal" value="0"></div>
        <div><label>Cost</label><input type="number" id="total_cost" value="0"></div>
        <div><label>${esc(labels.delivery_fee || "Delivery Fee")}</label><input type="number" id="delivery_fee" value="0"></div>
      </div>
      <label style="margin-top:12px">Notes</label><textarea id="notes"></textarea>
      <button class="btn primary" style="margin-top:12px" onclick="saveOrder()">Save Order</button>
    </div></div>
    <div class="card" style="margin-top:16px"><div class="card-hd"><h3>${esc(labels.orders || "Orders")} List</h3><button class="btn" onclick="renderOrders()">Refresh</button></div><div class="card-bd" id="ordersList">Loading…</div></div>`;
  await loadOrdersList();
}

async function saveOrder(){
  setMsg("orderMsg","Saving…");
  const subtotal=Number(document.getElementById("subtotal").value||0);
  const delivery=Number(document.getElementById("delivery_fee").value||0);
  const { error } = await supa.from("orders").insert({
    business_id: STATE.business.id,
    order_number: "ORD-" + Math.random().toString(16).slice(2,8).toUpperCase(),
    customer_name: document.getElementById("customer_name").value.trim(),
    status: document.getElementById("status").value,
    order_date: document.getElementById("order_date").value,
    subtotal,
    delivery_fee: delivery,
    total_amount: subtotal + delivery,
    total_cost: Number(document.getElementById("total_cost").value||0),
    notes: document.getElementById("notes").value.trim(),
    encoded_by: STATE.user.id,
  });
  if(error) return setMsg("orderMsg", error.message, "error");
  setMsg("orderMsg","Order saved.", "good");
  await loadOrdersList();
}

async function loadOrdersList(){
  const {data=[], error} = await supa.from("orders").select("*").eq("business_id", STATE.business.id).order("created_at",{ascending:false}).limit(100);
  const el=document.getElementById("ordersList");
  if(error) return el.innerHTML=`<div class="msg error">${esc(error.message)}</div>`;
  el.innerHTML = table(["Order #","Customer","Status","Date","Total","Cost"], data.map(o=>[o.order_number,o.customer_name, badge(o.status), o.order_date, money(o.total_amount), money(o.total_cost)]));
}

function formPage({type,tableName,nameLabel,priceLabel,costLabel,categoryList=[]}){
  const page=document.getElementById("page");
  page.innerHTML = `
    <div class="card"><div class="card-hd"><h3>Add ${type}</h3></div><div class="card-bd">
      <div id="genericMsg" class="msg hidden"></div>
      <div class="grid three">
        <div><label>${nameLabel}</label><input id="name"></div>
        <div><label>Category</label><input id="category" list="catlist"></div>
        <div><label>${priceLabel}</label><input type="number" id="price" value="0"></div>
        <div><label>${costLabel}</label><input type="number" id="cost" value="0"></div>
        <div><label>Stock / Duration</label><input type="number" id="stock" value="0"></div>
        <div><label>Unit</label><input id="unit" value="pcs"></div>
      </div>
      <datalist id="catlist">${categoryList.map(c=>`<option value="${esc(c)}">`).join("")}</datalist>
      <button class="btn primary" style="margin-top:12px" onclick="saveGeneric('${tableName}')">Save</button>
    </div></div>
    <div class="card" style="margin-top:16px"><div class="card-hd"><h3>${type} List</h3></div><div class="card-bd" id="genericList">Loading…</div></div>`;
  loadGeneric(tableName);
}

async function saveGeneric(tableName){
  const isProduct=tableName==="products";
  const payload = isProduct ? {
    business_id:STATE.business.id, product_name:val("name"), category:val("category"), selling_price:num("price"), cost_price:num("cost"), stock_qty:num("stock"), unit:val("unit")
  } : {
    business_id:STATE.business.id, service_name:val("name"), category:val("category"), service_price:num("price"), estimated_cost:num("cost"), duration_minutes:Number(num("stock")||0)
  };
  const {error}=await supa.from(tableName).insert(payload);
  if(error) return setMsg("genericMsg", error.message, "error");
  setMsg("genericMsg","Saved.", "good"); loadGeneric(tableName);
}
async function loadGeneric(tableName){
  const {data=[], error}=await supa.from(tableName).select("*").eq("business_id",STATE.business.id).order("created_at",{ascending:false});
  const el=document.getElementById("genericList");
  if(error) return el.innerHTML=`<div class="msg error">${esc(error.message)}</div>`;
  if(tableName==="products") el.innerHTML=table(["Name","Category","Price","Cost","Stock"],data.map(x=>[x.product_name,x.category,money(x.selling_price),money(x.cost_price),x.stock_qty]));
  else el.innerHTML=table(["Name","Category","Price","Cost","Duration"],data.map(x=>[x.service_name,x.category,money(x.service_price),money(x.estimated_cost),x.duration_minutes||"—"]));
}
function renderProducts(){ formPage({type:"Product",tableName:"products",nameLabel:"Product Name",priceLabel:"Selling Price",costLabel:"Cost Price",categoryList:STATE.settings?.inventory_categories||[]}); }
function renderServices(){ formPage({type:"Service",tableName:"services",nameLabel:"Service Name",priceLabel:"Service Price",costLabel:"Estimated Cost",categoryList:[]}); }
function renderInventory(){ renderProducts(); }

async function renderExpenses(){
  const page=document.getElementById("page");
  page.innerHTML=`<div class="card"><div class="card-hd"><h3>Add Expense</h3></div><div class="card-bd">
    <div id="expenseMsg" class="msg hidden"></div>
    <div class="grid three"><div><label>Date</label><input type="date" id="expense_date" value="${today()}"></div><div><label>Category</label><select id="category">${(STATE.settings?.expense_categories||["Other"]).map(c=>`<option>${esc(c)}</option>`)}</select></div><div><label>Amount</label><input type="number" id="amount" value="0"></div></div>
    <label style="margin-top:12px">Description</label><textarea id="description"></textarea>
    <button class="btn primary" style="margin-top:12px" onclick="saveExpense()">Save Expense</button>
  </div></div><div class="card" style="margin-top:16px"><div class="card-hd"><h3>Expense List</h3></div><div class="card-bd" id="expenseList">Loading…</div></div>`;
  loadExpenses();
}
async function saveExpense(){
  const {error}=await supa.from("expenses").insert({business_id:STATE.business.id, expense_date:val("expense_date"), category:val("category"), amount:num("amount"), description:val("description"), created_by:STATE.user.id});
  if(error) return setMsg("expenseMsg",error.message,"error");
  setMsg("expenseMsg","Saved.","good"); loadExpenses();
}
async function loadExpenses(){
  const {data=[],error}=await supa.from("expenses").select("*").eq("business_id",STATE.business.id).order("expense_date",{ascending:false}).limit(100);
  const el=document.getElementById("expenseList"); if(error) return el.innerHTML=`<div class="msg error">${esc(error.message)}</div>`;
  el.innerHTML=table(["Date","Category","Description","Amount"],data.map(x=>[x.expense_date,x.category,x.description,money(x.amount)]));
}

function renderPayments(){ document.getElementById("page").innerHTML = placeholder("Payments", "This will track customer payments linked to orders. Platform payment approval is in Super Admin.");}
function renderInvoices(){ document.getElementById("page").innerHTML = placeholder("Invoices", "Invoice generator frontend comes next. Database table is already ready.");}
function renderReports(){ renderDashboard(); }
function renderTeam(){ document.getElementById("page").innerHTML = placeholder("Team Members", "Add staff accounts here later: owner, admin, manager, staff, viewer.");}

async function renderSettings(){
  const page=document.getElementById("page");
  page.innerHTML=`<div class="card"><div class="card-hd"><h3>Business Template</h3></div><div class="card-bd"><p class="small">Choose a template that matches your business model. Product-based shows product templates, service-based shows service templates, both can see all.</p><div id="settingsMsg" class="msg hidden"></div><div id="templateList" class="template-grid">Loading…</div></div></div>`;
  const q = supa.from("business_templates").select("*").eq("is_active",true).order("template_name");
  let res = await q;
  let templates=res.data||[];
  if(STATE.business.business_model !== "both"){
    templates = templates.filter(t => t.business_model === STATE.business.business_model || t.template_key.startsWith("universal_"));
  }
  document.getElementById("templateList").innerHTML = templates.map(t=>`
    <div class="template-card">
      <span class="badge">${esc(t.business_model)}</span>
      <h4>${esc(t.template_name)}</h4>
      <p>${esc(t.description || "")}</p>
      <button class="btn primary" onclick="applyTemplate('${t.template_key}')">Use Template</button>
    </div>`).join("");
}

async function applyTemplate(templateKey){
  setMsg("settingsMsg","Applying template…");
  const {data:t,error:e}=await supa.from("business_templates").select("*").eq("template_key",templateKey).single();
  if(e) return setMsg("settingsMsg",e.message,"error");
  const {error}=await supa.from("business_settings").update({
    modules:t.default_modules, labels:t.default_labels, order_statuses:t.default_order_statuses,
    expense_categories:t.default_expense_categories, inventory_categories:t.default_inventory_categories, payment_methods:t.default_payment_methods
  }).eq("business_id",STATE.business.id);
  if(error) return setMsg("settingsMsg",error.message,"error");
  await refreshSession();
  setMsg("settingsMsg","Template applied.","good");
}

async function renderSuperAdmin(){
  const page=document.getElementById("page");
  page.innerHTML=`<div class="card"><div class="card-hd"><h3>Super Admin</h3><button class="btn" onclick="renderSuperAdmin()">Refresh</button></div><div class="card-bd" id="superList">Loading…</div></div>`;
  const {data=[],error}=await supa.from("businesses").select("*").order("created_at",{ascending:false}).limit(100);
  const el=document.getElementById("superList");
  if(error) return el.innerHTML=`<div class="msg error">If you are not platform owner, this is normal: ${esc(error.message)}</div>`;
  el.innerHTML=table(["Business","Model","Status","Created","Action"], data.map(b=>[
    b.business_name,b.business_model,badge(b.status),new Date(b.created_at).toLocaleString(),
    `<button class="btn good" onclick="approveBusiness('${b.id}')">Approve</button> <button class="btn danger" onclick="suspendBusiness('${b.id}')">Suspend</button>`
  ]));
}
async function approveBusiness(id){ await supa.from("businesses").update({status:"active"}).eq("id",id); renderSuperAdmin(); }
async function suspendBusiness(id){ await supa.from("businesses").update({status:"suspended"}).eq("id",id); renderSuperAdmin(); }

function placeholder(title,desc){ return `<div class="card"><div class="card-hd"><h3>${title}</h3></div><div class="card-bd"><p>${desc}</p><p class="small">This module shell is ready. Full CRUD can be expanded next.</p></div></div>`; }
function val(id){ return document.getElementById(id)?.value?.trim() || ""; }
function num(id){ return Number(document.getElementById(id)?.value || 0); }
function badge(s){ const v=esc(s||"—"); const cls = /paid|active|completed|delivered|claimed/.test(String(s)) ? "good" : /pending|processing|progress|booked|received/.test(String(s)) ? "warn" : /cancel|suspend|failed/.test(String(s)) ? "danger" : ""; return `<span class="badge ${cls}">${v}</span>`;}
function table(headers, rows){
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c ?? ""}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${headers.length}">No records yet.</td></tr>`}</tbody></table></div>`;
}
