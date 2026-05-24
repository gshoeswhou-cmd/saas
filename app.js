/* Business OS Final Static Frontend v1
   Static HTML/CSS/JS + Supabase.
   No React, no npm, no build command.
*/

const SUPABASE_URL = "https://uhrtawnxfnwdikwhwkho.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVocnRhd254Zm53ZGlrd2h3a2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTA3NzEsImV4cCI6MjA5NTE4Njc3MX0.XrqnsHxlQyFxSAfZxRMDc_c7AN968vM_WpjkDMIeUhI";

// Replace the anon key above before publishing.
// This file is intentionally plain JS so it matches your current workflow.

const PLANS = {
  monthly: { key:"monthly", name:"Monthly", amount:199, cycle:"/ month", best:false, desc:"Best for trying the system first." },
  yearly: { key:"yearly", name:"Yearly", amount:499, cycle:"/ year", best:true, desc:"Best value for serious business owners." },
  lifetime: { key:"lifetime", name:"Lifetime", amount:999, cycle:"one-time", best:false, desc:"Best for permanent access with one payment." }
};

const GCASH = [
  { label:"GCash 1", name:"Monaliza V.", number:"0960 597 1283", qr:"./assets/qr-monaliza.jpg" },
  { label:"GCash 2", name:"Lorna Diaz", number:"0912 669 9412", qr:"./assets/qr-lorna.jpg" },
  { label:"GCash 3", name:"Myra V.", number:"0994 983 9551", qr:"./assets/qr-myra.jpg" }
];

const PRODUCT_TEMPLATE_KEYS = ["online_reselling_wholesale","food_business","ukay_thrift_clothing","mini_grocery_sari_sari"];
const SERVICE_TEMPLATE_KEYS = ["beauty_grooming_services","laundry_service","digital_services","packing_fulfillment_service"];
const BOTH_TEMPLATE_KEYS = ["printing_business","pet_products_services"];

let supa = null;
try {
  supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch(e) {
  console.error(e);
}

const state = {
  user: null,
  business: null,
  member: null,
  settings: null,
  templates: [],
  selectedPlan: localStorage.getItem("selected_plan") || "yearly",
  page: "landing"
};

const $app = document.getElementById("app");
const peso = n => "₱" + Number(n||0).toLocaleString("en-PH", { maximumFractionDigits:2 });
const today = () => new Date().toISOString().slice(0,10);
const safe = s => String(s||"").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase() || "business";

function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"), 1800);
}
function setHash(page){ location.hash = page; }
function currentHash(){ return (location.hash || "#landing").replace("#","") || "landing"; }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m])); }

async function init(){
  if(!supa || SUPABASE_ANON_KEY.includes("PASTE_")){
    $app.innerHTML = setupError();
    return;
  }
  const { data } = await supa.auth.getSession();
  state.user = data?.session?.user || null;
  await loadTemplates();
  if(state.user) await loadMyBusiness();
  route();
}
window.addEventListener("hashchange", route);

async function loadTemplates(){
  const { data, error } = await supa.from("business_templates").select("*").eq("is_active", true).order("template_name");
  if(error) console.warn(error);
  state.templates = data || [];
}

async function loadMyBusiness(){
  state.business = null; state.member = null; state.settings = null;
  if(!state.user) return;
  const { data: members, error } = await supa
    .from("business_members")
    .select("*, businesses(*), business_settings(*)")
    .eq("user_id", state.user.id)
    .eq("is_active", true)
    .limit(1);
  if(error) { console.warn(error); return; }
  const row = members?.[0];
  if(row){
    state.member = row;
    state.business = row.businesses;
    if(row.businesses?.id){
      const { data: settings } = await supa.from("business_settings").select("*").eq("business_id", row.businesses.id).single();
      state.settings = settings;
    }
  }
}

function route(){
  state.page = currentHash();
  const publicPages = ["landing","login","signup"];
  if(!state.user && !publicPages.includes(state.page)){
    renderLanding();
    return;
  }
  if(state.user && ["login","signup"].includes(state.page)){
    if(!state.business) return renderOnboarding();
    if(state.business.status === "active") return renderDashboard("home");
    return renderVerification();
  }
  if(state.page === "landing") return renderLanding();
  if(state.page === "login") return renderLogin();
  if(state.page === "signup") return renderSignup();
  if(state.page === "onboarding") return renderOnboarding();
  if(state.page === "checkout") return renderCheckout();
  if(state.page === "verification") return renderVerification();
  if(state.page.startsWith("app/")) return renderDashboard(state.page.split("/")[1] || "home");
  if(state.page === "super-admin") return renderSuperAdmin();
  renderLanding();
}

function setupError(){
  return `<main class="auth-page">
    <div class="auth-card">
      <div class="logo"><span class="logo-mark">B</span>Business OS</div>
      <h1>Setup needed</h1>
      <p class="help">Open <b>app.js</b> and replace <b>PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE</b> with your Supabase anon public key.</p>
    </div>
  </main>`;
}

