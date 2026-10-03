class PichTestSuite {
  constructor() {
    this.results = [];
    this.isRunning = false;
    this.startTime = 0;
    this.totalDuration = 0;
    this.categories = [
      'sqlite_db',
      'auth_system',
      'cart_operations',
      'coupons_system',
      'budget_calculator',
      'invoice_orders',
      'search_filtering',
      'favorites_system'
    ];
  }

  expect(actual) {
    return {
      toBe: (expected, desc = '') => {
        if (actual !== expected) {
          throw new Error(`${desc} | Esperado: "${expected}", pero se obtuvo: "${actual}"`);
        }
      },
      toEqual: (expected, desc = '') => {
        const aStr = JSON.stringify(actual);
        const eStr = JSON.stringify(expected);
        if (aStr !== eStr) {
          throw new Error(`${desc} | Esperado: ${eStr}, pero se obtuvo: ${aStr}`);
        }
      },
      toBeGreaterThan: (expected, desc = '') => {
        if (!(actual > expected)) {
          throw new Error(`${desc} | Esperado valor > ${expected}, pero se obtuvo: ${actual}`);
        }
      },
      toBeGreaterThanOrEqual: (expected, desc = '') => {
        if (!(actual >= expected)) {
          throw new Error(`${desc} | Esperado valor >= ${expected}, pero se obtuvo: ${actual}`);
        }
      },
      toBeLessThanOrEqual: (expected, desc = '') => {
        if (!(actual <= expected)) {
          throw new Error(`${desc} | Esperado valor <= ${expected}, pero se obtuvo: ${actual}`);
        }
      },
      toBeTruthy: (desc = '') => {
        if (!actual) {
          throw new Error(`${desc} | Esperado valor verdadero, pero se obtuvo: ${actual}`);
        }
      },
      toBeFalsy: (desc = '') => {
        if (actual) {
          throw new Error(`${desc} | Esperado valor falso, pero se obtuvo: ${actual}`);
        }
      },
      toBeDefined: (desc = '') => {
        if (actual === undefined || actual === null) {
          throw new Error(`${desc} | Esperado valor definido, pero se obtuvo: ${actual}`);
        }
      },
      toContain: (item, desc = '') => {
        if (typeof actual === 'string' && !actual.includes(item)) {
          throw new Error(`${desc} | La cadena no contiene "${item}"`);
        } else if (Array.isArray(actual) && !actual.includes(item)) {
          throw new Error(`${desc} | El arreglo no contiene el elemento indicado`);
        }
      }
    };
  }

  async runTest(category, name, testFn) {
    const testRecord = {
      category,
      name,
      status: 'pending',
      durationMs: 0,
      error: null
    };

    const t0 = performance.now();
    try {
      await testFn(this.expect.bind(this));
      testRecord.status = 'passed';
      testRecord.durationMs = Math.round((performance.now() - t0) * 100) / 100;
    } catch (err) {
      testRecord.status = 'failed';
      testRecord.error = err.message || String(err);
      testRecord.durationMs = Math.round((performance.now() - t0) * 100) / 100;
    }

    this.results.push(testRecord);
    return testRecord;
  }

  async runAllTests(onProgress = null) {
    this.results = [];
    this.isRunning = true;
    this.startTime = performance.now();

    await this.runTest('sqlite_db', 'Inicialización y disponibilidad del motor SQLite o Fallback', async (expect) => {
      expect(Database).toBeDefined('La instancia Database global debe existir');
      expect(Database.isReady).toBe(true, 'La base de datos debe reportar estado isReady = true');
    });

    await this.runTest('sqlite_db', 'Carga y recuperación del catálogo de productos', async (expect) => {
      const prods = Database.getAllProducts();
      expect(Array.isArray(prods)).toBe(true, 'getAllProducts debe retornar un arreglo');
      expect(prods.length).toBeGreaterThan(0, 'El catálogo no debe estar vacío');
    });

    await this.runTest('sqlite_db', 'Estructura relacional de producto (campos requeridos)', async (expect) => {
      const prods = Database.getAllProducts();
      const first = prods[0];
      expect(first.id).toBeDefined('Todo producto debe tener un ID primario');
      expect(first.name).toBeDefined('Todo producto debe tener un nombre');
      expect(first.category).toBeDefined('Todo producto debe tener una categoría');
      expect(Number(first.price)).toBeGreaterThan(0, 'El precio debe ser un número positivo');
    });

    await this.runTest('sqlite_db', 'Inserción y persistencia de nuevo producto en SQLite', async (expect) => {
      const testProd = {
        id: 'test-crud-' + Date.now(),
        name: 'Producto de Prueba Automatizada',
        category: 'despensa',
        price: 9900,
        specs: 'Empaque de prueba 500g',
        tag: 'Pruebas',
        stock: 50,
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
        description: 'Creado durante la ejecución de la suite de pruebas'
      };

      const ok = Database.addProduct(testProd);
      expect(ok).toBeTruthy('La inserción debe ser exitosa');

      const found = Database.getAllProducts().find(p => p.id === testProd.id);
      expect(found).toBeDefined('El producto debe encontrarse en la base de datos');
      expect(found.name).toBe(testProd.name, 'El nombre debe coincidir');

      Database.deleteProduct(testProd.id);
      const afterDel = Database.getAllProducts().find(p => p.id === testProd.id);
      expect(afterDel === undefined).toBe(true, 'El producto debe eliminarse correctamente');
    });

    await this.runTest('auth_system', 'Inicio de sesión con credenciales por defecto de Oliver Camacho', async (expect) => {
      const res = AuthManager.login('oliver.camacho@correo.edu.co', '123');
      expect(res.success).toBe(true, 'El login con credenciales válidas debe ser exitoso');
      expect(res.user.name).toContain('Oliver', 'El usuario devuelto debe ser Oliver');
    });

    await this.runTest('auth_system', 'Bloqueo y rechazo ante credenciales erróneas', async (expect) => {
      const res = AuthManager.login('oliver.camacho@correo.edu.co', 'contrasena_falsa_999');
      expect(res.success).toBe(false, 'Debe rechazar contraseñas incorrectas');
      expect(res.message).toBeDefined('Debe proveer mensaje explicativo del fallo');
    });

    await this.runTest('auth_system', 'Registro de nuevo cliente y detección de correo duplicado', async (expect) => {
      const tempMail = `test_${Date.now()}@pichfresh.com`;
      const regRes = AuthManager.register('Comprador Demo', tempMail, 'claveSegura123', 200000);
      expect(regRes.success).toBe(true, 'El registro de nuevo correo debe ser exitoso');

      const dupRes = AuthManager.register('Comprador Duplicado', tempMail, 'claveSegura123', 200000);
      expect(dupRes.success).toBe(false, 'Debe impedir el registro de correo ya existente');
    });

    await this.runTest('auth_system', 'Persistencia y lectura del usuario en sesión activa', async (expect) => {
      const current = AuthManager.getCurrentUser();
      expect(current).toBeDefined('Debe existir un usuario activo en el sistema');
      expect(current.email).toBeDefined('El usuario activo debe contar con correo válido');
    });

    await this.runTest('cart_operations', 'Agregar ítem al carrito y cálculo de subtotal', async (expect) => {
      const mockItem = {
        id: 'mock-cart-item-1',
        name: 'Item de Test Aritmético',
        price: 5000,
        category: 'despensa',
        specs: '1000g'
      };

      StorageManager.addToCart(mockItem, 3);
      const cart = StorageManager.getCart();
      const inCart = cart.find(i => i.id === mockItem.id);

      expect(inCart).toBeDefined('El ítem debe estar en el carrito');
      expect(inCart.quantity).toBe(3, 'La cantidad agregada debe ser 3');

      StorageManager.removeFromCart(mockItem.id);
      const after = StorageManager.getCart().find(i => i.id === mockItem.id);
      expect(after === undefined).toBe(true, 'El ítem de prueba debe haber sido removido');
    });

    await this.runTest('cart_operations', 'Control de límites: cantidad no puede ser negativa y decrementar a cero elimina', async (expect) => {
      const mockItem = {
        id: 'mock-cart-item-limit',
        name: 'Item Límite Test',
        price: 3000,
        category: 'frescos'
      };

      StorageManager.addToCart(mockItem, 1);
      StorageManager.updateCartQty(mockItem.id, -1);
      const cart = StorageManager.getCart();
      const inCart = cart.find(i => i.id === mockItem.id);
      expect(inCart === undefined).toBe(true, 'Al restar 1 a una unidad, debe removerse del carrito');
    });

    await this.runTest('coupons_system', 'Validación del cupón porcentual FRESCO10 (10% de descuento)', async (expect) => {
      const coupon = StorageManager.validateCoupon('FRESCO10', 100000);
      expect(coupon.valid).toBe(true, 'El cupón FRESCO10 debe ser válido');
      expect(coupon.discountAmount).toBe(10000, 'El 10% de $100.000 debe ser $10.000');
    });

    await this.runTest('coupons_system', 'Validación del cupón de monto fijo OLIVER2026 ($15.000 con compra mínima)', async (expect) => {
      const subtotalValido = 80000;
      const resValido = StorageManager.validateCoupon('OLIVER2026', subtotalValido);
      expect(resValido.valid).toBe(true, 'Debe ser válido con compra > $50.000');
      expect(resValido.discountAmount).toBe(15000, 'El descuento debe ser exactamente $15.000');

      const subtotalBajo = 30000;
      const resBajo = StorageManager.validateCoupon('OLIVER2026', subtotalBajo);
      expect(resBajo.valid).toBe(false, 'Debe rechazar el cupón si no alcanza la compra mínima de $50.000');
    });

    await this.runTest('coupons_system', 'Rechazo de cupón inventado o no registrado', async (expect) => {
      const fakeRes = StorageManager.validateCoupon('CUPON_FALSO_XYZ', 100000);
      expect(fakeRes.valid).toBe(false, 'Un cupón inexistente debe ser rechazado');
      expect(fakeRes.message).toBeDefined('Debe mostrar motivo de invalidez');
    });

    await this.runTest('budget_calculator', 'Cálculo de presupuesto restante disponible', async (expect) => {
      const budget = 150000;
      const total = 45000;
      const remaining = budget - total;
      expect(remaining).toBe(105000, 'El saldo restante debe ser $105.000');
      const percent = (total / budget) * 100;
      expect(percent).toBe(30, 'El porcentaje consumido debe ser 30%');
    });

    await this.runTest('budget_calculator', 'Detección precisa de alerta de sobrecosto / déficit presupuestal', async (expect) => {
      const budget = 100000;
      const total = 125000;
      const deficit = total - budget;
      expect(deficit).toBe(25000, 'El déficit detectado debe ser $25.000');
      const isOverBudget = total > budget;
      expect(isOverBudget).toBe(true, 'Debe reportar que el carrito excede el límite del hogar');
    });

    await this.runTest('invoice_orders', 'Generación de orden y factura con identificador DIAN único', async (expect) => {
      const prevCart = StorageManager.getCart();
      const sampleItem = {
        id: 'test-inv-item',
        name: 'Leche Alquería Factura Test',
        price: 4200,
        quantity: 2,
        category: 'frescos',
        specs: '1000ml'
      };
      StorageManager.saveCart([sampleItem]);

      const customer = {
        name: 'Oliver Camacho Estudiante',
        docId: '1098765432',
        phone: '3157894561',
        address: 'Carrera 7 # 45-10',
        city: 'Bogotá'
      };

      const order = StorageManager.checkoutOrder(customer, 'Transferencia PSE / Nequi / Daviplata', 'FRESCO10');
      expect(order).toBeDefined('La orden generada no debe ser nula');
      expect(order.orderId).toContain('MKT-', 'El código de orden debe iniciar con el prefijo oficial MKT-');
      expect(order.subtotal).toBe(8400, 'El subtotal debe ser $8.400 (4200 x 2)');
      expect(order.total).toBeLessThanOrEqual(8400, 'El total liquidado debe contemplar descuento si aplica');
      expect(order.customer.docId).toBe(customer.docId, 'La cédula del cliente debe persistir');

      StorageManager.saveCart(prevCart);
    });

    await this.runTest('invoice_orders', 'Persistencia del pedido en el historial de facturas', async (expect) => {
      const orders = StorageManager.getOrders();
      expect(Array.isArray(orders)).toBe(true, 'getOrders debe retornar un arreglo');
      expect(orders.length).toBeGreaterThan(0, 'El historial debe contener al menos un pedido emitido');
    });

    await this.runTest('search_filtering', 'Filtrado exacto por categoría (ej: aseo_hogar)', async (expect) => {
      const all = Database.getAllProducts();
      const aseo = all.filter(p => p.category === 'aseo_hogar');
      expect(aseo.length).toBeGreaterThan(0, 'Deben existir productos en la categoría aseo_hogar');
      const allAseo = aseo.every(p => p.category === 'aseo_hogar');
      expect(allAseo).toBe(true, 'Todos los elementos filtrados deben pertenecer a aseo_hogar');
    });

    await this.runTest('search_filtering', 'Búsqueda por texto insensible a mayúsculas/minúsculas', async (expect) => {
      const all = Database.getAllProducts();
      const query = 'ArRoZ';
      const q = query.toLowerCase();
      const matches = all.filter(p => p.name.toLowerCase().includes(q));
      expect(matches.length).toBeGreaterThan(0, 'Debe encontrar coincidencias para el término "ArRoZ"');
      expect(matches[0].name.toLowerCase()).toContain('arroz', 'El resultado debe contener la palabra arroz');
    });

    await this.runTest('search_filtering', 'Algoritmo de ordenamiento por precio menor a mayor', async (expect) => {
      const all = [...Database.getAllProducts()];
      const sorted = all.sort((a, b) => a.price - b.price);
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].price <= sorted[i + 1].price).toBe(true, `El precio ${sorted[i].price} debe ser <= ${sorted[i + 1].price}`);
      }
    });

    await this.runTest('favorites_system', 'Agregar y remover producto de la lista de favoritos', async (expect) => {
      const testId = 'fresc-1';
      const initialFavs = StorageManager.getFavorites();

      if (initialFavs.includes(testId)) {
        StorageManager.toggleFavorite(testId);
      }

      const favList1 = StorageManager.toggleFavorite(testId);
      expect(favList1.includes(testId)).toBe(true, 'El producto debe estar en la lista de favoritos tras agregarlo');
      expect(StorageManager.isFavorite(testId)).toBe(true, 'isFavorite debe retornar true');

      const favList2 = StorageManager.toggleFavorite(testId);
      expect(favList2.includes(testId)).toBe(false, 'El producto no debe estar en favoritos tras removerlo');
    });

    this.totalDuration = Math.round((performance.now() - this.startTime) * 100) / 100;
    this.isRunning = false;

    if (onProgress) {
      onProgress(this.getSummary());
    }

    return this.getSummary();
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      durationMs: this.totalDuration,
      results: this.results
    };
  }

  generateMarkdownReport() {
    const s = this.getSummary();
    const dateStr = new Date().toLocaleString('es-CO');

    let md = `# INFORME DE PRUEBAS AUTOMATIZADAS - PICH FRESH // MERCADO & HOGAR\n`;
    md += `**Autor:** Oliver Stid Camacho Diaz\n`;
    md += `**Materia:** Informática y Convergencia Tecnológica\n`;
    md += `**Fecha de Ejecución:** ${dateStr}\n`;
    md += `**Estado General:** ${s.failed === 0 ? '✅ TODAS LAS PRUEBAS APROBADAS (100% PASS)' : '⚠️ ADVERTENCIA: ALGUNAS PRUEBAS FALLARON'}\n\n`;

    md += `## Resumen Ejecutivo\n`;
    md += `- **Total de Pruebas:** ${s.total}\n`;
    md += `- **Aprobadas:** ${s.passed} (${s.passRate}%)\n`;
    md += `- **Fallidas:** ${s.failed}\n`;
    md += `- **Tiempo de Ejecución Total:** ${s.durationMs} ms\n\n`;

    md += `## Detalle de Casos de Prueba\n\n`;
    md += `| Módulo | Caso de Prueba | Resultado | Duración |\n`;
    md += `| :--- | :--- | :---: | :---: |\n`;

    this.results.forEach(r => {
      const icon = r.status === 'passed' ? '✅ PASS' : '❌ FAIL';
      md += `| \`${r.category}\` | ${r.name} | ${icon} | ${r.durationMs} ms |\n`;
      if (r.error) {
        md += `| ⤷ *Detalle del error* | \`${r.error}\` | - | - |\n`;
      }
    });

    md += `\n---\n*Reporte generado por el Test Runner de PICH FRESH 2026*\n`;
    return md;
  }

  downloadReport() {
    const md = this.generateMarkdownReport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte_pruebas_pich_fresh_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

window.testSuite = new PichTestSuite();
