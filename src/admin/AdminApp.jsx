import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import * as api from "../api";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg: "#0f0a05",
  surface: "#1a1008",
  card: "#231508",
  border: "#3a2010",
  borderLight: "#4a3020",
  gold: "#f5c842",
  orange: "#c1440e",
  text: "#f0e0c0",
  muted: "#8a6a40",
  success: "#4caf6a",
  danger: "#e05050",
  info: "#5090e0",
  warning: "#e0a030",
};

const font = "'Crimson Text', serif";

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useAuth() {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sa_admin")); } catch { return null; }
  });
  const navigate = useNavigate();

  const login = async (email, password) => {
    const res = await api.adminLogin({ email, password });
    localStorage.setItem("sa_admin_token", res.token);
    localStorage.setItem("sa_admin", JSON.stringify(res.admin));
    setAdmin(res.admin);
    navigate("/admin");
  };

  const logout = () => {
    localStorage.removeItem("sa_admin_token");
    localStorage.removeItem("sa_admin");
    setAdmin(null);
    navigate("/admin/login");
  };

  return { admin, login, logout };
}

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return { toasts, show };
}

function ToastContainer({ toasts }) {
  const colors = { success: C.success, danger: C.danger, info: C.info, warning: C.warning };
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: colors[t.type] || C.success, color: "#fff",
          padding: "12px 20px", borderRadius: 10, fontSize: 14,
          fontFamily: font, boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          maxWidth: 320, animation: "slideIn 0.3s ease",
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Btn({ children, onClick, variant = "primary", size = "md", disabled, style = {} }) {
  const bg = { primary: `linear-gradient(135deg, ${C.orange}, ${C.gold})`, ghost: "transparent", danger: C.danger, success: C.success };
  const pad = { sm: "6px 14px", md: "10px 20px", lg: "14px 28px" };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: pad[size], borderRadius: 8,
      background: bg[variant] || bg.primary,
      border: variant === "ghost" ? `1px solid ${C.border}` : "none",
      color: variant === "ghost" ? C.text : "#fff",
      fontFamily: font, fontSize: size === "sm" ? 13 : 15,
      cursor: disabled ? "not-allowed", opacity: disabled ? 0.6 : 1,
      fontWeight: 600, whiteSpace: "nowrap",
      transition: "opacity 0.15s", ...style,
    }}>{children}</button>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: 24, ...style,
    }}>{children}</div>
  );
}

function Badge({ children, color = C.muted }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      background: color + "22", border: `1px solid ${color}44`,
      color, fontSize: 12, fontFamily: font, fontWeight: 600,
    }}>{children}</span>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, required, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ color: C.muted, fontSize: 13, fontFamily: font }}>{label}{required && " *"}</label>}
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} required={required}
        style={{
          padding: "10px 14px", background: C.surface,
          border: `1px solid ${C.border}`, borderRadius: 8,
          color: C.text, fontFamily: font, fontSize: 15, outline: "none",
          ...style,
        }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ color: C.muted, fontSize: 13, fontFamily: font }}>{label}</label>}
      <select value={value} onChange={onChange} style={{
        padding: "10px 14px", background: C.surface,
        border: `1px solid ${C.border}`, borderRadius: 8,
        color: C.text, fontFamily: font, fontSize: 15, outline: "none", ...style,
      }}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 3, placeholder, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ color: C.muted, fontSize: 13, fontFamily: font }}>{label}</label>}
      <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} style={{
        padding: "10px 14px", background: C.surface,
        border: `1px solid ${C.border}`, borderRadius: 8,
        color: C.text, fontFamily: font, fontSize: 15, outline: "none",
        resize: "vertical", ...style,
      }} />
    </div>
  );
}

