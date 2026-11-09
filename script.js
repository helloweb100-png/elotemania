/* ==========================================================================
   ELOTEMANIA · script.js
   Todo lo interactivo de la landing. Cada módulo está aislado con `seguro()`:
   si uno falla, el resto de la página sigue funcionando.
   Librerías opcionales (CDN): Three.js r128 (elote 3D) y Lenis 1.0.42 (scroll suave).
   Si no cargan, la página se ve y funciona completa.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Configuración (aquí viven los datos editables) ---------- */
  // Número de WhatsApp del negocio en formato wa.me: 52 + 10 dígitos. Es el ÚNICO lugar donde se escribe.
  const WHATSAPP_NUMERO = '526143839513';
  const ZONA_HORARIA = 'America/Chihuahua';
  const APERTURA_MIN = 19 * 60; // 7:00 pm
  const CIERRE_MIN = 5 * 60; // 5:00 am

  /* ---------- Utilidades ---------- */
  const $ = (selector, raiz = document) => raiz.querySelector(selector);
  const $$ = (selector, raiz = document) => Array.from(raiz.querySelectorAll(selector));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const punteroFino = window.matchMedia('(pointer: fine)').matches;
  let lenis = null;

  const seguro = (fn, nombre) => {
    try {
      fn();
    } catch (error) {
      console.warn('[Elotemania] módulo con problema: ' + nombre, error);
    }
  };

  // A partir de aquí se permiten los estados ocultos de las animaciones (solo si este script corre).
  root.classList.add('js-ready');
  if (!reduce) root.classList.add('fx');

  /* ---------- Motor de scroll: un solo bucle para todos los efectos ---------- */
  const motor = { y: window.scrollY, vh: window.innerHeight, vel: 0, tareas: [] };
  let rafId = 0;
  let ultimoY = motor.y;

  function cuadro() {
    rafId = 0;
    motor.y = window.scrollY;
    motor.vh = window.innerHeight;
    motor.vel = lerp(motor.vel, motor.y - ultimoY, 0.2);
    ultimoY = motor.y;
    for (const tarea of motor.tareas.slice()) {
      try {
        tarea(motor);
      } catch (error) {
        // Una tarea con problema se retira para no afectar a las demás.
        motor.tareas.splice(motor.tareas.indexOf(tarea), 1);
        console.warn('[Elotemania] tarea de scroll retirada', error);
      }
    }
    if (Math.abs(motor.vel) > 0.05) pedirCuadro();
  }

  function pedirCuadro() {
    if (!rafId) rafId = requestAnimationFrame(cuadro);
  }

  window.addEventListener('scroll', pedirCuadro, { passive: true });
  window.addEventListener('resize', pedirCuadro);
  window.addEventListener('load', pedirCuadro);

  /* ---------- WhatsApp ---------- */
  function urlWhatsApp(texto) {
    return 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(texto);
  }

  function abrirWhatsApp(texto) {
    const enlace = document.createElement('a');
    enlace.href = urlWhatsApp(texto);
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  }

  function initWhatsApp() {
    const enlaces = $$('[data-wa]');
    if (!WHATSAPP_NUMERO) {
      // Sin número: se ocultan con elegancia los botones y el envío.
      enlaces.forEach((a) => {
        a.hidden = true;
        a.style.display = 'none';
      });
      ['#formaEnviar', '#pedidoEnviar'].forEach((sel) => {
        const b = $(sel);
        if (b) b.style.display = 'none';
      });
      return;
    }
    enlaces.forEach((a) => {
      a.href = urlWhatsApp(a.dataset.waMsg || '¡Hola Elotemania!');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    const flotante = $('#waFlotante');
    if (flotante) {
      setTimeout(() => flotante.classList.add('is-abierto'), 6500);
      setTimeout(() => flotante.classList.remove('is-abierto'), 11000);
    }
  }

  /* ---------- Cargador (se va solo en menos de 2.5 s) ---------- */
  function initCargador() {
    const listo = () => root.classList.add('is-listo');
    const el = $('#cargador');
    // Respaldo extra: pase lo que pase, el contenido aparece.
    setTimeout(listo, 2600);
    if (!el) {
      listo();
      return;
    }
    const pct = $('#cargadorPct');
    const texto = $('#cargadorTexto');
    const frases = [
      [0, 'Calentando el elote…'],
      [30, 'Echándole el limón…'],
      [62, 'Poniéndole el chile…'],
      [92, '¡Listo, compa!'],
    ];
    const duracion = reduce ? 350 : 1500;
    const inicio = performance.now();
    let terminado = false;

    const cerrar = () => {
      if (terminado) return;
      terminado = true;
      if (pct) pct.textContent = '100';
      el.classList.add('is-fuera');
      listo();
      setTimeout(() => el.remove(), 900);
    };

    const paso = (ahora) => {
      const p = clamp((ahora - inicio) / duracion);
      const n = Math.round((1 - Math.pow(1 - p, 3)) * 100);
      if (pct) pct.textContent = String(n);
      const frase = frases.filter((f) => n >= f[0]).pop();
      if (frase && texto) texto.textContent = frase[1];
      if (p < 1) requestAnimationFrame(paso);
      else setTimeout(cerrar, 140);
    };

    requestAnimationFrame(paso);
    setTimeout(cerrar, 2200);
  }

  /* ---------- Navegación ---------- */
  function initNav() {
    const nav = $('#nav');
    const burger = $('#burger');
    const menu = $('#menuMovil');
    if (!nav) return;
    let abierto = false;
    let ultimo = window.scrollY;

    const alternar = (valor) => {
      abierto = valor;
      root.classList.toggle('menu-abierto', valor);
      if (burger) {
        burger.setAttribute('aria-expanded', String(valor));
        burger.setAttribute('aria-label', valor ? 'Cerrar menú' : 'Abrir menú');
      }
      if (lenis) {
        if (valor) lenis.stop();
        else lenis.start();
      }
    };

    if (burger) burger.addEventListener('click', () => alternar(!abierto));
    if (menu) $$('a', menu).forEach((a) => a.addEventListener('click', () => alternar(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && abierto) alternar(false);
    });
    window.addEventListener('resize', () => {
      if (abierto && window.innerWidth >= 900) alternar(false);
    });

    motor.tareas.push((m) => {
      nav.classList.toggle('is-scroll', m.y > 30);
      const delta = m.y - ultimo;
      if (!abierto) {
        if (m.y > 520 && delta > 6) nav.classList.add('is-oculto');
        else if (delta < -6 || m.y < 520) nav.classList.remove('is-oculto');
      }
      ultimo = m.y;
    });

    // Enlace activo según la sección visible
    const enlaces = $$('.nav__links a');
    if ('IntersectionObserver' in window && enlaces.length) {
      const io = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((en) => {
            if (!en.isIntersecting) return;
            enlaces.forEach((a) => a.classList.toggle('is-activo', a.getAttribute('href') === '#' + en.target.id));
          });
        },
        { rootMargin: '-45% 0px -50% 0px' }
      );
      ['carta', 'noche', 'experiencia', 'eventos', 'visitanos', 'contacto'].forEach((id) => {
        const sec = document.getElementById(id);
        if (sec) io.observe(sec);
      });
    }
  }

  function initAnclas() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const destino = document.querySelector(id);
      if (!destino) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(destino, { offset: -70 });
      else destino.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }

  /* ---------- Barra de progreso de lectura ---------- */
  function initProgreso() {
    const barra = $('#progresoBarra');
    if (!barra) return;
    motor.tareas.push((m) => {
      const total = root.scrollHeight - m.vh;
      barra.style.setProperty('--sp', total > 0 ? clamp(m.y / total).toFixed(4) : '0');
    });
  }

  /* ---------- Entradas al hacer scroll ---------- */
  function initReveal() {
    const elementos = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      elementos.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    elementos.forEach((el) => io.observe(el));
  }

  /* ---------- Titular del hero: palabras con máscara ---------- */
  function initTitular() {
    $$('[data-palabras]').forEach((linea, i) => {
      const interior = document.createElement('span');
      interior.className = 'pal';
      interior.style.setProperty('--i', String(i));
      while (linea.firstChild) interior.appendChild(linea.firstChild);
      linea.appendChild(interior);
    });
  }

  function initRotador() {
    const el = $('#rotador');
    if (!el || reduce) return;
    const frases = (el.dataset.frases || '').split('|').filter(Boolean);
    if (frases.length < 2) return;
    let i = 0;
    let n = frases[0].length;
    let borrando = true;
    const paso = () => {
      const frase = frases[i];
      if (borrando) {
        n -= 1;
        el.textContent = frase.slice(0, Math.max(n, 0));
        if (n <= 0) {
          borrando = false;
          i = (i + 1) % frases.length;
          setTimeout(paso, 260);
          return;
        }
        setTimeout(paso, 34);
      } else {
        n += 1;
        el.textContent = frase.slice(0, n);
        if (n >= frase.length) {
          borrando = true;
          setTimeout(paso, 1800);
          return;
        }
        setTimeout(paso, 72);
      }
    };
    setTimeout(paso, 3000);
  }

  /* ---------- Texto que se enciende palabra por palabra ---------- */
  function initScrub() {
    $$('[data-scrub]').forEach((parrafo) => {
      const palabras = [];
      const recorrer = (nodo) => {
        Array.from(nodo.childNodes).forEach((hijo) => {
          if (hijo.nodeType === 3) {
            const frag = document.createDocumentFragment();
            hijo.textContent.split(/(\s+)/).forEach((parte) => {
              if (parte === '' || /^\s+$/.test(parte)) {
                frag.appendChild(document.createTextNode(parte));
              } else {
                const s = document.createElement('span');
                s.className = 'sw';
                s.textContent = parte;
                palabras.push(s);
                frag.appendChild(s);
              }
            });
            hijo.replaceWith(frag);
          } else if (hijo.nodeType === 1) {
            recorrer(hijo);
          }
        });
      };
      recorrer(parrafo);
      if (reduce) {
        palabras.forEach((p) => p.classList.add('on'));
        return;
      }
      let previo = -1;
      motor.tareas.push((m) => {
        const r = parrafo.getBoundingClientRect();
        if (r.bottom < -300 || r.top > m.vh + 300) return;
        const p = clamp((m.vh * 0.84 - r.top) / (r.height + m.vh * 0.34));
        const n = Math.round(p * palabras.length);
        if (n === previo) return;
        previo = n;
        palabras.forEach((palabra, i) => palabra.classList.toggle('on', i < n));
      });
    });
  }

  /* ---------- Efectos ligados al scroll: hero, cinta ---------- */
  function initScrollHero() {
    const contenido = $('.hero__contenido');
    if (contenido && !reduce) {
      motor.tareas.push((m) => {
        if (m.y > m.vh * 1.3) return;
        const p = clamp(m.y / m.vh);
        contenido.style.transform = 'translate3d(0,' + (m.y * 0.16).toFixed(1) + 'px,0)';
        contenido.style.opacity = String((1 - p * 0.92).toFixed(3));
      });
    }
    const pistas = $$('[data-cinta]');
    if (pistas.length && !reduce) {
      motor.tareas.push((m) => {
        const k = Math.abs(m.vel) < 0.05 ? 1 : 1 + Math.min(Math.abs(m.vel) * 0.55, 6);
        pistas.forEach((pista) => {
          const animaciones = pista.getAnimations ? pista.getAnimations() : [];
          if (animaciones[0]) animaciones[0].playbackRate = k;
        });
      });
    }
  }

  /* ---------- Sección "La noche": cielo, luna y reloj ligados al scroll ---------- */
  function initNoche() {
    const sec = $('[data-noche]');
    if (!sec) return;
    const pista = $('.noche__pista', sec);
    const horaEl = $('#nocheHora');
    const ampmEl = $('#nocheAmpm');
    const pasos = $$('.paso', sec);
    const cont = $('#nocheEstrellas');

    if (cont) {
      const frag = document.createDocumentFragment();
      const total = window.innerWidth < 700 ? 46 : 92;
      for (let i = 0; i < total; i += 1) {
        const s = document.createElement('i');
        s.className = 'estrella';
        s.style.left = (Math.random() * 100).toFixed(1) + '%';
        s.style.top = (Math.random() * 100).toFixed(1) + '%';
        s.style.setProperty('--s', (1 + Math.random() * 2.2).toFixed(1) + 'px');
        s.style.setProperty('--t', (2 + Math.random() * 4).toFixed(1) + 's');
        s.style.setProperty('--dl', (-Math.random() * 5).toFixed(1) + 's');
        frag.appendChild(s);
      }
      cont.appendChild(frag);
    }

    // Colores del cielo según la hora (de 7 pm a 5 am)
    const claves = [
      { p: 0, a: [42, 26, 84], b: [255, 138, 61], glow: 0.55, est: 0.35 },
      { p: 0.3, a: [12, 11, 36], b: [34, 26, 86], glow: 0.15, est: 1 },
      { p: 0.6, a: [5, 5, 12], b: [11, 11, 36], glow: 0.05, est: 1 },
      { p: 0.85, a: [10, 10, 28], b: [38, 28, 84], glow: 0.12, est: 0.9 },
      { p: 1, a: [29, 26, 61], b: [255, 154, 82], glow: 0.6, est: 0.3 },
    ];
    const mezclar = (p) => {
      let i = 0;
      while (i < claves.length - 2 && p > claves[i + 1].p) i += 1;
      const A = claves[i];
      const B = claves[i + 1];
      const t = clamp((p - A.p) / (B.p - A.p));
      const mix = (x, y) => x.map((v, k) => Math.round(lerp(v, y[k], t)));
      return { a: mix(A.a, B.a), b: mix(A.b, B.b), glow: lerp(A.glow, B.glow, t), est: lerp(A.est, B.est, t) };
    };

    const umbrales = [0, 0.3, 0.6, 0.88];
    let pasoActual = -1;

    const aplicar = (p) => {
      const c = mezclar(p);
      sec.style.setProperty('--p', p.toFixed(4));
      sec.style.setProperty('--cielo-a', 'rgb(' + c.a.join(',') + ')');
      sec.style.setProperty('--cielo-b', 'rgb(' + c.b.join(',') + ')');
      sec.style.setProperty('--glow', c.glow.toFixed(3));
      sec.style.setProperty('--estrellas', c.est.toFixed(3));
      sec.style.setProperty('--ax', (12 + 76 * p).toFixed(2));
      sec.style.setProperty('--ay', (62 - 46 * Math.sin(Math.PI * p)).toFixed(2));

      const horas = 19 + 10 * p;
      const h = Math.floor(horas) % 24;
      const min = Math.min(59, Math.floor((horas % 1) * 60));
      const h12 = h % 12 === 0 ? 12 : h % 12;
      if (horaEl) horaEl.textContent = h12 + ':' + String(min).padStart(2, '0');
      if (ampmEl) ampmEl.textContent = h >= 12 ? 'PM' : 'AM';

      let idx = 0;
      umbrales.forEach((u, i) => {
        if (p >= u) idx = i;
      });
      if (idx !== pasoActual) {
        pasoActual = idx;
        pasos.forEach((el, i) => el.classList.toggle('is-activo', i === idx));
      }
    };

    motor.tareas.push((m) => {
      if (!root.classList.contains('fx') || !pista) return;
      const r = pista.getBoundingClientRect();
      if (r.bottom < -120 || r.top > m.vh + 120) return;
      const total = r.height - m.vh;
      if (total <= 0) return;
      aplicar(clamp(-r.top / total));
    });
  }

  /* ---------- "Encuéntranos": la foto se abre en grande ---------- */
  function initEncuentranos() {
    const sec = $('[data-enc]');
    if (!sec) return;
    const pista = $('.enc__pista', sec);
    const escenario = $('.enc__escenario', sec);
    if (!pista || !escenario) return;
    motor.tareas.push((m) => {
      if (!root.classList.contains('fx')) return;
      const r = pista.getBoundingClientRect();
      if (r.bottom < -120 || r.top > m.vh + 120) return;
      const total = r.height - m.vh;
      if (total <= 0) return;
      const crudo = clamp(-r.top / (total * 0.72));
      const suave = crudo * crudo * (3 - 2 * crudo);
      escenario.style.setProperty('--p', suave.toFixed(4));
    });
  }

  /* ---------- Inclinación 3D y botones magnéticos (solo con ratón) ---------- */
  function initTilt() {
    if (!punteroFino || reduce) return;
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.transform =
          'perspective(900px) rotateX(' + ((0.5 - y) * 9).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 12).toFixed(2) + 'deg)';
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = '';
      });
    });
    $$('.btn--magnetico').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        b.style.transform = 'translate(' + (x * 0.16).toFixed(1) + 'px,' + (y * 0.26).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', () => {
        b.style.transform = '';
      });
    });
  }

  /* ---------- Estado abierto / cerrado y reloj de 24 horas ---------- */
  function minutosEnChihuahua() {
    try {
      const partes = new Intl.DateTimeFormat('es-MX', {
        timeZone: ZONA_HORARIA,
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23',
      }).formatToParts(new Date());
      const h = Number(partes.find((p) => p.type === 'hour').value);
      const m = Number(partes.find((p) => p.type === 'minute').value);
      return (h % 24) * 60 + m;
    } catch (error) {
      const d = new Date();
      return d.getHours() * 60 + d.getMinutes();
    }
  }

  function duracion(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? h + ' h ' + m + ' min' : m + ' min';
  }

  function initEstado() {
    const actualizar = () => {
      const min = minutosEnChihuahua();
      const abierto = min >= APERTURA_MIN || min < CIERRE_MIN;
      let texto;
      if (abierto) {
        const restan = min >= APERTURA_MIN ? 1440 - min + CIERRE_MIN : CIERRE_MIN - min;
        texto = restan <= 90 ? 'Abierto ahora · cerramos en ' + duracion(restan) : 'Abierto ahora · hasta las 5:00 am';
      } else {
        texto = 'Cerrado ahora · abrimos a las 7:00 pm (en ' + duracion(APERTURA_MIN - min) + ')';
      }
      $$('[data-estado]').forEach((el) => {
        el.classList.toggle('is-cerrado', !abierto);
        const t = $('[data-estado-texto]', el);
        if (t) t.textContent = texto;
      });
      const mano = $('#relojMano');
      if (mano) mano.style.setProperty('--ang', ((min / 1440) * 360).toFixed(1) + 'deg');
    };
    actualizar();
    setInterval(actualizar, 30000);
  }

  /* ---------- Carta: pedido que se manda por WhatsApp ---------- */
  function initPedido() {
    const filas = $$('.item[data-id]');
    if (!filas.length) return;
    const formato = (n) => '$' + n.toLocaleString('es-MX');
    const lista = $('#pedidoLista');
    const totalEl = $('#pedidoTotal');
    const contador = $('#pedidoContador');
    const panel = $('#pedido');
    const enviar = $('#pedidoEnviar');
    const vaciar = $('#pedidoVaciar');
    const nombre = $('#pedidoNombre');
    const barra = $('#pedidoBarra');
    const barraCant = $('#barraCantidad');
    const barraTotal = $('#barraTotal');
    const productos = new Map();
    let totalMostrado = 0;
    let tween = 0;

    filas.forEach((li) => {
      productos.set(li.dataset.id, {
        nombre: li.dataset.nombre,
        precio: Number(li.dataset.precio),
        cant: 0,
        fila: li,
      });
    });

    const animarTotal = (hasta) => {
      cancelAnimationFrame(tween);
      const desde = totalMostrado;
      const t0 = performance.now();
      const paso = (ahora) => {
        const p = clamp((ahora - t0) / 420);
        const v = Math.round(lerp(desde, hasta, 1 - Math.pow(1 - p, 3)));
        if (totalEl) totalEl.textContent = formato(v);
        if (barraTotal) barraTotal.textContent = formato(v);
        if (p < 1) tween = requestAnimationFrame(paso);
        else totalMostrado = hasta;
      };
      tween = requestAnimationFrame(paso);
    };

    let panelVisible = false;
    let cartaVisible = false;
    const actualizarBarra = (cantidad) => {
      if (!barra) return;
      const mostrar = cantidad > 0 && cartaVisible && !panelVisible;
      barra.classList.toggle('is-visible', mostrar);
      barra.setAttribute('aria-hidden', String(!mostrar));
    };
    let cantidadTotal = 0;

    const pintar = () => {
      let total = 0;
      let cantidad = 0;
      if (lista) lista.innerHTML = '';
      productos.forEach((p) => {
        if (p.cant > 0) {
          total += p.precio * p.cant;
          cantidad += p.cant;
          if (lista) {
            const li = document.createElement('li');
            const izq = document.createElement('span');
            izq.textContent = p.cant + ' × ' + p.nombre;
            const der = document.createElement('b');
            der.textContent = formato(p.precio * p.cant);
            li.append(izq, der);
            lista.appendChild(li);
          }
        }
        p.fila.classList.toggle('is-sel', p.cant > 0);
        const valor = $('.cant__valor', p.fila);
        if (valor) valor.textContent = String(p.cant);
      });
      cantidadTotal = cantidad;
      if (contador) contador.textContent = String(cantidad);
      if (barraCant) barraCant.textContent = String(cantidad);
      if (panel) panel.classList.toggle('tiene-items', cantidad > 0);
      if (enviar) enviar.disabled = cantidad === 0;
      animarTotal(total);
      actualizarBarra(cantidad);
    };

    filas.forEach((li) => {
      const item = productos.get(li.dataset.id);
      const mas = $('.cant__mas', li);
      const menos = $('.cant__menos', li);
      if (mas) {
        mas.addEventListener('click', () => {
          item.cant = Math.min(item.cant + 1, 30);
          pintar();
        });
      }
      if (menos) {
        menos.addEventListener('click', () => {
          item.cant = Math.max(item.cant - 1, 0);
          pintar();
        });
      }
    });

    if (vaciar) {
      vaciar.addEventListener('click', () => {
        productos.forEach((p) => {
          p.cant = 0;
        });
        pintar();
      });
    }

    if (enviar) {
      enviar.addEventListener('click', () => {
        const lineas = [];
        let total = 0;
        productos.forEach((p) => {
          if (p.cant > 0) {
            lineas.push('• ' + p.cant + ' × ' + p.nombre + ' — ' + formato(p.precio * p.cant));
            total += p.precio * p.cant;
          }
        });
        if (!lineas.length) return;
        const quien = nombre && nombre.value.trim() ? 'Soy ' + nombre.value.trim() + '. ' : '';
        abrirWhatsApp(
          '¡Hola Elotemania! 👑\n' +
            quien +
            'Quiero hacer este pedido:\n\n' +
            lineas.join('\n') +
            '\n\nTotal estimado: ' +
            formato(total) +
            '\n\n¿Me confirman el total final, el tiempo y la forma de entrega? ¡Gracias!'
        );
      });
    }

    // La barra móvil solo se muestra mientras estás en la carta y el resumen no está a la vista
    if ('IntersectionObserver' in window) {
      const ioCarta = new IntersectionObserver((e) => {
        cartaVisible = e[0].isIntersecting;
        actualizarBarra(cantidadTotal);
      });
      const seccion = $('#carta');
      if (seccion) ioCarta.observe(seccion);
      const ioPanel = new IntersectionObserver((e) => {
        panelVisible = e[0].isIntersecting;
        actualizarBarra(cantidadTotal);
      });
      if (panel) ioPanel.observe(panel);
    }

    pintar();
  }

  function initChips() {
    const chips = $('.carta__chips');
    if (!chips || !('IntersectionObserver' in window)) return;
    const enlaces = $$('a', chips);
    const io = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((en) => {
          if (!en.isIntersecting) return;
          enlaces.forEach((a) => {
            const activo = a.getAttribute('href') === '#' + en.target.id;
            a.classList.toggle('is-activo', activo);
            if (activo) chips.scrollTo({ left: Math.max(a.offsetLeft - 24, 0), behavior: 'smooth' });
          });
        });
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    $$('.cat').forEach((c) => io.observe(c));
  }

  /* ---------- Visor de la carta original ---------- */
  function initVisor() {
    const dialogo = $('#visor');
    const abrir = $('#abrirCarta');
    const cerrar = $('#cerrarVisor');
    if (!dialogo || !abrir) return;
    abrir.addEventListener('click', () => {
      if (typeof dialogo.showModal === 'function') {
        dialogo.showModal();
        if (lenis) lenis.stop();
      } else {
        window.open('assets/img/carta-menu.jpg', '_blank', 'noopener');
      }
    });
    if (cerrar) cerrar.addEventListener('click', () => dialogo.close());
    dialogo.addEventListener('close', () => {
      if (lenis) lenis.start();
    });
    dialogo.addEventListener('click', (e) => {
      if (e.target === dialogo) dialogo.close();
    });
  }

  /* ---------- Formulario de contacto -> WhatsApp ---------- */
  function initFormulario() {
    const forma = $('#formaContacto');
    if (!forma) return;
    const nombre = $('#campoNombre');
    const mensaje = $('#campoMensaje');
    const marcar = (campo, error) => {
      const contenedor = campo.closest('.campo');
      if (contenedor) contenedor.classList.toggle('is-error', error);
    };
    [nombre, mensaje].forEach((campo) => campo.addEventListener('input', () => marcar(campo, false)));

    forma.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = nombre.value.trim();
      const m = mensaje.value.trim();
      marcar(nombre, !n);
      marcar(mensaje, !m);
      if (!n || !m) {
        (!n ? nombre : mensaje).focus();
        return;
      }
      const elegido = forma.querySelector('input[name="motivo"]:checked');
      const motivo = elegido ? elegido.value : 'Quiero hacer un pedido';
      abrirWhatsApp('¡Hola Elotemania! 👑\nSoy ' + n + '.\n' + motivo + '.\n\n' + m);
    });
  }

  /* ---------- Partículas del hero (elotitos que van subiendo) ---------- */
  function initParticulas() {
    const lienzo = $('#particulas');
    const hero = $('.hero');
    if (!lienzo || !hero || reduce) return;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return;
    let ancho = 0;
    let alto = 0;
    let visible = true;
    let raf = 0;
    const particulas = [];
    const raton = { x: -999, y: -999 };

    // El dibujo del elote se pinta una sola vez en un lienzo aparte; cada partícula solo lo copia.
    const sprite = document.createElement('canvas');
    sprite.width = 56;
    sprite.height = 103;
    let spriteListo = false;
    const dibujoElote = new Image();
    dibujoElote.onload = () => {
      sprite.getContext('2d').drawImage(dibujoElote, 0, 0, 56, 103);
      spriteListo = true;
    };
    dibujoElote.src = 'assets/img/elote-burbuja.svg';

    const crear = (inicio) => ({
      x: Math.random() * ancho,
      y: inicio ? Math.random() * alto : alto + 40,
      tam: 16 + Math.random() * 16, // alto del elotito en px
      vy: 0.18 + Math.random() * 0.6,
      fase: Math.random() * 6.28,
      osc: 0.3 + Math.random() * 0.9,
      giro: (Math.random() - 0.5) * 0.8,
    });

    const medir = () => {
      const r = lienzo.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = r.width;
      alto = r.height;
      lienzo.width = Math.round(ancho * dpr);
      lienzo.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const total = ancho < 700 ? 14 : 30;
      while (particulas.length < total) particulas.push(crear(true));
      particulas.length = total;
    };

    const dibujar = (t) => {
      ctx.clearRect(0, 0, ancho, alto);
      for (const p of particulas) {
        p.y -= p.vy;
        p.x += Math.sin(t * 0.001 * p.osc + p.fase) * 0.35;
        const dx = p.x - raton.x;
        const dy = p.y - raton.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 19600 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / 140) * 1.9;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
        if (p.y < -40) Object.assign(p, crear(false));
        const alfa = clamp(Math.min(p.y / 90, (alto - p.y) / 60, 1) + 0.15, 0, 1);
        if (!spriteListo) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro + Math.sin(t * 0.001 * p.osc + p.fase) * 0.35);
        ctx.globalAlpha = alfa * 0.75;
        ctx.drawImage(sprite, (-p.tam * 0.545) / 2, -p.tam / 2, p.tam * 0.545, p.tam);
        ctx.restore();
      }
    };

    const bucle = (t) => {
      dibujar(t);
      raf = visible && !document.hidden ? requestAnimationFrame(bucle) : 0;
    };
    const arrancar = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(bucle);
    };

    medir();
    window.addEventListener('resize', medir);
    hero.addEventListener('pointermove', (e) => {
      const r = lienzo.getBoundingClientRect();
      raton.x = e.clientX - r.left;
      raton.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => {
      raton.x = -999;
      raton.y = -999;
    });
    document.addEventListener('visibilitychange', arrancar);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => {
        visible = e[0].isIntersecting;
        arrancar();
      }).observe(hero);
    }
    arrancar();
  }

  /* ---------- Elote 3D con Three.js (si la librería no carga, queda el elote vectorial) ---------- */
  function initElote3D() {
    const T = window.THREE;
    const anfitrion = $('#escena3d');
    const lienzo = $('#lienzo3d');
    if (!T || !anfitrion || !lienzo) return;

    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: (window.devicePixelRatio || 1) < 2, alpha: true, powerPreference: 'high-performance' });
    } catch (error) {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const escena = new T.Scene();
    const camara = new T.PerspectiveCamera(30, 1, 0.1, 100);
    camara.position.set(0, 0.4, 21);

    escena.add(new T.HemisphereLight(0xfff1c9, 0x3a1d00, 0.85));
    const luzClave = new T.DirectionalLight(0xfff2d6, 1.15);
    luzClave.position.set(-5, 7, 9);
    escena.add(luzClave);
    const luzContra = new T.DirectionalLight(0xff4a2a, 1.0);
    luzContra.position.set(7, 2, -6);
    escena.add(luzContra);
    const luzRelleno = new T.PointLight(0xffc21a, 0.9, 40);
    luzRelleno.position.set(4, -3, 7);
    escena.add(luzRelleno);

    const ALTO = 6.4;
    const RADIO = 1.18;
    const perfil = (t) => {
      const base = t < 0.12 ? 0.78 + (t / 0.12) * 0.22 : 1;
      const punta = t > 0.72 ? Math.cos(((t - 0.72) / 0.28) * Math.PI * 0.46) : 1;
      const panza = 0.94 + 0.06 * Math.sin(Math.PI * t);
      return Math.max(0.18, base * punta * panza);
    };

    const elote = new T.Group();
    const cuerpo = new T.Group();
    elote.add(cuerpo);

    // Núcleo de la mazorca
    const puntos = [];
    for (let i = 0; i <= 24; i += 1) {
      const t = i / 24;
      puntos.push(new T.Vector2(RADIO * perfil(t) * 0.86, (t - 0.5) * ALTO));
    }
    cuerpo.add(new T.Mesh(new T.LatheGeometry(puntos, 28), new T.MeshStandardMaterial({ color: 0xc98a00, roughness: 0.7 })));

    // Granos (con chile y queso en algunos)
    const FILAS = 30;
    const COLUMNAS = 22;
    const granos = new T.InstancedMesh(
      new T.SphereGeometry(0.2, 12, 10),
      new T.MeshStandardMaterial({ roughness: 0.42, metalness: 0, emissive: new T.Color(0x3a2200), emissiveIntensity: 0.42 }),
      FILAS * COLUMNAS
    );
    const matriz = new T.Matrix4();
    const cuaternion = new T.Quaternion();
    const posicion = new T.Vector3();
    const escala = new T.Vector3();
    const euler = new T.Euler();
    const color = new T.Color();
    let k = 0;
    for (let f = 0; f < FILAS; f += 1) {
      const t = f / (FILAS - 1);
      const y = (t - 0.5) * ALTO;
      const radio = RADIO * perfil(t);
      for (let c = 0; c < COLUMNAS; c += 1) {
        const a = ((c + (f % 2) * 0.5) / COLUMNAS) * Math.PI * 2;
        posicion.set(Math.cos(a) * radio, y, Math.sin(a) * radio);
        euler.set(0, Math.PI / 2 - a, 0);
        cuaternion.setFromEuler(euler);
        const s = clamp(radio / RADIO, 0.6, 1);
        const j = 0.92 + Math.random() * 0.16;
        escala.set(1.05 * s * j, 0.96 * j, 0.95 * j);
        matriz.compose(posicion, cuaternion, escala);
        granos.setMatrixAt(k, matriz);
        const azar = Math.random();
        if (azar < 0.1) color.setHex(0xd2301f);
        else if (azar < 0.16) color.setHex(0xfff0cc);
        else color.setHSL(0.118 + Math.random() * 0.018, 0.95, 0.5 + Math.random() * 0.08);
        if (granos.setColorAt) granos.setColorAt(k, color);
        k += 1;
      }
    }
    granos.instanceMatrix.needsUpdate = true;
    if (granos.instanceColor) granos.instanceColor.needsUpdate = true;
    cuerpo.add(granos);

    // Hojas de elote en la base
    const hoja = (largo, ancho, curva, colorHoja) => {
      const g = new T.PlaneGeometry(ancho, largo, 8, 20);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i += 1) {
        const x = p.getX(i);
        const v = p.getY(i) / largo + 0.5;
        const w = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.75)), 0.8);
        const xx = x * w;
        p.setXYZ(i, xx, -v * largo, curva * v * v + xx * xx * 0.7);
      }
      g.computeVertexNormals();
      return new T.Mesh(g, new T.MeshStandardMaterial({ color: colorHoja, roughness: 0.7, side: T.DoubleSide }));
    };
    const verdes = [0x3f9a3a, 0x58b046, 0x2f7f33, 0x4aa43f, 0x68c04a];
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const h = hoja(2.5 + Math.random() * 0.5, 2.0, 1.2 + Math.random() * 0.7, verdes[i]);
      h.position.set(Math.cos(a) * RADIO * 0.55, -ALTO / 2 + 0.5, Math.sin(a) * RADIO * 0.55);
      h.rotation.y = Math.PI / 2 - a;
      cuerpo.add(h);
    }

    cuerpo.position.y = 1.0;
    elote.rotation.z = -0.42;
    elote.rotation.x = 0.12;
    escena.add(elote);

    // Polvo de chile flotando alrededor
    const TOTAL_POLVO = 160;
    const arreglo = new Float32Array(TOTAL_POLVO * 3);
    for (let i = 0; i < TOTAL_POLVO; i += 1) {
      const r = 2.3 + Math.random() * 2.4;
      const a = Math.random() * Math.PI * 2;
      arreglo[i * 3] = Math.cos(a) * r;
      arreglo[i * 3 + 1] = (Math.random() - 0.5) * 8.4;
      arreglo[i * 3 + 2] = Math.sin(a) * r;
    }
    const geoPolvo = new T.BufferGeometry();
    geoPolvo.setAttribute('position', new T.BufferAttribute(arreglo, 3));
    const polvo = new T.Points(
      geoPolvo,
      new T.PointsMaterial({ color: 0xff6a3a, size: 0.14, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending })
    );
    escena.add(polvo);

    // Tamaño
    let detenido = false;
    const ajustar = () => {
      if (detenido) return;
      // clientWidth/clientHeight no se alteran por la animación de entrada (scale) del contenedor
      const ancho = anfitrion.clientWidth;
      const alto = anfitrion.clientHeight;
      if (ancho < 10 || alto < 10) return;
      renderer.setSize(ancho, alto, false);
      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();
    };
    ajustar();
    if ('ResizeObserver' in window) new ResizeObserver(ajustar).observe(anfitrion);
    else window.addEventListener('resize', ajustar);

    const objetivo = { x: 0, y: 0 };
    const actual = { x: 0, y: 0 };
    if (punteroFino) {
      window.addEventListener('pointermove', (e) => {
        objetivo.x = (e.clientX / window.innerWidth - 0.5) * 2;
        objetivo.y = (e.clientY / window.innerHeight - 0.5) * 2;
      });
    }

    const reloj = new T.Clock();
    let visible = true;
    let raf = 0;

    // Vigilante de rendimiento: si el equipo no aguanta la escena, baja la resolución solo
    // y, si aun así va lento, deja el elote vectorial (el de respaldo) en lugar de trabarse.
    let ventanaInicio = 0;
    let cuadros = 0;
    let calentar = 3; // los primeros cuadros (compilar shaders) no cuentan
    let lentos = 0;
    const vigilar = (ahora) => {
      if (calentar > 0) {
        calentar -= 1;
        return;
      }
      if (!ventanaInicio) {
        ventanaInicio = ahora;
        cuadros = 0;
        return;
      }
      cuadros += 1;
      const duracionVentana = ahora - ventanaInicio;
      if (duracionVentana < 1500) return;
      const promedio = duracionVentana / cuadros; // ms por cuadro
      ventanaInicio = ahora;
      cuadros = 0;
      lentos = promedio > 45 ? lentos + 1 : 0; // menos de ~22 cuadros/s
      if (lentos < 2) return;
      lentos = 0;
      if (renderer.getPixelRatio() > 1) {
        renderer.setPixelRatio(1);
      } else {
        detenido = true;
        anfitrion.classList.remove('is-3d');
        renderer.dispose();
      }
    };
    const pintar = () => {
      const t = reloj.getElapsedTime();
      actual.x += (objetivo.x - actual.x) * 0.05;
      actual.y += (objetivo.y - actual.y) * 0.05;
      const giroScroll = window.scrollY * 0.004;
      elote.rotation.y = t * 0.55 + giroScroll + actual.x * 0.5;
      elote.rotation.x = 0.12 + actual.y * 0.22;
      elote.rotation.z = -0.42 + actual.x * 0.1;
      elote.position.y = Math.sin(t * 1.1) * 0.18;
      polvo.rotation.y = -t * 0.18;
      polvo.position.y = Math.sin(t * 0.7) * 0.2;
      renderer.render(escena, camara);
    };
    const bucle = (ahora) => {
      pintar();
      vigilar(ahora);
      raf = visible && !document.hidden && !detenido ? requestAnimationFrame(bucle) : 0;
      if (!raf) ventanaInicio = 0; // en pausa: la medición se reinicia al volver
    };
    const arrancar = () => {
      if (!raf && visible && !document.hidden && !detenido) raf = requestAnimationFrame(bucle);
    };

    if (reduce) {
      elote.rotation.y = 0.7;
      renderer.render(escena, camara);
      window.addEventListener('resize', () => {
        ajustar();
        renderer.render(escena, camara);
      });
    } else {
      document.addEventListener('visibilitychange', arrancar);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((e) => {
          visible = e[0].isIntersecting;
          arrancar();
        }).observe(anfitrion);
      }
      arrancar();
    }
    anfitrion.classList.add('is-3d');
  }

  /* ---------- Scroll suave con Lenis (si la librería no carga, se usa el scroll normal) ---------- */
  function initLenis() {
    if (reduce || typeof window.Lenis !== 'function') return;
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.95 });
    const bucle = (t) => {
      lenis.raf(t);
      requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
    lenis.on('scroll', pedirCuadro);
  }

  /* ---------- Arranque ---------- */
  seguro(initCargador, 'cargador');
  seguro(initWhatsApp, 'whatsapp');
  seguro(initTitular, 'titular');
  seguro(initReveal, 'reveal');
  seguro(initNav, 'nav');
  seguro(initAnclas, 'anclas');
  seguro(initProgreso, 'progreso');
  seguro(initRotador, 'rotador');
  seguro(initScrub, 'scrub');
  seguro(initScrollHero, 'hero');
  seguro(initNoche, 'noche');
  seguro(initEncuentranos, 'encuentranos');
  seguro(initTilt, 'tilt');
  seguro(initEstado, 'estado');
  seguro(initPedido, 'pedido');
  seguro(initChips, 'chips');
  seguro(initVisor, 'visor');
  seguro(initFormulario, 'formulario');
  seguro(initParticulas, 'particulas');
  pedirCuadro();

  // Las librerías (Three.js y Lenis) se cargan con defer después de este archivo:
  // cuando se dispara DOMContentLoaded ya están disponibles (o no, si la CDN falló).
  let libreriasIniciadas = false;
  const iniciarLibrerias = () => {
    if (libreriasIniciadas) return;
    libreriasIniciadas = true;
    seguro(initElote3D, 'elote3d');
    seguro(initLenis, 'lenis');
  };
  // Un script con defer se ejecuta con readyState "interactive", antes de DOMContentLoaded
  // y antes que los que van después en el HTML. Por eso se espera a ese evento.
  if (document.readyState === 'complete') iniciarLibrerias();
  else {
    document.addEventListener('DOMContentLoaded', iniciarLibrerias);
    window.addEventListener('load', iniciarLibrerias);
  }
})();
