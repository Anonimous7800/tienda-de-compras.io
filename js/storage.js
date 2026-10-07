const STORAGE_KEYS = {
  CART: 'pich_market_cart_v2',
  SETTINGS: 'pich_market_settings_v2',
  ORDERS: 'pich_market_orders_v2',
  FAVORITES: 'pich_market_favorites_v2',
  APPLIED_COUPON: 'pich_market_coupon_v2'
};

const DEFAULT_STORE_SETTINGS = {
  budget: 150000,
  currency: 'COP',
  currencySymbol: '$',
  theme: 'light',
  audioAlerts: true
};

const AVAILABLE_COUPONS = {
  FRESCO10: {
    code: 'FRESCO10',
    type: 'percent',
    value: 10,
    minPurchase: 0,
    description: '10% de descuento en el total de la compra'
  },
  OLIVER2026: {
    code: 'OLIVER2026',
    type: 'fixed',
    value: 15000,
    minPurchase: 50000,
    description: '$15.000 de descuento en compras mayores a $50.000'
  },
  PICHVIP: {
    code: 'PICHVIP',
    type: 'percent',
    value: 20,
    minPurchase: 70000,
    description: '20% de descuento exclusivo para miembros VIP (> $70.000)'
  },
  AHORRO5K: {
    code: 'AHORRO5K',
    type: 'fixed',
    value: 5000,
    minPurchase: 25000,
    description: '$5.000 de descuento para compras mayores a $25.000'
  }
};

