import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Attach JWT for admin routes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sa_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401 && 
        window.location.pathname.startsWith("/admin") &&
        !window.location.pathname.includes("/admin/login") &&
        !window._redirecting) {
      window._redirecting = true;
      localStorage.removeItem("sa_admin_token");
      localStorage.removeItem("sa_admin");
      setTimeout(() => { window.location.replace("/admin/login"); }, 100);
    }
    return Promise.reject(err.response?.data || err);
  }
);

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = (params) => api.get("/products", { params });
export const getAdminProducts = () => api.get("/products/admin/all");
export const createProduct = (data) => api.post("/products", data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const updatePricing = (id, data) => api.patch(`/products/${id}/pricing`, data);
export const updateStock = (id, stock) => api.patch(`/products/${id}/stock`, { stock });
export const toggleProduct = (id) => api.patch(`/products/${id}/toggle`);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// ── Orders ────────────────────────────────────────────────────────────────────
export const getOrders = (params) => api.get("/orders", { params });
export const getOrderStats = () => api.get("/orders/stats");
export const getOrder = (id) => api.get(`/orders/${id}`);
export const updateOrderStatus = (id, status, notes) => api.patch(`/orders/${id}/status`, { status, internalNotes: notes });
export const shipOrder = (id) => api.post(`/orders/${id}/ship`);
export const trackOrder = (id) => api.get(`/orders/${id}/track`);
export const updateFollowUp = (id, data) => api.patch(`/orders/${id}/followup`, data);
export const sendWhatsApp = (id, templateName, bodyValues) => api.post(`/orders/${id}/whatsapp`, { templateName, bodyValues });

// ── Payment ───────────────────────────────────────────────────────────────────
export const createPaymentOrder = (data) => api.post("/payment/create-order", data);
export const verifyPayment = (data) => api.post("/payment/verify", data);
export const refundOrder = (orderId) => api.post(`/payment/refund/${orderId}`);

// ── Banners ───────────────────────────────────────────────────────────────────
export const getBanners = () => api.get("/banners");
export const getAdminBanners = () => api.get("/banners/admin/all");
export const createBanner = (data) => api.post("/banners", data);
export const updateBanner = (id, data) => api.put(`/banners/${id}`, data);
export const deleteBanner = (id) => api.delete(`/banners/${id}`);
export const getSettings = () => api.get("/banners/settings");
export const getAdminSettings = () => api.get("/banners/admin/settings");
export const updateSetting = (key, data) => api.put(`/banners/settings/${key}`, data);
export const bulkUpdateSettings = (settings) => api.post("/banners/settings/bulk", { settings });

// ── Auth ──────────────────────────────────────────────────────────────────────
export const adminLogin = (data) => api.post("/auth/login", data);
export const getAdmins = () => api.get("/auth/admins");
export const createAdmin = (data) => api.post("/auth/admins", data);
export const updateAdmin = (id, data) => api.put(`/auth/admins/${id}`, data);

export default api;