function landingNav(){
  return `<header class="topnav"><div class="container nav-inner">
    <a class="logo" href="#landing"><span class="logo-mark">B</span><span>Business OS</span></a>
    <nav class="nav-links">
      <a href="#features">Features</a><a href="#templates">Templates</a><a href="#pricing">Pricing</a>
    </nav>
    <div class="nav-actions">
      <a class="btn ghost" href="#login">Login</a>
      <a class="btn primary" href="#pricing">Get Started</a>
    </div>
  </div></header>`;
}

function renderLanding(){
  $app.innerHTML = `${landingNav()}
    <section class="hero">
      <div class="container hero-grid">
        <div>
          <span class="badge">Built for Filipino small business owners</span>
          <h1>Run your business with more control.</h1>
          <p class="lead">Track sales, orders, inventory, expenses, payments, invoices, profit, and business templates in one clean dashboard.</p>
          <div class="hero-cta">
            <a href="#pricing" class="btn primary">Choose a Plan</a>
            <a href="#features" class="btn">See Features</a>
          </div>
          <div class="hero-proof">
            <div class="proof-card"><strong>10</strong><span>business templates</span></div>
            <div class="proof-card"><strong>₱199</strong><span>starting monthly</span></div>
            <div class="proof-card"><strong>All-in-one</strong><span>operations dashboard</span></div>
          </div>
        </div>
        <div class="product-preview">
          <div class="preview-top"><div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div><span class="help">Dashboard Preview</span></div>
          <div class="preview-body">
            <div class="preview-kpis">
              <div class="preview-kpi"><b>₱48,920</b><span>Revenue</span></div>
              <div class="preview-kpi"><b>₱18,420</b><span>Profit</span></div>
              <div class="preview-kpi"><b>146</b><span>Orders</span></div>
            </div>
            <div class="fake-chart"><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>
            <div class="grid grid-2">
              <div class="card pad"><b>Low stock alerts</b><p>Know what to restock before you run out.</p></div>
              <div class="card pad"><b>Profit reports</b><p>See real profit, not just sales.</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section id="features" class="section"><div class="container">
      <div class="section-head"><div><span class="badge">Why buy this system</span><h2 class="h1-small">Stop guessing. Start tracking.</h2></div><p>Business OS is for owners who want a simple but serious way to manage daily operations without messy notes, screenshots, and scattered spreadsheets.</p></div>
      <div class="grid grid-4">
        ${feature("Know real profit","Track sales, costs, expenses, and payments so you know what you actually made.")}
        ${feature("Manage one dashboard","Orders, inventory, invoices, expenses, and reports live in one place.")}
        ${feature("Use business templates","Choose a setup that fits product-based, service-based, or mixed businesses.")}
        ${feature("Prepare for growth","Add staff, monitor performance, and create cleaner business records.")}
      </div>
    </div></section>
    <section id="templates" class="section"><div class="container">
      <div class="section-head"><div><span class="badge">Templates included</span><h2 class="h1-small">Made for different business types.</h2></div><p>Start with a universal setup, then choose a specific business template after your account is active.</p></div>
      <div class="grid grid-2">
        ${templatePreview("Online Reselling / Wholesale","Bulk orders, inventory, payments, and packing status.","Product")}
        ${templatePreview("Food Business","Menu items, ingredients, packaging, and daily sales.","Product")}
        ${templatePreview("Ukay / Thrift Clothing","Drops, item inventory, reservations, and sold items.","Product")}
        ${templatePreview("Printing Business","Print jobs, clients, materials, deadlines, and invoices.","Both")}
        ${templatePreview("Beauty / Grooming","Bookings, services, customer tips, and staff assigned.","Service")}
        ${templatePreview("Laundry Service","Laundry jobs, kilo count, pickup/delivery, and supplies.","Service")}
        ${templatePreview("Digital Services","Projects, clients, invoices, deadlines, and payments.","Service")}
        ${templatePreview("Pet Products / Services","Products, pet services, bookings, and customer records.","Both")}
      </div>
    </div></section>
    <section id="pricing" class="section"><div class="container">
      <div class="section-head"><div><span class="badge">Choose your access</span><h2 class="h1-small">Simple launch pricing.</h2></div><p>All plans include the same core features. Pick the payment option that fits your business.</p></div>
      <div class="grid grid-3 pricing">${Object.values(PLANS).map(priceCard).join("")}</div>
    </div></section>
    <footer class="section"><div class="container"><div class="card pad"><b>Business OS</b><p>Premium black business dashboard for small business owners.</p></div></div></footer>
  `;
}
function feature(title, desc){ return `<div class="card pad"><div class="feature-icon">✓</div><h3>${title}</h3><p>${desc}</p></div>`; }
function templatePreview(title, desc, tag){ return `<div class="card template-card"><div class="feature-icon">•</div><div><b>${title}</b><span>${desc}</span><span class="template-tag">${tag}</span></div></div>`; }
function priceCard(plan){
  return `<div class="price-card ${plan.best?'featured':''}">
    ${plan.best?'<span class="price-badge">Best Value</span>':''}
    <div><h3>${plan.name}</h3><p>${plan.desc}</p></div>
    <div class="price">${peso(plan.amount)} <small>${plan.cycle}</small></div>
    <ul class="ul">
      <li>Sales & order tracking</li><li>Inventory / service management</li><li>Expense tracker</li><li>Invoice generator</li><li>Profit reports</li><li>Business templates</li>
    </ul>
    <button class="btn primary" onclick="choosePlan('${plan.key}')">Choose ${plan.name}</button>
  </div>`;
}
function choosePlan(key){
  state.selectedPlan = key; localStorage.setItem("selected_plan", key);
  if(state.user){
    if(!state.business) setHash("onboarding"); else setHash("checkout");
  } else setHash("signup");
}