class StorageManager {
  static getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_STORE_SETTINGS };
    } catch (e) {
      return { ...DEFAULT_STORE_SETTINGS };
    }
  }

  static saveSettings(settings) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      return null;
    }
  }

  static getCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CART);
      if (!raw) {
        const initial = [
          {
            id: 'desp-1',
            name: 'Arroz Blanco Supremo Diana (Kilo)',
            price: 4800,
            quantity: 2,
            category: 'despensa',
            specs: 'Grano Seleccionado • 1000g',
            image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'
          },
          {
            id: 'aseo-1',
            name: 'Detergente en Polvo Ariel Poder y Cuidado (Kilo)',
            price: 9800,
            quantity: 1,
            category: 'aseo_hogar',
            specs: 'Bolsa x 1000g • Ropa Blanca y Color',
            image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80'
          }
        ];
        this.saveCart(initial);
        return initial;
      }
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  static saveCart(cartItems) {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cartItems));
      return true;
    } catch (e) {
      return false;
    }
  }

  static addToCart(product, qty = 1) {
    const cart = this.getCart();
    const existing = cart.find(i => i.id === product.id);

    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        category: product.category,
        specs: product.specs || '',
        image: product.image || ''
      });
    }

    this.saveCart(cart);
    return cart;
  }

  static updateCartQty(id, delta) {
    let cart = this.getCart();
    const item = cart.find(i => i.id === id);

    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== id);
      }
      this.saveCart(cart);
    }
    return cart;
  }

  static removeFromCart(id) {
    const cart = this.getCart().filter(i => i.id !== id);
    this.saveCart(cart);
    return cart;
  }

  static clearCart() {
    this.saveCart([]);
    this.removeAppliedCoupon();
    return [];
  }

  static validateCoupon(code, subtotal) {
    if (!code) return { valid: false, message: 'Ingresa un código de cupón' };
    const upper = code.trim().toUpperCase();
    const def = AVAILABLE_COUPONS[upper];

    if (!def) {
      return { valid: false, message: 'El cupón ingresado no existe o ha expirado.' };
    }

    if (subtotal < def.minPurchase) {
      return {
        valid: false,
        message: `Este cupón requiere una compra mínima de $ ${def.minPurchase.toLocaleString('es-CO')}.`
      };
    }

    let discountAmount = 0;
    if (def.type === 'percent') {
      discountAmount = Math.round((subtotal * def.value) / 100);
    } else {
      discountAmount = Math.min(def.value, subtotal);
    }

    return {
      valid: true,
      coupon: def,
      discountAmount,
      message: `¡Cupón ${def.code} aplicado con éxito!`
    };
  }

  static getAppliedCoupon() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APPLIED_COUPON);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  static saveAppliedCoupon(couponObj) {
    try {
      localStorage.setItem(STORAGE_KEYS.APPLIED_COUPON, JSON.stringify(couponObj));
      return couponObj;
    } catch (e) {
      return null;
    }
  }

  static removeAppliedCoupon() {
    localStorage.removeItem(STORAGE_KEYS.APPLIED_COUPON);
  }

  static getFavorites() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return raw ? JSON.parse(raw) : ['desp-1', 'aseo-1'];
    } catch (e) {
      return [];
    }
  }

  static toggleFavorite(productId) {
    let favs = this.getFavorites();
    if (favs.includes(productId)) {
      favs = favs.filter(id => id !== productId);
    } else {
      favs.push(productId);
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
    return favs;
  }

  static isFavorite(productId) {
    return this.getFavorites().includes(productId);
  }

  static checkoutOrder(customerData, paymentMethod = 'Efectivo contra entrega', explicitCouponCode = null) {
    const cart = this.getCart();
    if (cart.length === 0) return null;

    const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const orderNumber = 'MKT-' + Math.floor(100000 + Math.random() * 900000);

    const couponCode = explicitCouponCode || (this.getAppliedCoupon() ? this.getAppliedCoupon().code : null);
    let discountAmount = 0;
    let appliedCouponInfo = null;

    if (couponCode) {
      const val = this.validateCoupon(couponCode, subtotal);
      if (val.valid) {
        discountAmount = val.discountAmount;
        appliedCouponInfo = val.coupon;
      }
    }

    const total = Math.max(0, subtotal - discountAmount);

    const order = {
      orderId: orderNumber,
      date: new Date().toISOString(),
      customer: {
        name: customerData.name || 'Cliente Particular',
        docId: customerData.docId || '222222222222',
        phone: customerData.phone || '3000000000',
        address: customerData.address || 'Entrega en domicilio',
        city: customerData.city || 'Bogotá D.C.'
      },
      paymentMethod,
      items: [...cart],
      subtotal,
      discount: discountAmount,
      couponCode: couponCode || null,
      shipping: 0,
      total,
      itemCount: cart.reduce((acc, curr) => acc + curr.quantity, 0)
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const orders = raw ? JSON.parse(raw) : [];
      orders.unshift(order);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      this.clearCart();
      return order;
    } catch (e) {
      return null;
    }
  }

  static getOrders() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  static exportDataCSV() {
    const cart = this.getCart();
    if (cart.length === 0) {
      alert('El carrito está vacío. Agrega productos de comida o aseo.');
      return;
    }

    let csv = 'data:text/csv;charset=utf-8,\uFEFF';
    csv += 'ID,Producto,Categoria,Presentacion,Precio Unitario,Cantidad,Subtotal\r\n';

    cart.forEach(i => {
      const itemSub = i.price * i.quantity;
      csv += `"${i.id}","${i.name.replace(/"/g, '""')}","${i.category}","${i.specs}",${i.price},${i.quantity},${itemSub}\r\n`;
    });

    const encoded = encodeURI(csv);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `pedido_pich_market_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  static getProducts() {
    try {
      const raw = localStorage.getItem('pich_market_custom_products');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return (typeof STORE_PRODUCTS !== 'undefined') ? [...STORE_PRODUCTS] : [];
  }

  static saveProducts(products) {
    try {
      localStorage.setItem('pich_market_custom_products', JSON.stringify(products));
      return true;
    } catch (e) {
      return false;
    }
  }

  static exportDataJSON() {
    const data = {
      portal: 'PICH FRESH // TIENDA INTELIGENTE DE ALIMENTOS Y ASEO',
      author: 'Oliver Stid Camacho Diaz',
      version: '2026.2',
      exportedAt: new Date().toISOString(),
      cart: this.getCart(),
      settings: this.getSettings(),
      orders: this.getOrders(),
      favorites: this.getFavorites(),
      appliedCoupon: this.getAppliedCoupon(),
      products: this.getProducts()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_pich_market_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  static importDataJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      if (data.cart) localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(data.cart));
      if (data.orders) localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data.orders));
      if (data.favorites) localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(data.favorites));

      if (data.products && Array.isArray(data.products)) {
        this.saveProducts(data.products);
      }
      return { success: true, count: data.products?.length || 0 };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  static restoreFactoryDefaults() {
    localStorage.removeItem('pich_market_custom_products');
    localStorage.removeItem(STORAGE_KEYS.APPLIED_COUPON);
    localStorage.removeItem(STORAGE_KEYS.FAVORITES);
    return true;
  }
}
