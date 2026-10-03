class ApexStoreApp {
  constructor() {
    this.cart = [];
    this.settings = {};
    this.currentUser = null;
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.sortBy = 'default';
    this.editingProductId = null;
    this.speechRecognition = null;
    this.appliedCoupon = null;

    this.init();
  }

  async init() {
    await Database.init();
    this.currentUser = AuthManager.getCurrentUser();
    this.settings = StorageManager.getSettings();
    this.cart = StorageManager.getCart();
    this.appliedCoupon = StorageManager.getAppliedCoupon();

    this.applyTheme(this.settings.theme || 'light');
    this.bindEvents();
    this.initSpeechRecognition();
    this.renderAuthStatus();
    this.renderStoreProducts();
    this.renderBudgetBar();
    this.updateCartDrawer();
    this.updateFavoritesCount();
    this.registerServiceWorker();
  }

  formatMoney(amount) {
    const symbol = this.settings.currencySymbol || '$';
    return `${symbol} ${Math.round(amount || 0).toLocaleString('es-CO')}`;
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.settings.theme = theme;
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
      themeBtn.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    }
  }

  toggleTheme() {
    const newTheme = (this.settings.theme === 'dark') ? 'light' : 'dark';
    this.applyTheme(newTheme);
    StorageManager.saveSettings({ theme: newTheme });
    this.showToast(`Modo ${newTheme === 'dark' ? 'Oscuro' : 'Claro'} activado`);
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.lang = 'es-CO';
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;

      this.speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const searchInput = document.getElementById('storeSearchInput');
        if (searchInput) {
          searchInput.value = transcript;
          this.searchQuery = transcript;
          this.renderStoreProducts();
          this.showToast(`Buscando por voz: "${transcript}"`);
        }
      };

      this.speechRecognition.onerror = () => {
        this.showToast('No se detectó audio del micrófono', 'warning');
      };

      this.speechRecognition.onend = () => {
        const micBtn = document.getElementById('btnVoiceSearch');
        if (micBtn) micBtn.classList.remove('mic-recording');
      };
    }
  }

  startVoiceSearch() {
    if (!this.speechRecognition) {
      this.showToast('El reconocimiento por voz no está disponible en este navegador.', 'warning');
      return;
    }
    const micBtn = document.getElementById('btnVoiceSearch');
    if (micBtn) micBtn.classList.add('mic-recording');
    this.showToast('🎤 Escuchando... Di el nombre de un alimento o producto');
    try {
      this.speechRecognition.start();
    } catch (e) {
      this.speechRecognition.stop();
    }
  }

  renderAuthStatus() {
    const authBox = document.getElementById('authActionsContainer');
    const userBox = document.getElementById('userProfileNav');
    const navName = document.getElementById('navUserName');
    const navAvatar = document.getElementById('navUserAvatar');

    if (this.currentUser) {
      if (authBox) authBox.style.display = 'none';
      if (userBox) {
        userBox.style.display = 'flex';
        navName.textContent = this.currentUser.name;
        navAvatar.textContent = this.currentUser.avatar || '🛒';
      }
      const pName = document.getElementById('profileNameDisplay');
      const pEmail = document.getElementById('profileEmailDisplay');
      if (pName) pName.textContent = this.currentUser.name;
      if (pEmail) pEmail.textContent = this.currentUser.email;
    } else {
      if (authBox) authBox.style.display = 'flex';
      if (userBox) userBox.style.display = 'none';
    }
  }

  handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;

    const res = AuthManager.login(email, pass);
    if (res.success) {
      this.currentUser = res.user;
      this.closeModal('loginModal');
      this.renderAuthStatus();
      this.showToast(`Bienvenido de nuevo, ${res.user.name}`);
    } else {
      this.showToast(res.message, 'warning');
    }
  }

  handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    const budget = document.getElementById('regBudget').value;

    const res = AuthManager.register(name, email, pass, budget, '🛒');
    if (res.success) {
      this.currentUser = res.user;
      this.closeModal('registerModal');
      this.renderAuthStatus();
      this.showToast(`Cuenta registrada para ${res.user.name}`);
    } else {
      this.showToast(res.message, 'warning');
    }
  }

  handleLogout() {
    AuthManager.logout();
    this.currentUser = null;
    this.closeModal('userProfileModal');
    this.renderAuthStatus();
    this.showToast('Sesión cerrada correctamente');
  }

  toggleFavorite(productId, event) {
    if (event) event.stopPropagation();
    const favs = StorageManager.toggleFavorite(productId);
    this.updateFavoritesCount();
    this.renderStoreProducts();
    const isFav = favs.includes(productId);
    this.showToast(isFav ? '❤️ Guardado en tus Favoritos' : 'Removido de Favoritos');
  }

  updateFavoritesCount() {
    const count = StorageManager.getFavorites().length;
    const favCountEl = document.getElementById('navFavCount');
    if (favCountEl) favCountEl.textContent = count;
  }

  renderStoreProducts() {
    const grid = document.getElementById('storeProductsGrid');
    if (!grid) return;

    let products = Database.getAllProducts();
    const favs = StorageManager.getFavorites();

    if (this.activeCategory === 'favorites') {
      products = products.filter(p => favs.includes(p.id));
    } else if (this.activeCategory !== 'all') {
      products = products.filter(p => p.category === this.activeCategory);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      products = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.specs && p.specs.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q))
      );
    }

    if (this.sortBy === 'price_asc') {
      products.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (this.sortBy === 'price_desc') {
      products.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (this.sortBy === 'name_asc') {
      products.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy === 'stock_desc') {
      products.sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));
    }

    const countLabel = document.getElementById('storeProductsCount');
    if (countLabel) {
      countLabel.textContent = `${products.length} producto${products.length === 1 ? '' : 's'} disponible${products.length === 1 ? '' : 's'}`;
    }

    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 48px 16px; color: var(--text-muted); background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 36px; margin-bottom: 8px;">🛒</div>
          <h3 style="font-family: var(--font-heading); color: var(--text-main);">No se encontraron productos</h3>
          <p style="font-size: 0.85rem; margin-top: 4px;">
            ${this.activeCategory === 'favorites' ? 'Aún no tienes productos en tu lista de favoritos.' : 'Intenta con otra categoría o escribe otro término en el buscador.'}
          </p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(prod => {
      const isFav = favs.includes(prod.id);
      return `
      <div class="market-item-card" id="prod-${prod.id}">
        <div class="mic-image-wrap">
          <img src="${prod.image}" alt="${prod.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'">
          <span class="mic-badge">${prod.tag || 'Fresco'}</span>
          <span class="mic-stock-tag">Stock: ${prod.stock || 20}</span>
          <button class="mic-fav-btn ${isFav ? 'active' : ''}" onclick="app.toggleFavorite('${prod.id}', event)" title="${isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}">
            ${isFav ? '❤️' : '🤍'}
          </button>
        </div>
        <div class="mic-body">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span class="mic-cat-label">${PRODUCT_CATEGORIES[prod.category]?.name || prod.category}</span>
            ${prod.barcode ? `<span style="font-size: 0.65rem; color: var(--text-light); font-family: var(--font-mono);">#${prod.barcode}</span>` : ''}
          </div>
          <h4 class="mic-title">${prod.name}</h4>
          <div class="mic-presentation">${prod.specs || ''}</div>
          <p class="mic-desc">${prod.description || ''}</p>
          <div class="mic-footer-row">
            <span class="mic-price-amount">${this.formatMoney(prod.price)}</span>
            <button class="btn-add-product" onclick="app.buyProduct('${prod.id}')">
              + Comprar 🛒
            </button>
          </div>
        </div>
      </div>
      `;
    }).join('');
  }

  filterCategory(catId) {
    this.activeCategory = catId;
    document.querySelectorAll('.cat-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === catId);
    });
    this.renderStoreProducts();
  }

  setSorting(sortBy) {
    this.sortBy = sortBy;
    this.renderStoreProducts();
  }

  buyProduct(productId) {
    const products = Database.getAllProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    this.cart = StorageManager.addToCart(prod, 1);
    this.updateCartDrawer();
    this.renderBudgetBar();
    this.showToast(`"${prod.name}" añadido al carrito`);
  }

  updateCartDrawer() {
    this.cart = StorageManager.getCart();
    this.appliedCoupon = StorageManager.getAppliedCoupon();

    const countEl = document.getElementById('navCartCount');
    const totalCount = this.cart.reduce((acc, curr) => acc + curr.quantity, 0);
    if (countEl) countEl.textContent = totalCount;

    const itemsContainer = document.getElementById('cartItemsList');
    const subtotalEl = document.getElementById('cartDrawerSubtotal');
    const discountRow = document.getElementById('cartDrawerDiscountRow');
    const discountEl = document.getElementById('cartDrawerDiscountAmount');
    const totalEl = document.getElementById('cartDrawerTotal');

    const subtotal = this.cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    let discount = 0;

    if (this.appliedCoupon) {
      const val = StorageManager.validateCoupon(this.appliedCoupon.code, subtotal);
      if (val.valid) {
        discount = val.discountAmount;
        if (discountRow) discountRow.style.display = 'flex';
        if (discountEl) discountEl.textContent = `- ${this.formatMoney(discount)} (${this.appliedCoupon.code})`;
      } else {
        StorageManager.removeAppliedCoupon();
        this.appliedCoupon = null;
        if (discountRow) discountRow.style.display = 'none';
      }
    } else {
      if (discountRow) discountRow.style.display = 'none';
    }

    const total = Math.max(0, subtotal - discount);

    if (subtotalEl) subtotalEl.textContent = this.formatMoney(subtotal);
    if (totalEl) totalEl.textContent = this.formatMoney(total);

    this.renderCouponBadge();

    if (!itemsContainer) return;

    if (this.cart.length === 0) {
      itemsContainer.innerHTML = `
        <div style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
          <div style="font-size: 40px; margin-bottom: 10px;">🛒</div>
          <h4 style="font-family: var(--font-heading); color: var(--text-main);">Tu carrito está vacío</h4>
          <p style="font-size: 0.85rem; margin-top: 4px;">Explora la tienda y agrega alimentos o productos de aseo.</p>
        </div>
      `;
      return;
    }

    itemsContainer.innerHTML = this.cart.map(item => `
      <div class="drawer-item-row">
        <img src="${item.image}" alt="${item.name}" class="dir-thumb" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'">
        <div class="dir-info">
          <div class="dir-name">${item.name}</div>
          <div class="dir-unit-price">${this.formatMoney(item.price)} c/u</div>
          <div class="dir-stepper">
            <button class="dir-step-btn" onclick="app.changeItemQty('${item.id}', -1)">-</button>
            <span style="font-size: 0.85rem; font-weight: 800; min-width: 22px; text-align: center;">${item.quantity}</span>
            <button class="dir-step-btn" onclick="app.changeItemQty('${item.id}', 1)">+</button>
            <button class="dir-step-del" onclick="app.removeItem('${item.id}')" title="Eliminar producto">🗑️</button>
          </div>
        </div>
        <div style="font-family: var(--font-heading); font-size: 1rem; font-weight: 800; color: var(--brand-green);">
          ${this.formatMoney(item.price * item.quantity)}
        </div>
      </div>
    `).join('');
  }

  applyCouponCode() {
    const input = document.getElementById('couponCodeInput');
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    if (!code) {
      this.showToast('Ingresa un código de cupón promocional', 'warning');
      return;
    }

    const subtotal = this.cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    if (subtotal === 0) {
      this.showToast('Agrega productos al carrito antes de aplicar un cupón', 'warning');
      return;
    }

    const validation = StorageManager.validateCoupon(code, subtotal);
    if (validation.valid) {
      this.appliedCoupon = StorageManager.saveAppliedCoupon(validation.coupon);
      input.value = '';
      this.updateCartDrawer();
      this.renderBudgetBar();
      this.showToast(`🎉 ${validation.message}`);
    } else {
      this.showToast(validation.message, 'warning');
    }
  }

  removeCoupon() {
    StorageManager.removeAppliedCoupon();
    this.appliedCoupon = null;
    this.updateCartDrawer();
    this.renderBudgetBar();
    this.showToast('Cupón promocional removido');
  }

  renderCouponBadge() {
    const container = document.getElementById('appliedCouponContainer');
    if (!container) return;

    if (this.appliedCoupon) {
      container.innerHTML = `
        <div class="coupon-applied-pill">
          <span>🏷️ <strong>${this.appliedCoupon.code}</strong> (${this.appliedCoupon.description})</span>
          <button class="btn-remove-coupon" onclick="app.removeCoupon()" title="Quitar cupón">&times;</button>
        </div>
      `;
      container.style.display = 'block';
    } else {
      container.innerHTML = '';
      container.style.display = 'none';
    }
  }

  changeItemQty(id, delta) {
    this.cart = StorageManager.updateCartQty(id, delta);
    this.updateCartDrawer();
    this.renderBudgetBar();
  }

  removeItem(id) {
    this.cart = StorageManager.removeFromCart(id);
    this.updateCartDrawer();
    this.renderBudgetBar();
  }

  renderBudgetBar() {
    const subtotal = this.cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    let discount = 0;
    if (this.appliedCoupon) {
      const val = StorageManager.validateCoupon(this.appliedCoupon.code, subtotal);
      if (val.valid) discount = val.discountAmount;
    }
    const total = Math.max(0, subtotal - discount);

    const budget = this.settings.budget || 150000;
    const remaining = budget - total;
    const percent = Math.min((total / budget) * 100, 100);

    const barBudgetEl = document.getElementById('barBudgetAmount');
    const barTotalEl = document.getElementById('barTotalAmount');
    const barRemEl = document.getElementById('barRemainingAmount');
    const barFill = document.getElementById('barBudgetFill');
    const barRemLabel = document.getElementById('barRemainingLabel');
    const budgetAlertBox = document.getElementById('budgetSmartAlert');

    if (barBudgetEl) barBudgetEl.textContent = this.formatMoney(budget);
    if (barTotalEl) barTotalEl.textContent = this.formatMoney(total);

    if (barRemEl && barRemLabel) {
      if (remaining < 0) {
        barRemLabel.textContent = 'Déficit (Superado)';
        barRemEl.textContent = `- ${this.formatMoney(Math.abs(remaining))}`;
        barRemEl.style.color = 'var(--brand-red)';
      } else {
        barRemLabel.textContent = 'Presupuesto Disponible';
        barRemEl.textContent = this.formatMoney(remaining);
        barRemEl.style.color = 'var(--brand-green)';
      }
    }

    if (barFill) {
      barFill.style.width = `${percent}%`;
      barFill.style.background = remaining < 0 ? 'var(--brand-red)' : percent > 85 ? 'var(--brand-amber)' : 'var(--brand-green)';
    }

    if (budgetAlertBox) {
      if (remaining < 0) {
        budgetAlertBox.style.display = 'flex';
        budgetAlertBox.className = 'budget-alert-banner alert-danger';
        budgetAlertBox.innerHTML = `
          <span>⚠️ <strong>¡Atención!</strong> Has superado el presupuesto del hogar en <strong>${this.formatMoney(Math.abs(remaining))}</strong>. Revisa las cantidades en tu carrito o utiliza el cupón <code>FRESCO10</code> para ahorrar.</span>
        `;
      } else if (percent >= 85) {
        budgetAlertBox.style.display = 'flex';
        budgetAlertBox.className = 'budget-alert-banner alert-warning';
        budgetAlertBox.innerHTML = `
          <span>💡 <strong>Consejo Financiero:</strong> Estás al ${Math.round(percent)}% de tu presupuesto. Te restan <strong>${this.formatMoney(remaining)}</strong> disponibles.</span>
        `;
      } else {
        budgetAlertBox.style.display = 'none';
      }
    }
  }

  openCartDrawer() {
    document.getElementById('cartDrawerModal')?.classList.add('active');
  }

  closeCartDrawer() {
    document.getElementById('cartDrawerModal')?.classList.remove('active');
  }

  openCheckoutModal() {
    if (this.cart.length === 0) {
      this.showToast('El carrito está vacío', 'warning');
      return;
    }
    this.closeCartDrawer();
    this.openModal('checkoutModal');

    const subtotal = this.cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    let discount = 0;
    if (this.appliedCoupon) {
      const val = StorageManager.validateCoupon(this.appliedCoupon.code, subtotal);
      if (val.valid) discount = val.discountAmount;
    }
    const total = Math.max(0, subtotal - discount);

    const checkoutTotal = document.getElementById('checkoutTotalDisplay');
    if (checkoutTotal) checkoutTotal.textContent = this.formatMoney(total);

    const checkoutDiscountRow = document.getElementById('checkoutDiscountNotice');
    if (checkoutDiscountRow) {
      if (discount > 0) {
        checkoutDiscountRow.style.display = 'block';
        checkoutDiscountRow.innerHTML = `Descuento aplicado: <strong>- ${this.formatMoney(discount)}</strong> (Cupón ${this.appliedCoupon.code})`;
      } else {
        checkoutDiscountRow.style.display = 'none';
      }
    }

    if (this.currentUser) {
      const nameInput = document.getElementById('checkoutBuyerName');
      if (nameInput) nameInput.value = this.currentUser.name;
    }
  }

  finalizePurchase() {
    const name = document.getElementById('checkoutBuyerName').value.trim() || 'Cliente';
    const docId = document.getElementById('checkoutDocId').value.trim() || '1020304050';
    const phone = document.getElementById('checkoutPhone').value.trim() || '3101234567';
    const address = document.getElementById('checkoutAddress').value.trim() || 'Dirección Principal';
    const city = document.getElementById('checkoutCity').value.trim() || 'Bogotá D.C.';
    const method = document.getElementById('checkoutPayMethod').value;

    const customerData = { name, docId, phone, address, city };
    const order = StorageManager.checkoutOrder(customerData, method);
    if (!order) return;

    this.closeModal('checkoutModal');
    this.updateCartDrawer();
    this.renderBudgetBar();
    this.showInvoiceModal(order);
  }

  showInvoiceModal(order) {
    const receiptBox = document.getElementById('invoiceContentArea');
    if (!receiptBox) return;

    receiptBox.innerHTML = `
      <div class="printable-invoice-paper">
        <div class="pip-header">
          <div>
            <div class="pip-title">PICH FRESH S.A.S.</div>
            <div style="font-size: 0.75rem; color: #64748b;">NIT: 901.458.712-4 • Régimen Ordinario del IVA</div>
            <div style="font-size: 0.72rem; color: #94a3b8;">Resolución DIAN No. 1876400012987 • Rango 001 al 50000</div>
          </div>
          <div style="text-align: right;">
            <div style="background: #0f172a; color: #fff; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 2px; display: inline-block;">FACTURA ELECTRÓNICA</div>
            <div style="font-family: var(--font-mono); font-size: 1.15rem; font-weight: 900; color: #059669; margin: 2px 0;">${order.orderId}</div>
            <div style="font-size: 0.72rem; color: #64748b;">${new Date(order.date).toLocaleString('es-CO')}</div>
          </div>
        </div>

        <div class="pip-client-grid">
          <div>
            <div><strong>Cliente:</strong> ${order.customer.name}</div>
            <div><strong>C.C. / NIT:</strong> ${order.customer.docId}</div>
            <div><strong>Teléfono:</strong> ${order.customer.phone}</div>
          </div>
          <div>
            <div><strong>Dirección:</strong> ${order.customer.address}</div>
            <div><strong>Ciudad:</strong> ${order.customer.city}</div>
            <div><strong>Medio de Pago:</strong> ${order.paymentMethod}</div>
          </div>
        </div>

        <table class="pip-table">
          <thead>
            <tr>
              <th style="text-align: left;">Producto</th>
              <th style="text-align: center;">Cant.</th>
              <th style="text-align: right;">Vr. Unitario</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(i => `
              <tr>
                <td>
                  <strong>${i.name}</strong><br>
                  <span style="font-size: 0.72rem; color: #64748b;">${i.specs || ''}</span>
                </td>
                <td style="text-align: center; font-weight: 700;">${i.quantity}</td>
                <td style="text-align: right;">${this.formatMoney(i.price)}</td>
                <td style="text-align: right; font-weight: 700;">${this.formatMoney(i.price * i.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="pip-totals-row">
          <div class="pip-approved-stamp">
            ✓ PAGADA & APROBADA
            <div style="font-size: 0.65rem; font-weight: 600;">Transacción Electrónica Exitosa</div>
          </div>
          <div style="min-width: 220px; text-align: right;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: #64748b; margin-bottom: 4px;">
              <span>Subtotal Productos:</span>
              <span>${this.formatMoney(order.subtotal)}</span>
            </div>
            ${order.discount ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: #059669; font-weight: 700; margin-bottom: 4px;">
              <span>Descuento (${order.couponCode || 'Cupón'}):</span>
              <span>- ${this.formatMoney(order.discount)}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: #64748b; margin-bottom: 4px;">
              <span>Envío a Domicilio:</span>
              <span style="color: #059669; font-weight: 700;">GRATIS</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 6px;">
              <span>TOTAL FACTURADO:</span>
              <span>${this.formatMoney(order.total)}</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 16px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 0.7rem; color: #94a3b8; text-align: center;">
          Documento oficial emitido electrónicamente por PICH FRESH // Mercado & Hogar.
          ¡Gracias por apoyar el comercio local!
        </div>
      </div>
    `;

    this.openModal('invoiceModal');
    this.showToast('¡Factura generada exitosamente!');
  }

  toggleAdminView() {
    const adminSection = document.getElementById('adminDashboardSection');
    const storeSection = document.getElementById('storeSection');
    const heroBanner = document.querySelector('.market-hero-banner');
    const budgetBar = document.querySelector('.budget-widget-bar');

    if (!adminSection) return;

    if (adminSection.classList.contains('active')) {
      adminSection.classList.remove('active');
      if (storeSection) storeSection.style.display = 'block';
      if (heroBanner) heroBanner.style.display = 'block';
      if (budgetBar) budgetBar.style.display = 'block';
      this.showToast('Volviste a la vista de tienda');
    } else {
      adminSection.classList.add('active');
      if (storeSection) storeSection.style.display = 'none';
      if (heroBanner) heroBanner.style.display = 'none';
      if (budgetBar) budgetBar.style.display = 'none';
      this.renderAdminDashboard();
      this.showToast('Panel de Administración SQLite activo');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  renderAdminDashboard() {
    const products = Database.getAllProducts();
    const orders = StorageManager.getOrders();

    const statCount = document.getElementById('adminStatCount');
    const statStock = document.getElementById('adminStatStock');
    const statValue = document.getElementById('adminStatValue');
    const statOrders = document.getElementById('adminStatOrders');

    const totalStock = products.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
    const totalInventoryValue = products.reduce((acc, curr) => acc + ((Number(curr.price) || 0) * (Number(curr.stock) || 0)), 0);

    if (statCount) statCount.textContent = products.length;
    if (statStock) statStock.textContent = totalStock;
    if (statValue) statValue.textContent = this.formatMoney(totalInventoryValue);
    if (statOrders) statOrders.textContent = orders.length;

    const tableBody = document.getElementById('adminProductsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = products.map(p => `
      <tr>
        <td>
          <img src="${p.image}" class="admin-thumb" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'">
        </td>
        <td>
          <strong>${p.name}</strong><br>
          <span style="font-size: 0.72rem; color: var(--text-muted);">${p.specs || ''}</span>
          ${p.barcode ? `<br><span style="font-size: 0.65rem; color: var(--text-light); font-family: var(--font-mono);">#${p.barcode}</span>` : ''}
        </td>
        <td>
          <span style="background: var(--bg-card-subtle); padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">
            ${PRODUCT_CATEGORIES[p.category]?.name || p.category}
          </span>
        </td>
        <td style="font-weight: 800; color: var(--brand-green);">
          ${this.formatMoney(p.price)}
        </td>
        <td style="font-weight: 700;">
          ${p.stock || 0} unid.
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn-table-action" onclick="app.openEditProductModal('${p.id}')">✏️ Editar</button>
            <button class="btn-table-action btn-table-del" onclick="app.deleteProductPrompt('${p.id}')">🗑️ Quitar</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openAddProductModal() {
    this.editingProductId = null;
    document.getElementById('adminProdModalTitle').textContent = 'Agregar Nuevo Producto a SQLite';
    document.getElementById('adminProductForm').reset();
    this.openModal('adminProductModal');
  }

  openEditProductModal(id) {
    const products = Database.getAllProducts();
    const p = products.find(i => i.id === id);
    if (!p) return;

    this.editingProductId = id;
    document.getElementById('adminProdModalTitle').textContent = 'Editar Producto en SQLite';
    document.getElementById('admProdName').value = p.name;
    document.getElementById('admProdCategory').value = p.category;
    document.getElementById('admProdPrice').value = p.price;
    document.getElementById('admProdSpecs').value = p.specs || '';
    document.getElementById('admProdStock').value = p.stock || 20;
    document.getElementById('admProdTag').value = p.tag || 'Fresco';
    document.getElementById('admProdImage').value = p.image || '';
    document.getElementById('admProdDesc').value = p.description || '';

    this.openModal('adminProductModal');
  }

  saveProductFromAdmin() {
    const name = document.getElementById('admProdName').value.trim();
    const category = document.getElementById('admProdCategory').value;
    const price = parseFloat(document.getElementById('admProdPrice').value) || 0;
    const specs = document.getElementById('admProdSpecs').value.trim();
    const stock = parseInt(document.getElementById('admProdStock').value) || 10;
    const tag = document.getElementById('admProdTag').value.trim() || 'Fresco';
    const image = document.getElementById('admProdImage').value.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
    const description = document.getElementById('admProdDesc').value.trim();

    if (!name || price <= 0) {
      this.showToast('Completa el nombre y un precio válido', 'warning');
      return;
    }

    const prod = {
      id: this.editingProductId || 'prod-' + Date.now(),
      name,
      category,
      price,
      specs,
      tag,
      stock,
      image,
      description
    };

    Database.addProduct(prod);
    this.closeModal('adminProductModal');
    this.renderAdminDashboard();
    this.renderStoreProducts();
    this.showToast(this.editingProductId ? 'Producto actualizado en SQLite' : 'Producto guardado en SQLite');
    this.editingProductId = null;
  }

  deleteProductPrompt(id) {
    if (confirm('¿Estás seguro de quitar este producto de la base de datos SQLite?')) {
      Database.deleteProduct(id);
      this.renderAdminDashboard();
      this.renderStoreProducts();
      this.showToast('Producto eliminado de la base de datos');
    }
  }

  downloadSqlite() {
    Database.exportSqliteFile();
    this.showToast('Descargando archivo SQLite...');
  }

  exportFullBackupJSON() {
    StorageManager.exportDataJSON();
    this.showToast('Copia de seguridad JSON descargada');
  }

  triggerImportJSON() {
    const fileInput = document.getElementById('importBackupFileInput');
    if (fileInput) fileInput.click();
  }

  handleBackupFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = StorageManager.importDataJSON(e.target.result);
      if (res.success) {
        this.cart = StorageManager.getCart();
        this.renderStoreProducts();
        this.renderAdminDashboard();
        this.renderBudgetBar();
        this.updateCartDrawer();
        this.showToast(`Respaldo importado con éxito (${res.count} productos)`);
      } else {
        this.showToast(`Error al importar respaldo: ${res.message}`, 'warning');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  restoreFactoryCatalogPrompt() {
    if (confirm('¿Deseas restaurar el catálogo oficial a los valores originales de fábrica?')) {
      StorageManager.restoreFactoryDefaults();
      this.renderAdminDashboard();
      this.renderStoreProducts();
      this.showToast('Catálogo de fábrica restaurado correctamente');
    }
  }

  openBarcodeScanner() {
    this.openModal('barcodeModal');
  }

  searchByBarcode(code) {
    const q = code.trim();
    if (!q) return;

    const products = Database.getAllProducts();
    const found = products.find(p => p.barcode === q || p.id === q);

    if (found) {
      this.closeModal('barcodeModal');
      this.buyProduct(found.id);
      this.showToast(`¡Código #${q} identificado! Se añadió "${found.name}" al carrito.`);
    } else {
      this.showToast(`No se encontró ningún producto con el código #${q}`, 'warning');
    }
  }

  openTestSuiteModal() {
    this.openModal('testSuiteModal');
    if (!window.testSuite.results.length) {
      this.runTestSuite();
    } else {
      this.renderTestSuiteResults();
    }
  }

  async runTestSuite() {
    const runBtn = document.getElementById('btnRunTests');
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '⏳ Ejecutando pruebas...';
    }

    const summaryEl = document.getElementById('testSuiteSummary');
    if (summaryEl) {
      summaryEl.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Ejecutando batería de pruebas unitarias y de integración...</div>';
    }

    await window.testSuite.runAllTests();

    if (runBtn) {
      runBtn.disabled = false;
      runBtn.innerHTML = '▶️ Re-ejecutar Pruebas';
    }

    this.renderTestSuiteResults();
    this.showToast('Suite de pruebas completada');
  }

  renderTestSuiteResults(filterCategory = 'all') {
    const summary = window.testSuite.getSummary();

    const totalEl = document.getElementById('tsStatTotal');
    const passedEl = document.getElementById('tsStatPassed');
    const failedEl = document.getElementById('tsStatFailed');
    const timeEl = document.getElementById('tsStatTime');
    const listEl = document.getElementById('testResultsList');

    if (totalEl) totalEl.textContent = summary.total;
    if (passedEl) passedEl.textContent = summary.passed;
    if (failedEl) failedEl.textContent = summary.failed;
    if (timeEl) timeEl.textContent = `${summary.durationMs} ms`;

    if (!listEl) return;

    let items = summary.results;
    if (filterCategory !== 'all') {
      items = items.filter(r => r.category === filterCategory);
    }

    listEl.innerHTML = items.map(r => {
      const isPass = r.status === 'passed';
      return `
        <div class="test-item-card ${isPass ? 'pass' : 'fail'}">
          <div class="test-item-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="test-status-badge ${isPass ? 'pass' : 'fail'}">
                ${isPass ? '✓ PASS' : '✗ FAIL'}
              </span>
              <span class="test-name">${r.name}</span>
            </div>
            <span class="test-time">${r.durationMs} ms</span>
          </div>
          <div class="test-item-category">Módulo: <code>${r.category}</code></div>
          ${r.error ? `
            <div class="test-item-error">
              <strong>Error detectado:</strong> ${r.error}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  downloadTestReport() {
    window.testSuite.downloadReport();
    this.showToast('Descargando reporte de pruebas en formato Markdown...');
  }

  openHistoryModal() {
    const orders = StorageManager.getOrders();
    const list = document.getElementById('historyOrdersList');

    if (orders.length === 0) {
      list.innerHTML = '<p style="text-align: center; padding: 32px 16px; color: var(--text-muted);">No hay facturas ni compras anteriores en el historial.</p>';
    } else {
      list.innerHTML = orders.map(o => `
        <div style="background: var(--bg-card-subtle); padding: 14px 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--text-muted);">
            <span>Factura ${o.orderId} • ${new Date(o.date).toLocaleDateString('es-CO')}</span>
            <span style="color: var(--brand-green); font-weight: 800;">✓ Aprobada</span>
          </div>
          <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-main); margin: 4px 0;">Total: ${this.formatMoney(o.total)}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
            ${o.itemCount} producto(s) para ${o.customer?.name || 'Cliente'} • ${o.paymentMethod}
            ${o.couponCode ? `• <span style="color: var(--brand-green); font-weight: 700;">Cupón: ${o.couponCode}</span>` : ''}
          </div>
          <button class="btn-white-cta" style="padding: 5px 12px; font-size: 0.72rem;" onclick='app.showInvoiceModal(${JSON.stringify(o).replace(/'/g, "&apos;")})'>
            Ver Factura
          </button>
        </div>
      `).join('');
    }

    this.openModal('historyModal');
  }

  saveBudgetSettings() {
    const budget = parseFloat(document.getElementById('settingBudgetInput').value) || 150000;
    this.settings = StorageManager.saveSettings({ budget });
    this.closeModal('settingsModal');
    this.renderBudgetBar();
    this.showToast('Presupuesto familiar actualizado');
  }

  openModal(id) {
    document.getElementById(id)?.classList.add('active');
  }

  closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
  }

  showToast(msg, type = 'info') {
    const host = document.getElementById('toastHost');
    if (!host) return;

    const toast = document.createElement('div');
    toast.className = 'toast-pill';
    if (type === 'warning') toast.style.borderLeftColor = 'var(--brand-amber)';
    toast.textContent = msg;
    host.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  bindEvents() {
    const searchInput = document.getElementById('storeSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderStoreProducts();
      });
    }

    const sortSelect = document.getElementById('storeSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.setSorting(e.target.value);
      });
    }

    const couponInput = document.getElementById('couponCodeInput');
    if (couponInput) {
      couponInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.applyCouponCode();
        }
      });
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }
}

let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new ApexStoreApp();
});