function renderLogin(){
  $app.innerHTML = `<main class="auth-page"><div class="auth-card">
    <a class="logo" href="#landing"><span class="logo-mark">B</span>Business OS</a>
    <h1>Login</h1><p class="help">Access your business dashboard.</p>
    <form onsubmit="login(event)">
      <div class="field"><label>Email</label><input id="loginEmail" type="email" required></div>
      <div class="field"><label>Password</label><input id="loginPassword" type="password" required></div>
      <button class="btn primary" style="width:100%">Login</button>
    </form>
    <p class="help" style="margin-top:14px">No account yet? <a href="#signup"><b>Create account</b></a></p>
  </div></main>`;
}
async function login(ev){
  ev.preventDefault();
  const { error } = await supa.auth.signInWithPassword({ email: loginEmail.value, password: loginPassword.value });
  if(error) return toast(error.message);
  const { data } = await supa.auth.getSession(); state.user = data.session.user; await loadMyBusiness();
  if(!state.business) setHash("onboarding"); else if(state.business.status==="active") setHash("app/home"); else setHash("verification");
}

function renderSignup(){
  const plan = PLANS[state.selectedPlan] || PLANS.yearly;
  $app.innerHTML = `<main class="auth-page"><div class="auth-card">
    <a class="logo" href="#landing"><span class="logo-mark">B</span>Business OS</a>
    <span class="badge" style="margin-top:18px">Selected: ${plan.name} — ${peso(plan.amount)}</span>
    <h1>Create account</h1><p class="help">Create your login first, then set up your business.</p>
    <form onsubmit="signup(event)">
      <div class="field"><label>Email</label><input id="signupEmail" type="email" required></div>
      <div class="field"><label>Password</label><input id="signupPassword" type="password" required minlength="6"></div>
      <button class="btn primary" style="width:100%">Create Account</button>
    </form>
    <p class="help" style="margin-top:14px">Already have an account? <a href="#login"><b>Login</b></a></p>
  </div></main>`;
}
async function signup(ev){
  ev.preventDefault();
  const { data, error } = await supa.auth.signUp({ email: signupEmail.value, password: signupPassword.value });
  if(error) return toast(error.message);
  if(data.session?.user){ state.user = data.session.user; setHash("onboarding"); }
  else toast("Account created. Please confirm your email then login.");
}

function renderOnboarding(){
  const plan = PLANS[state.selectedPlan] || PLANS.yearly;
  $app.innerHTML = `<main class="auth-page"><div class="auth-card" style="width:min(760px,100%)">
    <a class="logo" href="#landing"><span class="logo-mark">B</span>Business OS</a>
    <span class="badge" style="margin-top:18px">${plan.name} plan selected — ${peso(plan.amount)}</span>
    <h1>Set up your business</h1>
    <p class="help">Choose only your business model. You can choose the exact industry template later inside the dashboard.</p>
    <form onsubmit="createWorkspace(event)">
      <div class="form-grid">
        <div class="field"><label>Business Name</label><input id="bizName" required placeholder="Example: Ana's Cookies"></div>
        <div class="field"><label>Business Model</label><select id="bizModel" required><option value="product_based">Product-Based</option><option value="service_based">Service-Based</option><option value="both">Both Product + Service</option></select></div>
        <div class="field"><label>Owner Name</label><input id="ownerName" required></div>
        <div class="field"><label>Phone Number</label><input id="phone"></div>
        <div class="field"><label>Business Email</label><input id="bizEmail" type="email" value="${esc(state.user?.email||'')}"></div>
        <div class="field"><label>Brand Color (optional)</label><input id="brandColor" value="#ffffff"></div>
      </div>
      <button class="btn primary" style="width:100%">Continue to Subscription Checkout</button>
    </form>
  </div></main>`;
}
function universalTemplateKey(model){
  if(model==="service_based") return "universal_service_based";
  if(model==="both") return "universal_both";
  return "universal_product_based";
}
async function createWorkspace(ev){
  ev.preventDefault();
  const model = bizModel.value;
  const payload = {
    p_business_name: bizName.value,
    p_business_model: model,
    p_template_key: universalTemplateKey(model),
    p_owner_name: ownerName.value,
    p_phone: phone.value || null,
    p_email: bizEmail.value || state.user.email,
    p_address: null,
    p_logo_url: null,
    p_brand_color: brandColor.value || "#ffffff",
    p_gcash_name: null,
    p_gcash_number: null
  };
  const { data, error } = await supa.rpc("create_business_workspace", payload);
  if(error) return toast(error.message);
  await loadMyBusiness();
  setHash("checkout");
}

