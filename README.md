# 🛒 Proyecto PICH – Lista de Compras Inteligente

> **Aplicación Web Progresiva (PWA)** para la gestión y optimización de compras y control riguroso de presupuesto familiar.  
> Diseñada bajo la línea temática de **Informática y Convergencia Tecnológica**, optimizada para ejecutarse en el cliente (Client-Side Edge) y desplegable directamente en **GitHub Pages** con **cero costo de servidor (cero VPS)**.

**Autor:** Oliver Stid Camacho Diaz  
**Línea Académica:** Informática y Convergencia Tecnológica  
**Estado:** Prototipo Funcional de Alto Impacto (v2.0)  

---

## 🌟 Demostración y Despliegue en GitHub Pages

Esta aplicación es 100% estática (HTML5, CSS3 Vanilla, JavaScript Modular ES6+), por lo que **no requiere ningún servidor VPS, Node.js en backend ni base de datos remota**:

1. Sube este repositorio a tu cuenta de GitHub.
2. Ve a la pestaña **Settings** (Configuración) del repositorio.
3. En la barra lateral izquierda, selecciona **Pages**.
4. En **Build and deployment > Source**, selecciona **Deploy from a branch**.
5. Escoge la rama `main` (o `master`) y la carpeta `/ (root)`.
6. Haz clic en **Save**. En un par de minutos, GitHub te proporcionará una URL pública y segura con HTTPS (ej. `https://tu-usuario.github.io/Informatica-y-convergencia/`).

---

## 🚀 Solución Integral a las Falencias Identificadas

| Falencia Detectada en el Documento Inicial | Solución Implementada en esta Versión |
| :--- | :--- |
| **Persistencia Inexistente** (pérdida de datos al refrescar el navegador) | **Persistencia continua reactiva mediante `localStorage`**: Todos los ítems, precios, cantidades, estados de compra, presupuesto asignado e historiales se guardan automáticamente. Además, incluye herramientas de **Exportación e Importación de copias de seguridad en JSON y hojas de cálculo CSV para Excel**. |
| **Uso del Término "Inteligente" sin Tecnologías Convergentes** | **Integración real de tecnologías convergentes del navegador**: <br>1. **Reconocimiento de Voz y NLP en Español**: Con Web Speech API, dictado como *"Agregar 2 kilos de arroz a 4800 pesos"*, tokenizando automáticamente nombre, cantidad, unidad y precio.<br>2. **Escáner Óptico de Códigos de Barras**: Acceso a la cámara del celular con la API nativa `BarcodeDetector` (EAN-13, UPC) y catálogo de reconocimiento rápido.<br>3. **Motor Heurístico de Reposición**: Analiza el historial de compras previas y sesiones finalizadas para sugerir productos que suelen faltar en el hogar antes de ir al supermercado.<br>4. **Monitoreo de Inflación y Trazabilidad de Precios**: Detecta alzas y ofertas comparando el precio unitario ingresado con compras anteriores.<br>5. **Optimizador de Presupuesto**: Consejos dinámicos de ahorro y reajuste en tiempo real cuando el total supera el presupuesto. |
| **Ausencia de Diseño Responsivo y Móvil** | **Diseño Mobile-First adaptativo**: Diseñado pensando en la experiencia táctil dentro del supermercado con una sola mano. Incluye **barra de navegación ergonómica inferior**, botones táctiles accesibles (WCAG AA), modo oscuro/claro y capacidad **PWA (Progressive Web App)** con Service Worker para funcionar **100% offline sin señal de internet**. |
| **Falta de Estructura de Documentación Académica** | Elaboración del documento formal completo [`DOCUMENTACION_ACADEMICA.md`](./DOCUMENTACION_ACADEMICA.md), con **justificación por niveles (Profesional, Tecnológico y Social)**, **marco metodológico ágil (Scrum/Kanban)**, historias de usuario en formato Gherkin y **matrices de pruebas formales**. |

---

## 🛠️ Tecnologías y Arquitectura

- **Frontend Core:** HTML5 Semántico, CSS3 Moderno (Custom Properties, Flexbox, Grid, Glassmorphism, Microanimaciones).
- **Lógica e Inteligencia:** JavaScript ES6+ Modular sin librerías externas pesadas (carga instantánea).
- **Web APIs Convergentes:**
  - `SpeechRecognition` / `webkitSpeechRecognition` (Web Speech API).
  - `BarcodeDetector` & `MediaDevices.getUserMedia` (Visión artificial por cámara).
  - `LocalStorage API` & `Blob/FileReader API` (Persistencia y copias de seguridad).
  - `Service Worker & Cache API` (Operación offline PWA).

---

## 📁 Estructura del Proyecto

```
Informatica y convergencia/
├── index.html                   # Página principal interactiva con modales
├── manifest.json                # Manifiesto PWA para instalación móvil
├── sw.js                        # Service Worker para funcionamiento sin conexión
├── css/
│   └── styles.css               # Sistema de diseño responsivo y tema visual
├── js/
│   ├── categories.js            # Catálogo base y clasificador heurístico
│   ├── storage.js               # Gestor de persistencia LocalStorage y backups
│   ├── intelligence.js          # Motor de voz NLP, escáner, recomendaciones y presupuesto
│   └── app.js                   # Controlador principal e interacciones de la UI
├── DOCUMENTACION_ACADEMICA.md   # Documento académico universitario formal
├── Proyecto_PICH_Lista_de_Compras_Inteligente.pdf # Propuesta inicial de referencia
└── README.md                    # Este archivo de presentación
```

---

## 📱 Cómo Instalar la Aplicación en el Celular (PWA)

1. Abre el enlace de GitHub Pages en **Google Chrome** (Android) o **Safari** (iOS).
2. En Android: Toca el menú de tres puntos `⋮` y selecciona **"Agregar a la pantalla principal"** o **"Instalar aplicación"**.
3. En iPhone: Toca el botón **Compartir** y pulsa **"Agregar al inicio"**.
4. ¡Listo! Se creará un icono directo en tu pantalla que abrirá la aplicación a pantalla completa, funcionando incluso sin datos móviles dentro de subterráneos o hipermercados.

---

## 📄 Documentación Universitaria Completa

Para revisar los apartados analíticos formales, el marco metodológico detallado, las matrices de pruebas (unitarias, integración y usabilidad) y la justificación académica estructurada, consulta:  
👉 **[DOCUMENTACION_ACADEMICA.md](./DOCUMENTACION_ACADEMICA.md)**
