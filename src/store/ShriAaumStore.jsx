import { useState, useEffect } from "react";
import { getProducts, getBanners, createPaymentOrder, verifyPayment } from "../api";

const CATEGORIES = [
  { id: "all", label: "All Products", icon: "🕉️" },
  { id: "rudraksha", label: "Rudraksha", icon: "📿" },
  { id: "puja-samagri", label: "Puja Samagri", icon: "🪔" },
  { id: "prasadam", label: "Temple Prasadam", icon: "🙏" },
  { id: "panchaloha", label: "Panchaloha Idols", icon: "⚱️" },
  { id: "wellness", label: "Wellness", icon: "🌿" },
  { id: "wearables", label: "Sacred Wearables", icon: "💍" },
];

const SERIES = ["Lakshmi Narayana", "Shiva", "Durga", "Ganesha", "Anjaneya"];

const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");
const discount = (orig, curr) => Math.round(((orig - curr) / orig) * 100);

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "success" ? "#2d6a2d" : "#8b2a0a",
          color: "#fff", padding: "12px 20px", borderRadius: 10,
          fontSize: 14, fontFamily: "'Crimson Text', serif",
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
          animation: "slideIn 0.3s ease",
          display: "flex", alignItems: "center", gap: 8, maxWidth: 300,
        }}>
          <span>{t.type === "success" ? "✓" : "!"}</span><span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── Cart Panel ────────────────────────────────────────────────────────────────