function renderCheckout(){
  if(!state.business) return setHash("onboarding");
  const plan = PLANS[state.selectedPlan] || PLANS.yearly;
  $app.innerHTML = `<main class="auth-page" style="display:block"><div class="container" style="padding-top:36px;padding-bottom:36px">
    <div class="selected-plan">
      <div><a class="logo" href="#landing"><span class="logo-mark">B</span>Business OS</a><h2 style="margin:18px 0 0">Subscription Checkout</h2><p class="help">Pay the exact amount below using any GCash account, then upload your proof.</p></div>
      <div style="text-align:right"><span class="badge">${plan.name}</span><div class="price">${peso(plan.amount)}</div></div>
    </div>
    <div class="hr"></div>
    <div class="section-head"><div><span class="badge">Pay with GCash</span><h2 class="h1-small">Choose any account.</h2></div><p>After payment, use your GCash reference number for faster verification.</p></div>
    <div class="pay-accounts">${GCASH.map(a=>`<div class="pay-card"><span class="badge">${a.label}</span><h3>${a.name}</h3><div class="phone">${a.number}</div><img src="${a.qr}" alt="${a.label} QR"></div>`).join("")}</div>
    <div class="hr"></div>
    <div class="card pad" style="max-width:720px;margin:0 auto">
      <h3>Submit proof of payment</h3><p class="help">Amount is fixed based on your selected plan. You do not need to type the amount.</p>
      <form onsubmit="submitPlatformPayment(event)">
        <div class="form-grid">
          <div class="field"><label>Selected Plan</label><input value="${plan.name}" disabled></div>
          <div class="field"><label>Amount Due</label><input value="${peso(plan.amount)}" disabled></div>
          <div class="field"><label>GCash Reference Number</label><input id="payRef" required placeholder="Example: 123456789"></div>
          <div class="field"><label>Proof of Payment</label><input id="payProof" type="file" accept="image/*,application/pdf" required></div>
        </div>
        <div class="field"><label>Notes (optional)</label><textarea id="payNotes" placeholder="Optional message for verification"></textarea></div>
        <button class="btn primary" style="width:100%">Submit for Verification</button>
      </form>
    </div>
  </div></main>`;
}
async function submitPlatformPayment(ev){
  ev.preventDefault();
  const plan = PLANS[state.selectedPlan] || PLANS.yearly;
  const file = payProof.files[0];
  let proofUrl = null;
  if(file){
    const ext = file.name.split(".").pop();
    const path = `platform-payments/${state.business.id}/${Date.now()}-${safe(file.name)}.${ext}`;
    const up = await supa.storage.from("payment-proofs").upload(path, file, { upsert:false, contentType:file.type || "image/jpeg" });
    if(up.error) return toast(up.error.message);
    proofUrl = supa.storage.from("payment-proofs").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await supa.from("platform_payments").insert({
    business_id: state.business.id,
    plan_name: plan.name,
    amount: plan.amount,
    payment_method: "GCash",
    reference_number: payRef.value,
    proof_url: proofUrl,
    status: "submitted",
    notes: payNotes.value || null
  });
  if(error) return toast(error.message);
  const upd = await supa.from("businesses").update({ status:"under_verification", updated_at:new Date().toISOString() }).eq("id", state.business.id);
  if(upd.error) return toast(upd.error.message);
  await loadMyBusiness();
  setHash("verification");
}

function renderVerification(){
  const b = state.business;
  if(!b) return setHash("onboarding");
  if(b.status === "active") return renderDashboard("home");
  const statusText = b.status === "under_verification" ? "Payment Under Verification" : "Pending Payment";
  const icon = b.status === "under_verification" ? "⏳" : "₱";
  $app.innerHTML = `<main class="auth-page"><div class="verify-box">
    <div class="big-icon">${icon}</div>
    <h1 class="h1-small">${statusText}</h1>
    <p class="help">${b.status === "under_verification" ? "We received your proof of payment. Your account is being reviewed by our team." : "Choose your plan and submit payment proof to unlock your dashboard."}</p>
    <div class="hr"></div>
    <div class="grid grid-3">
      <div class="kpi"><div class="lbl">Business</div><div class="num" style="font-size:18px">${esc(b.business_name)}</div></div>
      <div class="kpi"><div class="lbl">Status</div><span class="status ${b.status}">${esc(b.status)}</span></div>
      <div class="kpi"><div class="lbl">Selected Plan</div><div class="num" style="font-size:18px">${esc(PLANS[state.selectedPlan]?.name || "Yearly")}</div></div>
    </div>
    <div class="hero-cta" style="justify-content:center">
      ${b.status === "pending_payment" ? '<a class="btn primary" href="#checkout">Go to Checkout</a>' : ''}
      <button class="btn" onclick="refreshMe()">Refresh Status</button>
      <button class="btn ghost" onclick="logout()">Logout</button>
    </div>
  </div></main>`;
}
async function refreshMe(){ await loadMyBusiness(); route(); toast("Status refreshed"); }
async function logout(){ await supa.auth.signOut(); state.user=null; state.business=null; localStorage.removeItem("selected_plan"); setHash("landing"); }

// DASHBOARD
function sidebar(active){
  const business = state.business || {};
  const model = business.business_model || "product_based";
  const productLinks = [
    ["home","Dashboard"],["orders","Orders / Jobs"],["products","Products"],["inventory","Inventory"],["expenses","Expenses"],["payments","Payments"],["invoices","Invoices"],["reports","Reports"],["team","Team"],["settings","Settings"]
  ];
  const serviceLinks = [
    ["home","Dashboard"],["orders","Jobs / Bookings"],["services","Services"],["expenses","Expenses"],["payments","Payments"],["invoices","Invoices"],["reports","Reports"],["team","Team"],["settings","Settings"]
  ];
  const bothLinks = [
    ["home","Dashboard"],["orders","Orders / Jobs"],["products","Products"],["services","Services"],["inventory","Inventory"],["expenses","Expenses"],["payments","Payments"],["invoices","Invoices"],["reports","Reports"],["team","Team"],["settings","Settings"]
  ];
  const links = model === "service_based" ? serviceLinks : model === "both" ? bothLinks : productLinks;
  return `<aside class="sidebar">
    <div class="side-logo"><span class="logo-mark">B</span><div><div>Business OS</div><small class="help">${esc(business.business_name||"Workspace")}</small></div></div>
    <div class="badge">${esc(model.replace("_"," "))}</div>
    <nav class="side-nav">${links.map(([key,label])=>`<a class="side-link ${active===key?'active':''}" href="#app/${key}">${label}</a>`).join("")}</nav>
    <div class="hr"></div>
    <a class="side-link" href="#super-admin">Super Admin</a>
    <button class="side-link" onclick="logout()" style="width:100%;text-align:left">Logout</button>
  </aside>`;
}
function dashboardLayout(active, inner){
  $app.innerHTML = `<div class="app-shell">${sidebar(active)}<main class="main">
    <header class="topbar"><div><b>${esc(state.business?.business_name||"Dashboard")}</b><p class="help">Status: <span class="status ${state.business?.status}">${esc(state.business?.status)}</span></p></div><button class="btn" onclick="refreshMe()">Refresh</button></header>
    <div class="content">${inner}</div></main></div>`;
}
async function renderDashboard(page){
  if(!state.business) return setHash("onboarding");
  if(state.business.status !== "active") return renderVerification();
  if(page==="home") return renderHome();
  if(page==="orders") return renderSimpleModule("orders");
  if(page==="products") return renderSimpleModule("products");
  if(page==="services") return renderSimpleModule("services");
  if(page==="inventory") return renderInventory();
  if(page==="expenses") return renderSimpleModule("expenses");
  if(page==="payments") return renderSimpleModule("payments");
  if(page==="invoices") return renderInvoices();
  if(page==="reports") return renderReports();
  if(page==="team") return renderTeam();
  if(page==="settings") return renderSettings();
  renderHome();
}
async function countTable(table){
  const { count } = await supa.from(table).select("*", { count:"exact", head:true }).eq("business_id", state.business.id);
  return count || 0;
}
async function renderHome(){
  const counts = {};
  for(const t of ["orders","products","services","expenses","payments","invoices"]) counts[t]= await countTable(t);
  dashboardLayout("home", `<div class="section-head"><div><h1 class="h1-small">Dashboard</h1><p class="help">Your business overview.</p></div></div>
    <div class="kpis">
      <div class="kpi"><div class="lbl">Orders / Jobs</div><div class="num">${counts.orders}</div></div>
      <div class="kpi"><div class="lbl">Products</div><div class="num">${counts.products}</div></div>
      <div class="kpi"><div class="lbl">Expenses</div><div class="num">${counts.expenses}</div></div>
      <div class="kpi"><div class="lbl">Invoices</div><div class="num">${counts.invoices}</div></div>
    </div>
    <div class="grid grid-2">
      <div class="card pad"><h3>Choose your business template</h3><p>Go to Settings and choose the template that matches your business model.</p><div class="hero-cta"><a class="btn primary" href="#app/settings">Open Settings</a></div></div>
      <div class="card pad"><h3>Start tracking</h3><p>Add your first order, product, expense, or invoice to start seeing business records.</p><div class="hero-cta"><a class="btn" href="#app/orders">Add Order</a></div></div>
    </div>`);
}

const moduleConfig = {
  orders:{ title:"Orders / Jobs", table:"orders", fields:[
    ["order_number","Order #","text"],["customer_name","Customer","text"],["status","Status","text"],["total_amount","Total","number"],["total_cost","Cost","number"],["notes","Notes","textarea"]
  ], list:["order_number","customer_name","status","total_amount"] },
  products:{ title:"Products", table:"products", fields:[
    ["product_name","Product Name","text"],["sku","SKU","text"],["category","Category","text"],["selling_price","Selling Price","number"],["cost_price","Cost Price","number"],["stock_qty","Stock Qty","number"],["low_stock_alert","Low Stock Alert","number"],["unit","Unit","text"]
  ], list:["product_name","category","selling_price","stock_qty"] },
  services:{ title:"Services", table:"services", fields:[
    ["service_name","Service Name","text"],["category","Category","text"],["service_price","Service Price","number"],["estimated_cost","Estimated Cost","number"],["duration_minutes","Duration Minutes","number"]
  ], list:["service_name","category","service_price","estimated_cost"] },
  expenses:{ title:"Expenses", table:"expenses", fields:[
    ["expense_date","Date","date"],["category","Category","text"],["description","Description","text"],["amount","Amount","number"],["payment_method","Payment Method","text"],["supplier","Supplier","text"]
  ], list:["expense_date","category","description","amount"] },
  payments:{ title:"Payments", table:"payments", fields:[
    ["payment_date","Date","date"],["amount","Amount","number"],["payment_method","Payment Method","text"],["reference_number","Reference Number","text"],["notes","Notes","textarea"]
  ], list:["payment_date","amount","payment_method","reference_number"] },
};
async function renderSimpleModule(key){
  const cfg = moduleConfig[key];
  const { data, error } = await supa.from(cfg.table).select("*").eq("business_id", state.business.id).order("created_at", { ascending:false }).limit(50);
  if(error) console.warn(error);
  dashboardLayout(key, `<div class="section-head"><div><h1 class="h1-small">${cfg.title}</h1><p class="help">Add and view records for this business only.</p></div></div>
    <div class="grid grid-2">
      <div class="card pad"><h3>Add ${cfg.title}</h3>${renderForm(cfg, key)}</div>
      <div class="card"><div class="table-wrap">${renderTable(data||[], cfg.list)}</div></div>
    </div>`);
}
function renderForm(cfg, key){
  return `<form onsubmit="saveModule(event,'${key}')"><div class="form-grid">${cfg.fields.map(([name,label,type])=>`<div class="field"><label>${label}</label>${type==="textarea"?`<textarea id="${name}"></textarea>`:`<input id="${name}" type="${type}" ${type==="date"?`value="${today()}"`:''}>`}</div>`).join("")}</div><button class="btn primary" style="width:100%">Save</button></form>`;
}
async function saveModule(ev, key){
  ev.preventDefault();
  const cfg = moduleConfig[key];
  const payload = { business_id: state.business.id };
  for(const [name,,type] of cfg.fields){
    const el = document.getElementById(name);
    let val = el?.value || null;
    if(type==="number") val = Number(val||0);
    payload[name] = val;
  }
  if(key==="orders" && !payload.order_number) payload.order_number = "ORD-" + Date.now().toString().slice(-6);
  const { error } = await supa.from(cfg.table).insert(payload);
  if(error) return toast(error.message);
  toast("Saved");
  renderDashboard(key);
}
function renderTable(rows, cols){
  if(!rows.length) return `<div class="empty">No records yet.</div>`;
  return `<table><thead><tr>${cols.map(c=>`<th>${c.replaceAll("_"," ")}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c.includes("amount")||c.includes("price")||c.includes("cost")||c==="total_amount"?peso(r[c]):esc(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
async function renderInventory(){
  return renderSimpleModule("products");
}
async function renderInvoices(){
  const { data } = await supa.from("invoices").select("*").eq("business_id", state.business.id).order("created_at", { ascending:false });
  dashboardLayout("invoices", `<div class="section-head"><div><h1 class="h1-small">Invoices</h1><p class="help">Create basic invoices for customers.</p></div></div>
    <div class="grid grid-2"><div class="card pad"><h3>Create Invoice</h3>
    <form onsubmit="saveInvoice(event)"><div class="form-grid">
      <div class="field"><label>Invoice #</label><input id="invoice_number" placeholder="INV-${Date.now().toString().slice(-5)}"></div>
      <div class="field"><label>Customer</label><input id="invoice_customer"></div>
      <div class="field"><label>Total Amount</label><input id="invoice_total" type="number"></div>
      <div class="field"><label>Status</label><select id="invoice_status"><option>draft</option><option>sent</option><option>paid</option></select></div>
    </div><div class="field"><label>Notes</label><textarea id="invoice_notes"></textarea></div><button class="btn primary" style="width:100%">Save Invoice</button></form></div>
    <div class="card"><div class="table-wrap">${renderTable(data||[],["invoice_number","customer_name","total_amount","status"])}</div></div></div>`);
}
async function saveInvoice(ev){
  ev.preventDefault();
  const { error } = await supa.from("invoices").insert({
    business_id: state.business.id,
    invoice_number: invoice_number.value || ("INV-"+Date.now().toString().slice(-6)),
    customer_name: invoice_customer.value,
    invoice_date: today(),
    subtotal: Number(invoice_total.value||0),
    total_amount: Number(invoice_total.value||0),
    status: invoice_status.value,
    notes: invoice_notes.value
  });
  if(error) return toast(error.message);
  toast("Invoice saved"); renderInvoices();
}
async function renderReports(){
  const [orders, expenses, payments] = await Promise.all([
    supa.from("orders").select("total_amount,total_cost").eq("business_id", state.business.id),
    supa.from("expenses").select("amount").eq("business_id", state.business.id),
    supa.from("payments").select("amount").eq("business_id", state.business.id)
  ]);
  const revenue = (orders.data||[]).reduce((a,b)=>a+Number(b.total_amount||0),0);
  const cost = (orders.data||[]).reduce((a,b)=>a+Number(b.total_cost||0),0);
  const exp = (expenses.data||[]).reduce((a,b)=>a+Number(b.amount||0),0);
  const paid = (payments.data||[]).reduce((a,b)=>a+Number(b.amount||0),0);
  const profit = revenue - cost - exp;
  dashboardLayout("reports", `<div class="section-head"><div><h1 class="h1-small">Reports / Profit & Loss</h1><p class="help">Simple business performance summary.</p></div></div>
    <div class="kpis"><div class="kpi"><div class="lbl">Revenue</div><div class="num">${peso(revenue)}</div></div><div class="kpi"><div class="lbl">Cost</div><div class="num">${peso(cost)}</div></div><div class="kpi"><div class="lbl">Expenses</div><div class="num">${peso(exp)}</div></div><div class="kpi"><div class="lbl">Estimated Profit</div><div class="num">${peso(profit)}</div></div></div>
    <div class="card pad"><h3>Payment Recorded</h3><p class="price">${peso(paid)}</p></div>`);
}
async function renderTeam(){
  const { data } = await supa.from("business_members").select("*").eq("business_id", state.business.id).order("created_at", { ascending:false });
  dashboardLayout("team", `<div class="section-head"><div><h1 class="h1-small">Team Members</h1><p class="help">Track staff names and roles.</p></div></div>
    <div class="grid grid-2"><div class="card pad"><h3>Add Staff</h3><form onsubmit="addMember(event)"><div class="form-grid"><div class="field"><label>Name</label><input id="mName" required></div><div class="field"><label>Email</label><input id="mEmail" type="email" required></div><div class="field"><label>Role</label><select id="mRole"><option>staff</option><option>manager</option><option>admin</option><option>viewer</option></select></div></div><button class="btn primary" style="width:100%">Add Staff</button></form></div>
    <div class="card"><div class="table-wrap">${renderTable(data||[],["name","email","role","is_active"])}</div></div></div>`);
}
async function addMember(ev){
  ev.preventDefault();
  const { error } = await supa.from("business_members").insert({ business_id: state.business.id, name:mName.value, email:mEmail.value, role:mRole.value, is_active:true });
  if(error) return toast(error.message);
  toast("Staff added"); renderTeam();
}
function allowedTemplatesForBusiness(){
  const model = state.business?.business_model;
  if(model === "product_based") return state.templates.filter(t=>t.business_model === "product_based" && PRODUCT_TEMPLATE_KEYS.includes(t.template_key));
  if(model === "service_based") return state.templates.filter(t=>t.business_model === "service_based" && SERVICE_TEMPLATE_KEYS.includes(t.template_key));
  return state.templates.filter(t=>PRODUCT_TEMPLATE_KEYS.includes(t.template_key) || SERVICE_TEMPLATE_KEYS.includes(t.template_key) || BOTH_TEMPLATE_KEYS.includes(t.template_key));
}
async function renderSettings(){
  const templates = allowedTemplatesForBusiness();
  dashboardLayout("settings", `<div class="section-head"><div><h1 class="h1-small">Settings</h1><p class="help">Choose your business template and update workspace settings.</p></div></div>
    <div class="grid grid-2">
      <div class="card pad"><h3>Business Profile</h3><p class="help">Business Name</p><h2>${esc(state.business.business_name)}</h2><p class="help">Business Model: ${esc(state.business.business_model)}</p></div>
      <div class="card pad"><h3>Template Selector</h3><p class="help">Only templates related to your chosen business model are shown.</p>
        <div class="grid">${templates.map(t=>`<button class="btn" onclick="applyTemplate('${t.template_key}')">${esc(t.template_name)} <span class="status">${esc(t.business_model)}</span></button>`).join("")}</div>
      </div>
    </div>`);
}
async function applyTemplate(key){
  const t = state.templates.find(x=>x.template_key === key);
  if(!t) return toast("Template not found");
  const { error: e1 } = await supa.from("business_settings").update({
    modules:t.default_modules, labels:t.default_labels, order_statuses:t.default_order_statuses,
    expense_categories:t.default_expense_categories, inventory_categories:t.default_inventory_categories,
    payment_methods:t.default_payment_methods, updated_at:new Date().toISOString()
  }).eq("business_id", state.business.id);
  if(e1) return toast(e1.message);
  const { error: e2 } = await supa.from("businesses").update({ template_id:t.id, updated_at:new Date().toISOString() }).eq("id", state.business.id);
  if(e2) return toast(e2.message);
  await loadMyBusiness();
  toast("Template applied");
  renderSettings();
}

// SUPER ADMIN
async function isPlatformOwner(){
  if(!state.user) return false;
  const { data } = await supa.from("business_members").select("*").eq("user_id",state.user.id).eq("role","platform_owner").eq("is_active",true).limit(1);
  return !!data?.length;
}
async function renderSuperAdmin(){
  if(!state.user) return setHash("login");
  const ok = await isPlatformOwner();
  if(!ok) return dashboardLayout("super-admin", `<div class="card pad"><h1>Super Admin locked</h1><p class="help">Your account is not platform_owner yet.</p></div>`);
  const [biz, pays] = await Promise.all([
    supa.from("businesses").select("*").order("created_at",{ascending:false}),
    supa.from("platform_payments").select("*").order("created_at",{ascending:false})
  ]);
  $app.innerHTML = `<div class="app-shell">${sidebar("super-admin")}<main class="main"><header class="topbar"><div><b>Super Admin</b><p class="help">Approve payments and export backups.</p></div><button class="btn" onclick="logout()">Logout</button></header><div class="content">
    <div class="section-head"><div><h1 class="h1-small">Platform Control</h1><p class="help">Only you should see this page.</p></div></div>
    <div class="grid grid-2">
      <div class="card pad"><h3>Pending / Under Verification Businesses</h3><div class="table-wrap">${renderBusinessAdminTable(biz.data||[])}</div></div>
      <div class="card pad"><h3>Owner Backup Center</h3><p class="help">Download customer data backups manually. Daily automatic backup will be a backend Edge Function later.</p><div class="hero-cta"><button class="btn primary" onclick="downloadFullBackup()">Download Full Platform Backup</button><button class="btn" onclick="downloadCSVBackup('businesses')">Export Businesses CSV</button><button class="btn" onclick="downloadCSVBackup('orders')">Export Orders CSV</button></div></div>
    </div>
    <div class="card pad" style="margin-top:14px"><h3>Platform Payments</h3><div class="table-wrap">${renderTable(pays.data||[],["plan_name","amount","status","reference_number","created_at"])}</div></div>
  </div></main></div>`;
}
function renderBusinessAdminTable(rows){
  if(!rows.length) return `<div class="empty">No businesses yet.</div>`;
  return `<table><thead><tr><th>Business</th><th>Status</th><th>Model</th><th>Action</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.business_name)}</td><td><span class="status ${r.status}">${esc(r.status)}</span></td><td>${esc(r.business_model)}</td><td><button class="btn good" onclick="approveBusiness('${r.id}')">Approve</button> <button class="btn danger" onclick="suspendBusiness('${r.id}')">Suspend</button></td></tr>`).join("")}</tbody></table>`;
}
async function approveBusiness(id){
  const { error } = await supa.from("businesses").update({ status:"active", updated_at:new Date().toISOString() }).eq("id",id);
  if(error) return toast(error.message);
  await supa.from("platform_payments").update({ status:"approved", approved_at:new Date().toISOString(), approved_by:state.user.id }).eq("business_id",id).eq("status","submitted");
  toast("Business approved"); renderSuperAdmin();
}
async function suspendBusiness(id){
  const { error } = await supa.from("businesses").update({ status:"suspended", updated_at:new Date().toISOString() }).eq("id",id);
  if(error) return toast(error.message);
  toast("Business suspended"); renderSuperAdmin();
}

// BACKUPS
async function fetchAll(table){
  let all=[], from=0, size=1000;
  while(true){
    const { data, error } = await supa.from(table).select("*").range(from, from+size-1);
    if(error) throw error;
    all = all.concat(data||[]);
    if(!data || data.length < size) break;
    from += size;
  }
  return all;
}
async function downloadFullBackup(){
  try{
    const tables = ["businesses","business_members","business_settings","products","services","orders","order_items","inventory_movements","expenses","payments","invoices","revenue_goals","platform_payments"];
    const backup = { exported_at:new Date().toISOString(), tables:{} };
    for(const t of tables) backup.tables[t] = await fetchAll(t);
    downloadFile(`full-platform-backup-${today()}.json`, JSON.stringify(backup,null,2), "application/json");
  }catch(e){ toast(e.message); }
}
async function downloadCSVBackup(table){
  try{
    const rows = await fetchAll(table);
    const csv = toCSV(rows);
    downloadFile(`${table}-backup-${today()}.csv`, csv, "text/csv");
  }catch(e){ toast(e.message); }
}
function toCSV(rows){
  if(!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map(r=>headers.map(h=>csvVal(r[h])).join(","))].join("\n");
}
function csvVal(v){
  const s = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
}
function downloadFile(filename, content, type){
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

init();