// ─── SIDEBAR NAV ──────────────────────────────────────────────────────────────
const NAV = [
  { path: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { path: "/admin/products", label: "Products", icon: "📦" },
  { path: "/admin/orders", label: "Orders", icon: "🛒" },
  { path: "/admin/banners", label: "Banners & Content", icon: "🖼️" },
  { path: "/admin/settings", label: "Site Settings", icon: "⚙️" },
  { path: "/admin/integrations", label: "Integrations", icon: "🔗" },
  { path: "/admin/admins", label: "Admin Users", icon: "👤" },
];

function Sidebar({ admin, logout }) {
  const location = useLocation();
  const isActive = (path, exact) => exact ? location.pathname === path : location.pathname.startsWith(path);
  const navigate = useNavigate();

  return (
    <div style={{
      width: 240, background: C.surface, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 28 }}>🕉</div>
          <div>
            <div style={{ color: C.gold, fontSize: 18, fontFamily: "'Yatra One', cursive", letterSpacing: 0.5 }}>Shri Aaum</div>
            <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2 }}>ADMIN PANEL</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(n => (
          <button key={n.path} onClick={() => navigate(n.path)} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 8, border: "none",
            background: isActive(n.path, n.exact) ? `${C.orange}22` : "transparent",
            borderLeft: isActive(n.path, n.exact) ? `3px solid ${C.orange}` : "3px solid transparent",
            color: isActive(n.path, n.exact) ? C.text : C.muted,
            fontFamily: font, fontSize: 15, cursor: "pointer", textAlign: "left",
            fontWeight: isActive(n.path, n.exact) ? 600 : 400,
          }}>
            <span>{n.icon}</span><span>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Admin info */}
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{admin?.name}</div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>{admin?.role}</div>
        <button onClick={logout} style={{
          width: "100%", padding: "8px", background: "transparent",
          border: `1px solid ${C.border}`, borderRadius: 6,
          color: C.muted, fontFamily: font, fontSize: 13, cursor: "pointer",
        }}>Sign Out</button>
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try { await onLogin(email, pass); }
    catch (err) { setError(err.message || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: font,
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: 48, width: 400,
      }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🕉</div>
          <div style={{ fontFamily: "'Yatra One', cursive", color: C.gold, fontSize: 28 }}>Shri Aaum</div>
          <div style={{ color: C.muted, fontSize: 14, letterSpacing: 2 }}>ADMIN LOGIN</div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="admin@shriaaum.com" required />
          <Input label="Password" value={pass} onChange={e => setPass(e.target.value)} type="password" placeholder="••••••••" required />
          {error && <div style={{ color: C.danger, fontSize: 14, background: C.danger + "15", padding: "8px 12px", borderRadius: 6 }}>{error}</div>}
          <Btn disabled={loading} style={{ width: "100%", padding: "14px", marginTop: 8 }}>
            {loading ? "Signing in..." : "Sign In →"}
          </Btn>
        </form>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getOrderStats().then(r => setStats(r.stats)).catch(() => {});
  }, []);

  const statCards = stats ? [
    { label: "Total Orders", value: stats.total, icon: "📦", color: C.info },
    { label: "Today's Orders", value: stats.today, icon: "🗓️", color: C.gold },
    { label: "Paid Orders", value: stats.paid, icon: "✅", color: C.success },
    { label: "Pending", value: stats.pending, icon: "⏳", color: C.warning },
    { label: "Shipped", value: stats.shipped, icon: "🚚", color: C.info },
    { label: "Total Revenue", value: `₹${(stats.totalRevenue || 0).toLocaleString("en-IN")}`, icon: "💰", color: C.gold },
  ] : [];

  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats === null && [...Array(6)].map((_, i) => (
          <Card key={i} style={{ height: 100, background: C.surface }} />
        ))}
        {statCards.map(s => (
          <Card key={s.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 32 }}>{s.icon}</div>
            <div>
              <div style={{ color: s.color, fontSize: 24, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly revenue chart */}
      {stats?.weeklyOrders?.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Last 7 Days Revenue</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
            {stats.weeklyOrders.map(d => {
              const maxRev = Math.max(...stats.weeklyOrders.map(x => x.revenue));
              const h = maxRev > 0 ? (d.revenue / maxRev) * 100 : 10;
              return (
                <div key={d._id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ color: C.muted, fontSize: 10 }}>₹{(d.revenue / 1000).toFixed(1)}k</div>
                  <div style={{
                    width: "100%", height: `${h}%`, minHeight: 8,
                    background: `linear-gradient(to top, ${C.orange}, ${C.gold})`,
                    borderRadius: "4px 4px 0 0",
                  }} />
                  <div style={{ color: C.muted, fontSize: 10 }}>{d._id.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <div style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Quick Actions</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/admin/products" style={{ textDecoration: "none" }}><Btn variant="ghost">+ Add Product</Btn></a>
          <a href="/admin/orders" style={{ textDecoration: "none" }}><Btn variant="ghost">📦 View Orders</Btn></a>
          <a href="/admin/banners" style={{ textDecoration: "none" }}><Btn variant="ghost">🖼️ Edit Banners</Btn></a>
          <a href="/admin/settings" style={{ textDecoration: "none" }}><Btn variant="ghost">⚙️ Settings</Btn></a>
        </div>
      </Card>
    </div>
  );
}

// ─── PRODUCTS MANAGER ─────────────────────────────────────────────────────────
const BLANK_PRODUCT = {
  name: "", category: "rudraksha", series: "", price: 0, originalPrice: 0,
  logisticsCost: 100, discoveryFee: 0, gstPercent: 18, stock: 0,
  material: "", description: "", image: "🕉️", badge: "", tags: "",
  isPopular: false, isRecommended: false, isFeatured: false, isEnergized: false,
  isActive: true, templeOrigin: "", weight: 500,
};

function ProductsManager({ toast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_PRODUCT);
  const [pricingId, setPricingId] = useState(null);
  const [priceForm, setPriceForm] = useState({});
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminProducts();
      setProducts(res.products);
    } catch (e) { toast("Failed to load products", "danger"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (p) => {
    setEditing(p._id);
    setForm({ ...p, tags: Array.isArray(p.tags) ? p.tags.join(", ") : p.tags });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(BLANK_PRODUCT);
    setShowForm(true);
  };

  const save = async () => {
    const data = { ...form, tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [] };
    try {
      if (editing) await api.updateProduct(editing, data);
      else await api.createProduct(data);
      toast(editing ? "Product updated" : "Product created");
      setShowForm(false);
      load();
    } catch (e) { toast(e.message || "Save failed", "danger"); }
  };

  const del = async (id) => {
    if (!confirm("Delete this product?")) return;
    await api.deleteProduct(id);
    toast("Product deleted");
    load();
  };

  const toggle = async (id) => {
    await api.toggleProduct(id);
    load();
  };

  const openPricing = (p) => {
    setPricingId(p._id);
    setPriceForm({ price: p.price, originalPrice: p.originalPrice, logisticsCost: p.logisticsCost, discoveryFee: p.discoveryFee, gstPercent: p.gstPercent });
  };

  const savePricing = async () => {
    await api.updatePricing(pricingId, priceForm);
    toast("Pricing updated");
    setPricingId(null);
    load();
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const pf = (k) => (e) => setPriceForm(prev => ({ ...prev, [k]: Number(e.target.value) }));

  const statusColor = { true: C.success, false: C.muted };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 700 }}>Products ({products.length})</h1>
        <Btn onClick={openNew}>+ New Product</Btn>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search products..."
          style={{ padding: "10px 16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: font, fontSize: 15, width: 300 }} />
      </div>

      {loading ? <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
            <thead>
              <tr style={{ background: C.surface }}>
                {["Product", "Category", "Price", "Stock", "Flags", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.muted, fontSize: 13, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p._id} style={{ borderBottom: `1px solid ${C.border}`, opacity: p.isActive ? 1 : 0.5 }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{p.image}</span>
                      <div>
                        <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{p.series || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: C.muted, fontSize: 13 }}>{p.category}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ color: C.gold, fontWeight: 700 }}>₹{p.price.toLocaleString("en-IN")}</div>
                    {p.originalPrice > p.price && <div style={{ color: C.muted, fontSize: 12, textDecoration: "line-through" }}>₹{p.originalPrice.toLocaleString("en-IN")}</div>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: p.stock < 5 ? C.danger : C.success, fontWeight: 600 }}>{p.stock}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {p.isPopular && <Badge color={C.gold}>⭐</Badge>}
                      {p.isRecommended && <Badge color={C.info}>👍</Badge>}
                      {p.isEnergized && <Badge color={C.orange}>🔱</Badge>}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => toggle(p._id)} style={{
                      padding: "4px 12px", borderRadius: 20, border: "none",
                      background: p.isActive ? C.success + "22" : C.muted + "22",
                      color: p.isActive ? C.success : C.muted,
                      fontFamily: font, fontSize: 12, cursor: "pointer",
                    }}>{p.isActive ? "Active" : "Hidden"}</button>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => openPricing(p)}>₹ Price</Btn>
                      <Btn size="sm" variant="danger" onClick={() => del(p._id)}>Del</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Product Form Modal ── */}
      {showForm && (
        <Modal title={editing ? "Edit Product" : "New Product"} onClose={() => setShowForm(false)} onSave={save} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Input label="Product Name *" value={form.name} onChange={f("name")} required />
            <Input label="Emoji Icon" value={form.image} onChange={f("image")} placeholder="🕉️" />
            <Select label="Category *" value={form.category} onChange={f("category")} options={[
              { value: "rudraksha", label: "Rudraksha" },
              { value: "puja-samagri", label: "Puja Samagri" },
              { value: "prasadam", label: "Prasadam" },
              { value: "panchaloha", label: "Panchaloha" },
              { value: "wellness", label: "Wellness" },
              { value: "wearables", label: "Wearables" },
            ]} />
            <Select label="Series" value={form.series || ""} onChange={f("series")} options={[
              { value: "", label: "— None —" },
              { value: "Lakshmi Narayana", label: "Lakshmi Narayana" },
              { value: "Shiva", label: "Shiva" },
              { value: "Durga", label: "Durga" },
              { value: "Ganesha", label: "Ganesha" },
              { value: "Anjaneya", label: "Anjaneya" },
            ]} />
            <Input label="Price (₹) *" value={form.price} onChange={f("price")} type="number" />
            <Input label="Original Price (₹)" value={form.originalPrice} onChange={f("originalPrice")} type="number" />
            <Input label="Stock Qty *" value={form.stock} onChange={f("stock")} type="number" />
            <Input label="Weight (grams)" value={form.weight} onChange={f("weight")} type="number" />
            <Input label="Logistics Cost (₹)" value={form.logisticsCost} onChange={f("logisticsCost")} type="number" />
            <Input label="Discovery Fee (₹)" value={form.discoveryFee} onChange={f("discoveryFee")} type="number" />
            <Input label="Material" value={form.material} onChange={f("material")} />
            <Input label="Temple Origin" value={form.templeOrigin} onChange={f("templeOrigin")} placeholder="e.g. Tirupati Balaji" />
            <Input label="Badge" value={form.badge} onChange={f("badge")} placeholder="Energized / Temple Direct" />
            <Input label="Tags (comma-separated)" value={form.tags} onChange={f("tags")} placeholder="Certified, Temple-Blessed" />
          </div>
          <div style={{ marginTop: 16 }}>
            <Textarea label="Description *" value={form.description} onChange={f("description")} rows={4} />
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[["isPopular", "⭐ Popular"], ["isRecommended", "👍 Recommended"], ["isFeatured", "🌟 Featured"], ["isEnergized", "🔱 Energized"], ["isActive", "✅ Active"]].map(([k, l]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, color: C.text, fontSize: 15, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form[k]} onChange={f(k)} />
                {l}
              </label>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Pricing Modal ── */}
      {pricingId && (
        <Modal title="Update Pricing" onClose={() => setPricingId(null)} onSave={savePricing}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Input label="Selling Price (₹)" value={priceForm.price} onChange={pf("price")} type="number" />
            <Input label="Original / MRP (₹)" value={priceForm.originalPrice} onChange={pf("originalPrice")} type="number" />
            <Input label="Logistics Cost (₹)" value={priceForm.logisticsCost} onChange={pf("logisticsCost")} type="number" />
            <Input label="Discovery Fee (₹)" value={priceForm.discoveryFee} onChange={pf("discoveryFee")} type="number" />
            <Input label="GST %" value={priceForm.gstPercent} onChange={pf("gstPercent")} type="number" />
          </div>
          <div style={{ marginTop: 12, color: C.muted, fontSize: 13 }}>
            Effective total: ₹{((priceForm.price || 0) + (priceForm.logisticsCost || 0) + (priceForm.discoveryFee || 0)).toLocaleString("en-IN")}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── ORDERS MANAGER ───────────────────────────────────────────────────────────
const ORDER_STATUSES = ["placed", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "returned"];
const STATUS_COLORS = { placed: C.muted, confirmed: C.info, processing: C.warning, packed: C.warning, shipped: C.info, delivered: C.success, cancelled: C.danger, returned: C.danger };

function OrdersManager({ toast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", search: "", page: 1 });
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [followUp, setFollowUp] = useState({ status: "none", notes: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders({ ...filters, limit: 20 });
      setOrders(res.orders);
      setTotal(res.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters.status, filters.search, filters.page]);

  const updateStatus = async (id, status) => {
    await api.updateOrderStatus(id, status, statusNote);
    toast(`Order ${status}`);
    load();
    if (selected?._id === id) setSelected(prev => ({ ...prev, status }));
  };

  const shipToShiprocket = async (id) => {
    try {
      await api.shipOrder(id);
      toast("Pushed to Shiprocket ✓");
      load();
    } catch (e) { toast(e.message || "Shiprocket error", "danger"); }
  };

  const saveFollowUp = async (id) => {
    await api.updateFollowUp(id, { followUpStatus: followUp.status, internalNotes: followUp.notes });
    toast("Follow-up saved");
    load();
  };

  const ff = (k) => (e) => setFilters(prev => ({ ...prev, [k]: e.target.value, page: 1 }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 700 }}>Orders ({total})</h1>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={filters.search} onChange={ff("search")} placeholder="🔍 Order # / Name / Phone"
          style={{ padding: "10px 16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: font, fontSize: 14, width: 260 }} />
        <select value={filters.status} onChange={ff("status")} style={{ padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: font }}>
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
            <thead>
              <tr style={{ background: C.surface }}>
                {["Order #", "Customer", "Items", "Total", "Payment", "Status", "Follow-up", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: C.muted, fontSize: 13, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ color: C.gold, fontWeight: 700, fontSize: 13 }}>{o.orderNumber}</div>
                    <div style={{ color: C.muted, fontSize: 11 }}>{new Date(o.createdAt).toLocaleDateString("en-IN")}</div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{o.customer?.name}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{o.customer?.phone}</div>
                    <div style={{ color: C.muted, fontSize: 11 }}>{o.customer?.city}, {o.customer?.state}</div>
                  </td>
                  <td style={{ padding: "12px 14px", color: C.muted, fontSize: 13 }}>{o.items?.length} item{o.items?.length > 1 ? "s" : ""}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ color: C.gold, fontWeight: 700 }}>₹{o.total?.toLocaleString("en-IN")}</div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <Badge color={o.paymentStatus === "paid" ? C.success : o.paymentStatus === "failed" ? C.danger : C.warning}>
                      {o.paymentStatus}
                    </Badge>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <select value={o.status} onChange={e => updateStatus(o._id, e.target.value)}
                      style={{ padding: "4px 8px", background: STATUS_COLORS[o.status] + "22", border: `1px solid ${STATUS_COLORS[o.status]}44`, borderRadius: 6, color: STATUS_COLORS[o.status], fontFamily: font, fontSize: 12, cursor: "pointer" }}>
                      {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <select value={o.followUpStatus || "none"} onChange={e => api.updateFollowUp(o._id, { followUpStatus: e.target.value }).then(load)}
                      style={{ padding: "4px 8px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontFamily: font, fontSize: 12 }}>
                      {["none", "pending", "contacted", "not_interested", "resolved"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn size="sm" variant="ghost" onClick={() => setSelected(o)}>View</Btn>
                      {o.paymentStatus === "paid" && o.status !== "shipped" && (
                        <Btn size="sm" variant="ghost" onClick={() => shipToShiprocket(o._id)}>🚚</Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
        {filters.page > 1 && <Btn size="sm" variant="ghost" onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>← Prev</Btn>}
        <span style={{ color: C.muted, fontSize: 13, alignSelf: "center" }}>Page {filters.page} of {Math.ceil(total / 20)}</span>
        {filters.page < Math.ceil(total / 20) && <Btn size="sm" variant="ghost" onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>Next →</Btn>}
      </div>

      {/* ── Order Detail Modal ── */}
      {selected && (
        <Modal title={`Order ${selected.orderNumber}`} onClose={() => setSelected(null)} wide noSave>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>CUSTOMER</div>
              <div style={{ color: C.text, fontWeight: 600 }}>{selected.customer?.name}</div>
              <div style={{ color: C.muted, fontSize: 14 }}>{selected.customer?.phone}</div>
              <div style={{ color: C.muted, fontSize: 14 }}>{selected.customer?.email}</div>
              <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
                {selected.customer?.line1}, {selected.customer?.city}<br />
                {selected.customer?.state} — {selected.customer?.pincode}
              </div>
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>PAYMENT</div>
              <div><Badge color={selected.paymentStatus === "paid" ? C.success : C.warning}>{selected.paymentStatus}</Badge></div>
              {selected.razorpayPaymentId && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>ID: {selected.razorpayPaymentId}</div>}
              {selected.awbCode && <div style={{ color: C.info, fontSize: 13, marginTop: 8 }}>AWB: {selected.awbCode}</div>}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>ITEMS</div>
            {selected.items?.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 14 }}>
                <span>{item.name} × {item.qty}</span>
                <span style={{ color: C.gold }}>₹{(item.price * item.qty).toLocaleString("en-IN")}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontWeight: 700, color: C.text }}>
              <span>Total</span><span style={{ color: C.gold }}>₹{selected.total?.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* WhatsApp trigger */}
          <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ color: C.muted, fontSize: 13, width: "100%", marginBottom: 4 }}>WHATSAPP NOTIFICATIONS</div>
            {[
              ["order_confirmation", "📋 Order Confirmation"],
              ["shipment_dispatched", "🚚 Shipment Update"],
              ["order_delivered", "✅ Delivered"],
            ].map(([tmpl, label]) => (
              <Btn key={tmpl} size="sm" variant="ghost" onClick={async () => {
                try { await api.sendWhatsApp(selected._id, tmpl, []); toast(`WhatsApp sent: ${label}`); }
                catch (e) { toast(e.message || "WhatsApp failed", "danger"); }
              }}>{label}</Btn>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── BANNERS MANAGER ──────────────────────────────────────────────────────────
function BannersManager({ toast }) {
  const [banners, setBanners] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const res = await api.getAdminBanners();
    setBanners(res.banners);
  };
  useEffect(() => { load(); }, []);

  const openEdit = (b) => { setEditing(b._id); setForm(b); setShowForm(true); };
  const openNew = () => { setEditing(null); setForm({ type: "hero", isActive: true, sortOrder: 0 }); setShowForm(true); };

  const save = async () => {
    if (editing) await api.updateBanner(editing, form);
    else await api.createBanner(form);
    toast("Banner saved");
    setShowForm(false);
    load();
  };

  const del = async (id) => {
    if (!confirm("Delete banner?")) return;
    await api.deleteBanner(id);
    toast("Deleted");
    load();
  };

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 700 }}>Banners & Content</h1>
        <Btn onClick={openNew}>+ New Banner</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {banners.map(b => (
          <Card key={b._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <Badge color={C.info}>{b.type}</Badge>
                {b.isActive ? <Badge color={C.success}>Active</Badge> : <Badge color={C.muted}>Hidden</Badge>}
              </div>
              <div style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>{b.title}</div>
              {b.subtitle && <div style={{ color: C.muted, fontSize: 13 }}>{b.subtitle}</div>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn size="sm" variant="ghost" onClick={() => openEdit(b)}>Edit</Btn>
              <Btn size="sm" variant="danger" onClick={() => del(b._id)}>Del</Btn>
            </div>
          </Card>
        ))}
      </div>

      {showForm && (
        <Modal title={editing ? "Edit Banner" : "New Banner"} onClose={() => setShowForm(false)} onSave={save} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Select label="Type" value={form.type || "hero"} onChange={f("type")} options={[
              { value: "hero", label: "Hero Banner" },
              { value: "strip", label: "Announcement Strip" },
              { value: "cta", label: "CTA Section" },
              { value: "popup", label: "Popup" },
              { value: "category", label: "Category Banner" },
            ]} />
            <Input label="Sort Order" value={form.sortOrder || 0} onChange={f("sortOrder")} type="number" />
            <Input label="Title *" value={form.title || ""} onChange={f("title")} />
            <Input label="Subtitle" value={form.subtitle || ""} onChange={f("subtitle")} />
            <Input label="Badge Text" value={form.badge || ""} onChange={f("badge")} placeholder="🪔 NAVRATRI SPECIAL" />
            <Input label="Emoji" value={form.emoji || ""} onChange={f("emoji")} />
            <Input label="CTA Button Text" value={form.ctaText || ""} onChange={f("ctaText")} />
            <Input label="CTA Link" value={form.ctaLink || ""} onChange={f("ctaLink")} />
            <Input label="CTA Button 2 Text" value={form.ctaText2 || ""} onChange={f("ctaText2")} />
            <Input label="CTA Link 2" value={form.ctaLink2 || ""} onChange={f("ctaLink2")} />
            <Input label="Valid From" value={form.validFrom?.slice(0, 10) || ""} onChange={f("validFrom")} type="date" />
            <Input label="Valid To" value={form.validTo?.slice(0, 10) || ""} onChange={f("validTo")} type="date" />
          </div>
          <div style={{ marginTop: 16 }}>
            <Textarea label="Description" value={form.description || ""} onChange={f("description")} rows={3} />
          </div>
          <div style={{ marginTop: 16 }}>
            <Textarea label="Background Gradient (CSS)" value={form.bgGradient || ""} onChange={f("bgGradient")} rows={2}
              placeholder="linear-gradient(135deg, #3d1c02, #c1440e)" />
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center", color: C.text, fontSize: 15, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.isActive} onChange={f("isActive")} /> Active
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SITE SETTINGS ────────────────────────────────────────────────────────────
function SiteSettings({ toast }) {
  const [settings, setSettings] = useState([]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminSettings().then(res => {
      setSettings(res.settings);
      const map = {};
      res.settings.forEach(s => (map[s.key] = String(s.value)));
      setForm(map);
    }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const updates = settings.map(s => ({
      key: s.key,
      value: s.key.includes("enabled") || s.value === true || s.value === false
        ? form[s.key] === "true"
        : isNaN(Number(form[s.key])) ? form[s.key] : Number(form[s.key]),
      label: s.label,
      group: s.group,
    }));
    await api.bulkUpdateSettings(updates);
    toast("Settings saved");
  };

  const groups = [...new Set(settings.map(s => s.group))];

  if (loading) return <div style={{ color: C.muted, padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 700 }}>Site Settings</h1>
        <Btn onClick={save}>Save All Changes</Btn>
      </div>
      {groups.map(g => (
        <Card key={g} style={{ marginBottom: 20 }}>
          <div style={{ color: C.gold, fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>{g}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {settings.filter(s => s.group === g).map(s => (
              <Input key={s.key} label={s.label || s.key}
                value={form[s.key] || ""}
                onChange={e => setForm(prev => ({ ...prev, [s.key]: e.target.value }))} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── INTEGRATIONS PAGE ────────────────────────────────────────────────────────
function IntegrationsPage() {
  const integrations = [
    {
      name: "Razorpay", icon: "💳", status: "configure",
      description: "Payment gateway for accepting UPI, cards, netbanking, and wallets.",
      docsUrl: "https://dashboard.razorpay.com/app/keys",
      envKeys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
      steps: [
        "Login to https://dashboard.razorpay.com",
        "Go to Settings → API Keys → Generate Key",
        "Copy Key ID and Key Secret to your .env file",
        "Set up Webhook at Settings → Webhooks → Add webhook URL: https://yourdomain.com/api/payment/webhook",
        "Copy Webhook Secret to RAZORPAY_WEBHOOK_SECRET in .env",
        "Set razorpay_enabled = true in Site Settings",
      ],
    },
    {
      name: "Shiprocket", icon: "🚚", status: "configure",
      description: "Multi-courier shipping, tracking, and logistics management.",
      docsUrl: "https://app.shiprocket.in/",
      envKeys: ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD"],
      steps: [
        "Create account at https://app.shiprocket.in/",
        "Go to Settings → Pickup Addresses → Add your warehouse address as 'Primary'",
        "Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to .env",
        "Token is auto-fetched on server start",
        "Test with a sample order: Admin → Orders → click 🚚 button",
      ],
    },
    {
      name: "Interakt (WhatsApp)", icon: "💬", status: "configure",
      description: "WhatsApp Business API for order confirmations, shipping updates, and customer engagement.",
      docsUrl: "https://app.interakt.ai/",
      envKeys: ["INTERAKT_API_KEY"],
      steps: [
        "Sign up at https://app.interakt.ai/",
        "Connect your WhatsApp Business Number",
        "Go to Settings → API & Webhooks → Copy API Key",
        "Add INTERAKT_API_KEY to .env",
        "Create message templates in Interakt dashboard:",
        "  · order_confirmation (4 variables: name, orderNo, amount, delivery)",
        "  · payment_success (4 variables: name, orderNo, amount, paymentId)",
        "  · shipment_dispatched (5 variables: name, orderNo, courier, awb, trackUrl)",
        "  · out_for_delivery (2 variables: name, orderNo)",
        "  · order_delivered (2 variables: name, orderNo)",
        "  · order_cancelled (3 variables: name, orderNo, reason)",
        "Set interakt_enabled = true in Site Settings",
      ],
    },
  ];

  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Integrations</h1>
      <p style={{ color: C.muted, fontSize: 16, marginBottom: 32 }}>Connect your payment, shipping and communication providers.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {integrations.map(intg => (
          <Card key={intg.name}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 36 }}>{intg.icon}</div>
                <div>
                  <div style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>{intg.name}</div>
                  <div style={{ color: C.muted, fontSize: 14 }}>{intg.description}</div>
                </div>
              </div>
              <a href={intg.docsUrl} target="_blank" rel="noopener noreferrer">
                <Btn size="sm" variant="ghost">Open Dashboard ↗</Btn>
              </a>
            </div>

            <div style={{ background: C.surface, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ color: C.gold, fontSize: 13, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>ENV KEYS REQUIRED</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {intg.envKeys.map(k => (
                  <code key={k} style={{ background: C.bg, color: C.orange, padding: "4px 10px", borderRadius: 6, fontSize: 13, fontFamily: "monospace" }}>{k}</code>
                ))}
              </div>
            </div>

            <div>
              <div style={{ color: C.muted, fontSize: 13, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>SETUP STEPS</div>
              <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                {intg.steps.map((s, i) => (
                  <li key={i} style={{ color: s.startsWith("  ·") ? C.muted : C.text, fontSize: s.startsWith("  ·") ? 13 : 14, listStyleType: s.startsWith("  ·") ? "none" : "decimal" }}>{s}</li>
                ))}
              </ol>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN USERS ──────────────────────────────────────────────────────────────
function AdminUsers({ toast }) {
  const [admins, setAdmins] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });

  const load = async () => {
    try { const res = await api.getAdmins(); setAdmins(res.admins); }
    catch { toast("Superadmin only", "danger"); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    await api.createAdmin(form);
    toast("Admin created");
    setShowForm(false);
    load();
  };

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 700 }}>Admin Users</h1>
        <Btn onClick={() => setShowForm(true)}>+ New Admin</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {admins.map(a => (
          <Card key={a._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>{a.name}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>{a.email}</div>
              <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                <Badge color={a.role === "superadmin" ? C.gold : C.info}>{a.role}</Badge>
                {!a.isActive && <Badge color={C.danger}>Inactive</Badge>}
              </div>
            </div>
            <div style={{ color: C.muted, fontSize: 12 }}>
              Last login: {a.lastLogin ? new Date(a.lastLogin).toLocaleDateString("en-IN") : "Never"}
            </div>
          </Card>
        ))}
      </div>

      {showForm && (
        <Modal title="Create Admin" onClose={() => setShowForm(false)} onSave={create}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Name *" value={form.name} onChange={f("name")} />
            <Input label="Email *" value={form.email} onChange={f("email")} type="email" />
            <Input label="Password *" value={form.password} onChange={f("password")} type="password" />
            <Select label="Role" value={form.role} onChange={f("role")} options={[
              { value: "admin", label: "Admin" },
              { value: "manager", label: "Manager" },
              { value: "support", label: "Support" },
            ]} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
function Modal({ title, children, onClose, onSave, wide, noSave }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
      <div style={{
        position: "relative", background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 16, width: "100%", maxWidth: wide ? 800 : 480,
        maxHeight: "90vh", overflowY: "auto", fontFamily: font,
        boxShadow: "0 25px 80px rgba(0,0,0,0.8)",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
        {!noSave && (
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn onClick={onSave}>Save Changes</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN ADMIN APP ───────────────────────────────────────────────────────────
export default function AdminApp() {
  const { admin, login, logout } = useAuth();
  const { toasts, show } = useToast();

  if (!admin) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=Yatra+One&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0f0a05; }
          @keyframes slideIn { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `}</style>
        <Routes>
          <Route path="login" element={<LoginPage onLogin={login} />} />
          <Route path="*" element={<Navigate to="/admin/login" />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=Yatra+One&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0a05; }
        @keyframes slideIn { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #4a3020; }
        select option { background: #1a1008; }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh", fontFamily: font, background: C.bg }}>
        <Sidebar admin={admin} logout={logout} />
        <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductsManager toast={show} />} />
            <Route path="orders" element={<OrdersManager toast={show} />} />
            <Route path="banners" element={<BannersManager toast={show} />} />
            <Route path="settings" element={<SiteSettings toast={show} />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="admins" element={<AdminUsers toast={show} />} />
            <Route path="login" element={<Navigate to="/admin" />} />
          </Routes>
        </main>
      </div>
      <ToastContainer toasts={toasts} />
    </>
  );
}
