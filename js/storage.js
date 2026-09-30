const STORAGE_KEYS = {
  CART: 'pich_market_cart_v2',
  SETTINGS: 'pich_market_settings_v2',
  ORDERS: 'pich_market_orders_v2'
};

const DEFAULT_STORE_SETTINGS = {
  budget: 150000,
  currency: 'COP',
  currencySymbol: '$',
  theme: 'dark'
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
    return [];
  }

  static checkoutOrder(customerData, paymentMethod = 'Efectivo contra entrega') {
    const cart = this.getCart();
    if (cart.length === 0) return null;

    const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const orderNumber = 'MKT-' + Math.floor(100000 + Math.random() * 900000);

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
      shipping: 0,
      total: subtotal,
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

  static exportDataJSON() {
    const data = {
      portal: 'PICH MARKET // TIENDA INTELIGENTE DE ALIMENTOS Y ASEO',
      author: 'Oliver Stid Camacho Diaz',
      exportedAt: new Date().toISOString(),
      cart: this.getCart(),
      settings: this.getSettings(),
      orders: this.getOrders()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_pich_market_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