function CartPanel({ cart, onClose, onRemove, onQty, onCheckout, checkingOut }) {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = cart.length ? (total > 2000 ? 0 : 99) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ width: 400, background: "#fdf8f0", height: "100vh", overflowY: "auto", display: "flex", flexDirection: "column", fontFamily: "'Crimson Text', serif", boxShadow: "-10px 0 40px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid #e8d5a0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#3d1c02" }}>
          <div>
            <div style={{ color: "#f5c842", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 2 }}>Your Sacred Cart</div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 600 }}>{cart.length} Items</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#f5c842", fontSize: 24, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {cart.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#8b6a3e" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
              <div style={{ fontSize: 18, color: "#3d1c02" }}>Your cart is empty</div>
            </div>
          )}
          {cart.map(item => (
            <div key={item._id} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e8d5a0", display: "flex", gap: 12 }}>
              <div style={{ width: 60, height: 60, borderRadius: 10, background: "linear-gradient(135deg, #f5c842 0%, #e8890a 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>{item.image}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#3d1c02", fontSize: 15, lineHeight: 1.3 }}>{item.name}</div>
                <div style={{ color: "#8b6a3e", fontSize: 13, marginTop: 2 }}>{item.material}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <div style={{ fontWeight: 700, color: "#c1440e", fontSize: 16 }}>{fmt(item.price)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => onQty(item._id, -1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #e8d5a0", background: "none", cursor: "pointer", fontWeight: 700, color: "#3d1c02" }}>−</button>
                    <span style={{ minWidth: 20, textAlign: "center", fontWeight: 600 }}>{item.qty}</span>
                    <button onClick={() => onQty(item._id, 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #e8d5a0", background: "none", cursor: "pointer", fontWeight: 700, color: "#3d1c02" }}>+</button>
                    <button onClick={() => onRemove(item._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c1440e", fontSize: 16, marginLeft: 4 }}>🗑</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div style={{ padding: 20, borderTop: "1px solid #e8d5a0", background: "#fff" }}>
            <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#666" }}><span>Subtotal</span><span>{fmt(total)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#666" }}><span>Shipping</span><span style={{ color: shipping === 0 ? "#2d6a2d" : "#333" }}>{shipping === 0 ? "Free 🎉" : fmt(shipping)}</span></div>
              {shipping > 0 && <div style={{ fontSize: 12, color: "#8b6a3e" }}>Add {fmt(2000 - total)} more for free shipping</div>}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18, color: "#3d1c02", paddingTop: 8, borderTop: "1px solid #e8d5a0", marginTop: 4 }}><span>Total</span><span>{fmt(total + shipping)}</span></div>
            </div>
            <button onClick={onCheckout} disabled={checkingOut} style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: "linear-gradient(135deg, #c1440e, #f5c842)", border: "none", color: "#fff", fontFamily: "'Crimson Text', serif", fontSize: 18, fontWeight: 700, cursor: checkingOut ? "not-allowed" : "pointer", opacity: checkingOut ? 0.7 : 1 }}>
              {checkingOut ? "Processing..." : "Proceed to Checkout 🙏"}
            </button>
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: "#8b6a3e" }}>Secure payment · GST invoicing included</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Checkout Modal ────────────────────────────────────────────────────────────
function CheckoutModal({ onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", line1: "", city: "", state: "", pincode: "" });
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const inputStyle = { padding: "10px 14px", background: "#fdf8f0", border: "1px solid #e8d5a0", borderRadius: 8, color: "#3d1c02", fontFamily: "'Crimson Text', serif", fontSize: 15, outline: "none", width: "100%" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 950, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
      <div style={{ position: "relative", background: "#fdf8f0", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", fontFamily: "'Crimson Text', serif", boxShadow: "0 25px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e8d5a0", display: "flex", justifyContent: "space-between", background: "#3d1c02", borderRadius: "20px 20px 0 0" }}>
          <div style={{ color: "#f5c842", fontSize: 20, fontWeight: 700 }}>Delivery Details</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#f5c842", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          {[["name", "Full Name *", "text"], ["phone", "Phone Number *", "tel"], ["email", "Email", "email"], ["line1", "Address Line 1 *", "text"], ["city", "City *", "text"], ["state", "State *", "text"], ["pincode", "Pincode *", "text"]].map(([k, l, t]) => (
            <div key={k}>
              <label style={{ color: "#8b6a3e", fontSize: 13, display: "block", marginBottom: 4 }}>{l}</label>
              <input type={t} value={form[k]} onChange={f(k)} style={inputStyle} />
            </div>
          ))}
          <button onClick={() => onSubmit(form)} disabled={loading} style={{ marginTop: 8, padding: "14px 0", borderRadius: 10, background: "linear-gradient(135deg, #c1440e, #f5c842)", border: "none", color: "#fff", fontFamily: "'Crimson Text', serif", fontSize: 18, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating Order..." : "Pay Now 🙏"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ product: p, onClose, onAdd }) {
  const [qty, setQty] = useState(1);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
      <div style={{ position: "relative", background: "#fdf8f0", borderRadius: 20, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", fontFamily: "'Crimson Text', serif", boxShadow: "0 25px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ background: "linear-gradient(135deg, #3d1c02 0%, #7a3a0a 50%, #c1440e 100%)", padding: "40px 40px 30px", borderRadius: "20px 20px 0 0", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <div style={{ width: 100, height: 100, borderRadius: 16, flexShrink: 0, background: "rgba(245,200,66,0.2)", border: "2px solid rgba(245,200,66,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>{p.image}</div>
            <div>
              {p.badge && <div style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, background: "rgba(245,200,66,0.25)", color: "#f5c842", fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>{p.badge}</div>}
              <h2 style={{ margin: "0 0 6px", color: "#fff", fontSize: 26, lineHeight: 1.2 }}>{p.name}</h2>
              {p.series && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{p.series} Series</div>}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(p.tags || []).map(t => <span key={t} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12, padding: "3px 10px", borderRadius: 20 }}>{t}</span>)}
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: 32 }}>
          <p style={{ color: "#5a3a1a", fontSize: 17, lineHeight: 1.7, margin: "0 0 20px" }}>{p.description}</p>
          <div style={{ background: "#fff7ec", borderRadius: 12, padding: 20, border: "1px solid #f5c842", marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#3d1c02", marginBottom: 12 }}>Price Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#666" }}>Product</span><span style={{ color: "#3d1c02", fontWeight: 600 }}>{fmt(p.price)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#666" }}>Logistics</span><span style={{ color: "#3d1c02" }}>{fmt(p.logisticsCost || 0)}</span></div>
              {(p.discoveryFee || 0) > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#666" }}>Discovery Fee</span><span style={{ color: "#3d1c02" }}>{fmt(p.discoveryFee)}</span></div>}
              <div style={{ borderTop: "1px solid #e8d5a0", paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18 }}>
                <span style={{ color: "#3d1c02" }}>Total ({qty}x)</span>
                <span style={{ color: "#c1440e" }}>{fmt(((p.price + (p.logisticsCost || 0) + (p.discoveryFee || 0)) * qty))}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #e8d5a0", borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ padding: "12px 18px", background: "#fdf8f0", border: "none", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#3d1c02" }}>−</button>
              <span style={{ padding: "12px 20px", background: "#fff", fontWeight: 700, fontSize: 18, color: "#3d1c02" }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={{ padding: "12px 18px", background: "#fdf8f0", border: "none", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#3d1c02" }}>+</button>
            </div>
            <button onClick={() => { onAdd(p, qty); onClose(); }} style={{ flex: 1, padding: "14px 0", borderRadius: 10, background: "linear-gradient(135deg, #c1440e, #f5c842)", border: "none", color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer", fontFamily: "'Crimson Text', serif" }}>Add to Cart 🛒</button>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 20, color: "#8b6a3e", fontSize: 13 }}>
            <span>✅ Authentic & Energized</span><span>🚚 24–48hr Delivery</span><span>🔒 GST Invoiced</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Store ─────────────────────────────────────────────────────────────────
export default function ShriAaumStore() {
  const [products, setProducts] = useState([]);
  const [heroBanner, setHeroBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [filter, setFilter] = useState("all");
  const [activeSeries, setActiveSeries] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const addToast = (msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };

  useEffect(() => {
    Promise.all([
      getProducts({ limit: 100 }),
      getBanners(),
    ]).then(([prodRes, bannerRes]) => {
      setProducts(prodRes.products || []);
      const hero = (bannerRes.banners || []).find(b => b.type === "hero");
      setHeroBanner(hero);
    }).catch(() => {
      // Backend not connected — show empty state gracefully
    }).finally(() => setLoading(false));
  }, []);

  const addToCart = (product, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      if (existing) return prev.map(i => i._id === product._id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...product, qty }];
    });
    addToast(`${product.name} added to cart`);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i._id !== id));
  const changeQty = (id, delta) => setCart(prev => prev.map(i => i._id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const handleCheckout = async (customerDetails) => {
    setCheckoutLoading(true);
    try {
      const items = cart.map(i => ({ productId: i._id, name: i.name, qty: i.qty }));
      const res = await createPaymentOrder({ items, customer: customerDetails });

      if (res.dev) {
        // Dev mode — no Razorpay keys configured
        setCart([]);
        setShowCheckout(false);
        setShowCart(false);
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 4000);
        return;
      }

      // Launch Razorpay
      const options = {
        key: res.key,
        amount: res.amount,
        currency: res.currency,
        name: "Shri Aaum Sacred Store",
        description: "Devotional Products",
        order_id: res.razorpayOrderId,
        handler: async (response) => {
          await verifyPayment({
            orderId: res.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          setCart([]);
          setShowCheckout(false);
          setShowCart(false);
          setOrderSuccess(true);
          setTimeout(() => setOrderSuccess(false), 4000);
        },
        prefill: { name: customerDetails.name, contact: customerDetails.phone, email: customerDetails.email },
        theme: { color: "#c1440e" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      addToast(e.message || "Order failed", "danger");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const filtered = products.filter(p => {
    if (activeCategory !== "all" && p.category !== activeCategory) return false;
    if (filter === "popular" && !p.isPopular) return false;
    if (filter === "recommended" && !p.isRecommended) return false;
    if (activeSeries && p.series !== activeSeries) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const heroTitle = heroBanner?.title || "Sacred Products, Temple Blessed";
  const heroSubtitle = heroBanner?.subtitle || "Navratri Special — Puja Samagri Starting ₹117";
  const heroBadge = heroBanner?.badge || "🪔 NAVRATRI SPECIAL";
  const heroBg = heroBanner?.bgGradient || "linear-gradient(135deg, #3d1c02 0%, #7a3a0a 40%, #c1440e 80%, #f5c842 100%)";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=Yatra+One&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fdf8f0; font-family: 'Crimson Text', serif; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #c1440e; border-radius: 3px; }
        @keyframes slideIn { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(193,68,14,0.2) !important; }
        .product-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .add-btn:hover { filter: brightness(1.1); }
        .add-btn { transition: all 0.15s ease; }
      `}</style>

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 600, background: "rgba(61,28,2,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(245,200,66,0.2)", padding: "0 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", height: 68, gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg, #f5c842, #c1440e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🕉</div>
            <div>
              <div style={{ fontFamily: "'Yatra One', cursive", color: "#f5c842", fontSize: 22, lineHeight: 1 }}>Shri Aaum</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>Sacred Store</div>
            </div>
          </div>
          <div style={{ flex: 1, maxWidth: 460, position: "relative" }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Rudraksha, Prasadam, Idols..." style={{ width: "100%", padding: "10px 16px 10px 42px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(245,200,66,0.25)", borderRadius: 10, color: "#fff", fontFamily: "'Crimson Text', serif", fontSize: 15, outline: "none" }} />
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#f5c842", fontSize: 16 }}>🔍</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ color: "#f5c842", fontSize: 11, letterSpacing: 1 }}>ANDHRA · SOUTH INDIA</span>
              <span>50+ Partner Temples</span>
            </div>
            <button onClick={() => setShowCart(true)} style={{ position: "relative", background: "linear-gradient(135deg, #c1440e, #f5c842)", border: "none", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 15, cursor: "pointer", fontFamily: "'Crimson Text', serif", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              🛒 Cart
              {cartCount > 0 && <span style={{ background: "#fff", color: "#c1440e", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{ background: heroBg, padding: "60px 32px", position: "relative", overflow: "hidden" }}>
        {[...Array(4)].map((_, i) => <div key={i} style={{ position: "absolute", width: [400, 250, 300, 180][i], height: [400, 250, 300, 180][i], borderRadius: "50%", border: "1px solid rgba(245,200,66,0.1)", top: ["-100px", "20px", "-50px", "40px"][i], right: ["50px", "200px", "150px", "400px"][i], opacity: 0.5 }} />)}
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }}>
          <div style={{ maxWidth: 700, animation: "fadeUp 0.6s ease" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,200,66,0.2)", border: "1px solid rgba(245,200,66,0.4)", borderRadius: 30, padding: "6px 16px", marginBottom: 20 }}>
              <span style={{ color: "#f5c842", fontSize: 14, letterSpacing: 1 }}>{heroBadge}</span>
            </div>
            <h1 style={{ fontFamily: "'Yatra One', cursive", color: "#fff", fontSize: 52, lineHeight: 1.1, marginBottom: 16 }}>
              {heroTitle.split(",")[0]},<br /><span style={{ color: "#f5c842" }}>{heroTitle.split(",")[1] || "Temple Blessed"}</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 20, lineHeight: 1.6, marginBottom: 28 }}>Authentic devotional items from 50+ partner temples across South India. Energized by expert pujaris, delivered to your doorstep.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setActiveCategory("rudraksha")} style={{ padding: "14px 28px", background: "#f5c842", border: "none", borderRadius: 10, color: "#3d1c02", fontFamily: "'Crimson Text', serif", fontSize: 17, fontWeight: 700, cursor: "pointer" }}>Shop Rudraksha 📿</button>
              <button onClick={() => setActiveCategory("prasadam")} style={{ padding: "14px 28px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, color: "#fff", fontFamily: "'Crimson Text', serif", fontSize: 17, cursor: "pointer" }}>Temple Prasadam 🙏</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 32, marginTop: 40, flexWrap: "wrap" }}>
            {[{ val: "50+", label: "Partner Temples" }, { val: "10K+", label: "Happy Devotees" }, { val: "24–48hr", label: "Delivery SLA" }, { val: "100%", label: "Authentic & Energized" }].map(s => (
              <div key={s.label}><div style={{ fontFamily: "'Yatra One', cursive", color: "#f5c842", fontSize: 28 }}>{s.val}</div><div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{s.label}</div></div>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px" }}>
        {/* Series chips */}
        <div style={{ marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "#8b6a3e", fontSize: 14, alignSelf: "center", marginRight: 4 }}>Series:</span>
          {SERIES.map(s => (
            <button key={s} onClick={() => setActiveSeries(activeSeries === s ? null : s)} style={{ padding: "6px 16px", borderRadius: 20, background: activeSeries === s ? "#f5c842" : "rgba(245,200,66,0.1)", border: "1px solid " + (activeSeries === s ? "#f5c842" : "rgba(245,200,66,0.4)"), color: activeSeries === s ? "#3d1c02" : "#7a3a0a", fontFamily: "'Crimson Text', serif", fontSize: 14, cursor: "pointer", fontWeight: activeSeries === s ? 700 : 400 }}>{s}</button>
          ))}
        </div>

        {/* Category bar + Filter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)} style={{ padding: "8px 18px", borderRadius: 10, background: activeCategory === c.id ? "linear-gradient(135deg, #c1440e, #f5c842)" : "#fff", border: "1px solid " + (activeCategory === c.id ? "transparent" : "#e8d5a0"), color: activeCategory === c.id ? "#fff" : "#5a3a1a", fontFamily: "'Crimson Text', serif", fontSize: 15, cursor: "pointer", fontWeight: activeCategory === c.id ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{c.icon}</span><span>{c.label}</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ key: "all", label: "All" }, { key: "popular", label: "⭐ Most Popular" }, { key: "recommended", label: "👍 Recommended" }].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: "8px 16px", borderRadius: 10, background: filter === f.key ? "#3d1c02" : "#fff", border: "1px solid #e8d5a0", color: filter === f.key ? "#f5c842" : "#5a3a1a", fontFamily: "'Crimson Text', serif", fontSize: 14, cursor: "pointer" }}>{f.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20, color: "#8b6a3e", fontSize: 15 }}>
          {loading ? "Loading sacred products..." : <>Showing <strong style={{ color: "#3d1c02" }}>{filtered.length}</strong> sacred products</>}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {[...Array(6)].map((_, i) => <div key={i} style={{ height: 380, background: "#fff", borderRadius: 16, border: "1px solid #e8d5a0", opacity: 0.5 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#8b6a3e" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 22, color: "#3d1c02", marginBottom: 8 }}>No products found</div>
            <div>Try a different category or filter</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {filtered.map(p => (
              <div key={p._id} className="product-card" style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #e8d5a0", boxShadow: "0 2px 12px rgba(61,28,2,0.06)", display: "flex", flexDirection: "column", cursor: "pointer" }} onClick={() => setSelectedProduct(p)}>
                <div style={{ background: "linear-gradient(135deg, #fdf0d5 0%, #fde8b0 100%)", padding: 28, textAlign: "center", position: "relative" }}>
                  {p.badge && <div style={{ position: "absolute", top: 12, left: 12, background: p.badge === "Temple Direct" ? "#2d6a2d" : p.badge === "Masterpiece" ? "#6b3fa0" : "#c1440e", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{p.badge}</div>}
                  <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
                    {p.isPopular && <span style={{ fontSize: 16 }}>⭐</span>}
                    {p.isRecommended && <span style={{ fontSize: 16 }}>👍</span>}
                  </div>
                  <div style={{ fontSize: 64 }}>{p.image}</div>
                </div>
                <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
                  {p.series && <div style={{ fontSize: 12, color: "#8b6a3e", letterSpacing: 1, marginBottom: 4 }}>{p.series} Series</div>}
                  <h3 style={{ fontSize: 17, color: "#3d1c02", lineHeight: 1.3, marginBottom: 6, fontWeight: 600 }}>{p.name}</h3>
                  <p style={{ fontSize: 14, color: "#8b6a3e", lineHeight: 1.5, flex: 1, marginBottom: 12 }}>{(p.description || "").substring(0, 80)}...</p>
                  <div style={{ fontSize: 12, color: "#a0785a", marginBottom: 12 }}>📦 {p.material}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                    {(p.tags || []).map(t => <span key={t} style={{ background: "#fdf0d5", color: "#7a3a0a", fontSize: 11, padding: "2px 8px", borderRadius: 20, border: "1px solid #e8d5a0" }}>{t}</span>)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#c1440e" }}>{fmt(p.price)}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {p.originalPrice > p.price && <><span style={{ fontSize: 13, color: "#999", textDecoration: "line-through" }}>{fmt(p.originalPrice)}</span><span style={{ fontSize: 12, color: "#2d6a2d", fontWeight: 700 }}>{discount(p.originalPrice, p.price)}% off</span></>}
                      </div>
                    </div>
                    <button className="add-btn" onClick={e => { e.stopPropagation(); addToCart(p); }} style={{ padding: "10px 16px", borderRadius: 10, background: "linear-gradient(135deg, #c1440e, #f5c842)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Crimson Text', serif" }}>Add 🛒</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust Section */}
      <div style={{ background: "#3d1c02", padding: "48px 32px", marginTop: 48 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontFamily: "'Yatra One', cursive", color: "#f5c842", fontSize: 32, marginBottom: 8 }}>Why Shri Aaum?</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            {[["🏛️", "50+ Partner Temples", "Verified temple partnerships across Andhra & South India"], ["🔱", "Energized Products", "All items ritually energized by certified pujaris"], ["🚚", "24–48hr Delivery", "Reliable last-mile delivery across India"], ["🔒", "Secure Payments", "PCI-DSS compliant · RBI guidelines · GST invoiced"]].map(([icon, title, desc]) => (
              <div key={title} style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
                <div style={{ fontWeight: 700, color: "#f5c842", fontSize: 16, marginBottom: 6 }}>{title}</div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#1a0a00", padding: "40px 32px 24px", color: "rgba(255,255,255,0.5)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 32, marginBottom: 32 }}>
          <div style={{ maxWidth: 280 }}>
            <div style={{ fontFamily: "'Yatra One', cursive", color: "#f5c842", fontSize: 24, marginBottom: 10 }}>🕉 Shri Aaum</div>
            <p style={{ lineHeight: 1.7, fontSize: 14 }}>Connecting devotees to authentic temple services and sacred products across India.</p>
          </div>
          {[{ title: "Shop", links: ["Rudraksha", "Puja Samagri", "Prasadam", "Panchaloha Idols", "Wellness"] }, { title: "Services", links: ["Book a Puja", "Temple Tourism", "Astrology (Nadi)", "Priest Network"] }, { title: "Support", links: ["Track Order", "Returns & Refunds", "Contact Us", "GST Invoices"] }].map(col => (
            <div key={col.title}>
              <div style={{ color: "#f5c842", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{col.title}</div>
              {col.links.map(l => <div key={l} style={{ marginBottom: 8, fontSize: 14, cursor: "pointer" }}>{l}</div>)}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 13 }}>
          <span>© 2026 Shri Aaum Sacred Store. GST Registered. RBI-compliant payments.</span>
          <span>Made with 🙏 in Andhra Pradesh, India</span>
        </div>
      </footer>

      {/* Order Success */}
      {orderSuccess && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "48px 40px", textAlign: "center", maxWidth: 400, fontFamily: "'Crimson Text', serif", animation: "fadeUp 0.4s ease" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🙏</div>
            <div style={{ fontFamily: "'Yatra One', cursive", color: "#3d1c02", fontSize: 28, marginBottom: 10 }}>Order Placed!</div>
            <p style={{ color: "#7a3a0a", fontSize: 17, lineHeight: 1.6 }}>Your sacred items will be delivered within 24–48 hours. Om Namah Shivaya 🕉️</p>
          </div>
        </div>
      )}

      {/* Overlays */}
      {showCart && <CartPanel cart={cart} onClose={() => setShowCart(false)} onRemove={removeFromCart} onQty={changeQty} checkingOut={checkoutLoading} onCheckout={() => { setShowCart(false); setShowCheckout(true); }} />}
      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} onSubmit={handleCheckout} loading={checkoutLoading} />}
      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />}
      <Toast toasts={toasts} />
    </>
  );
}
