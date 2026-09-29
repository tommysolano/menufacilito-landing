document.documentElement.classList.add('js');

// Testimonios de clientes REALES (con su permiso). La sección aparece sola cuando hay al menos uno.
// Formato: { name: 'Andrea V.', business: 'Nombre del restaurante', rating: 5, text: 'Lo que dijo el cliente.' }
const TESTIMONIALS = [];

document.addEventListener('DOMContentLoaded', () => {

    // --- Reveal on Scroll ---
    const revealElements = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -80px 0px' });
        revealElements.forEach(el => observer.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('active'));
    }

    // --- Header shadow on scroll ---
    const header = document.querySelector('.main-header');
    // Dos umbrales distintos para que no alterne justo en el límite
    const onScroll = () => {
        const y = window.scrollY;
        if (y > 60) header.classList.add('scrolled');
        else if (y < 20) header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // --- Mobile menu toggle ---
    const toggle = document.querySelector('.mobile-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    if (toggle && mobileNav) {
        const setMenu = open => {
            toggle.classList.toggle('active', open);
            mobileNav.classList.toggle('active', open);
            toggle.setAttribute('aria-expanded', String(open));
        };
        toggle.addEventListener('click', () => setMenu(!mobileNav.classList.contains('active')));
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => setMenu(false));
        });
    }

    // --- Marquee: clone track for seamless looping ---
    const track = document.querySelector('.marquee-track');
    if (track) {
        const clone = track.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.parentNode.appendChild(clone);
    }

    // Fade an <img> out, swap its source, fade it back in
    function swapImage(img, src, alt) {
        if (!img || img.getAttribute('src') === src) return;
        img.classList.add('is-fading');
        setTimeout(() => {
            img.src = src;
            img.alt = alt;
            img.onload = () => img.classList.remove('is-fading');
            if (img.complete) img.classList.remove('is-fading');
        }, 200);
    }

    // --- Funciones: tabs ---
    const featureTabs = document.querySelectorAll('.feature-tab');
    const featureScreen = document.getElementById('feature-screen');
    featureTabs.forEach(tab => {
        new Image().src = tab.dataset.screen;
        tab.addEventListener('click', () => {
            featureTabs.forEach(t => {
                t.classList.toggle('active', t === tab);
                t.setAttribute('aria-selected', String(t === tab));
            });
            swapImage(featureScreen, tab.dataset.screen, tab.dataset.alt);
        });
    });

    // --- Como funciona: steps ---
    const stepScreens = [
        null, // paso 1 muestra la tarjeta QR
        { img: 'img/screens/pedido-paso2.webp', alt: 'Cliente eligiendo platos en el menú digital' },
        { img: 'img/screens/pedido-paso3.webp', alt: 'Cliente revisando y confirmando su pedido' },
        { img: 'img/screens/pedido-paso4.webp', alt: 'Confirmación de pedido recibido' }
    ];
    const steps = document.querySelectorAll('.step');
    const stepQr = document.getElementById('step-qr');
    const stepPhone = document.getElementById('step-phone');
    const stepImg = document.getElementById('step-img');
    stepScreens.forEach(s => { if (s) new Image().src = s.img; });

    steps.forEach(step => {
        step.addEventListener('click', () => {
            const index = Number(step.dataset.step);
            steps.forEach(s => s.classList.toggle('active', s === step));
            const screen = stepScreens[index];
            stepQr.hidden = !!screen;
            stepPhone.hidden = !screen;
            // pasos 3 y 4 muestran un modal: la barra de estado también se oscurece
            stepPhone.classList.toggle('dimmed', index >= 2);
            if (screen) swapImage(stepImg, screen.img, screen.alt);
        });
    });

    // --- WhatsApp ---
    const widget = document.getElementById('wa-widget');
    const waPhone = widget ? widget.dataset.phone : '';
    const openWhatsApp = text => {
        const url = 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(text);
        window.open(url, '_blank', 'noopener');
    };

    // --- Agenda una demo ---
    // Debe coincidir con CONFIG en google-apps-script/Agenda.gs
    const SCHEDULE = {
        timezone: 'America/Guayaquil',
        utcOffset: '-05:00',
        durationMin: 30,
        stepMin: 30,
        workDays: [1, 2, 3, 4, 5, 6, 7], // 1 = lunes ... 7 = domingo
        start: '09:00',
        end: '18:00',
        breaks: [['13:00', '14:00']],
        minNoticeHours: 3,
        maxDaysAhead: 365
    };
    const scheduler = document.getElementById('scheduler');
    const schedulerApi = scheduler ? initScheduler(scheduler) : null;

    function initScheduler(root) {
        const endpoint = root.dataset.endpoint.trim();
        const $ = id => document.getElementById(id);
        const els = {
            month: $('cal-month'), prev: $('cal-prev'), next: $('cal-next'), days: $('cal-days'),
            slotsTitle: $('slots-title'), slots: $('slots'), slotError: $('sch-slot-error'),
            cont: $('sch-continue'), form: $('sch-form'), error: $('sch-error'), submit: $('sch-submit'),
            doneTitle: $('done-title'), doneText: $('done-text'), doneWa: $('done-whatsapp')
        };

        const pad = n => String(n).padStart(2, '0');
        const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const fmtTime = min => pad(Math.floor(min / 60)) + ':' + pad(min % 60);
        const isoDate = (y, m, d) => y + '-' + pad(m + 1) + '-' + pad(d);
        const slotStart = (dateStr, min) => new Date(dateStr + 'T' + fmtTime(min) + ':00' + SCHEDULE.utcOffset);
        const longDate = dateStr => new Date(dateStr + 'T12:00:00')
            .toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeRange = min => fmtTime(min) + ' – ' + fmtTime(min + SCHEDULE.durationMin) + ' (hora de Ecuador)';

        // "Hoy" según la hora de Ecuador, no la del visitante
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: SCHEDULE.timezone }).format(new Date());
        const [ty, tm, td] = todayStr.split('-').map(Number);
        const lastStr = (() => { const d = new Date(ty, tm - 1, td + SCHEDULE.maxDaysAhead); return isoDate(d.getFullYear(), d.getMonth(), d.getDate()); })();

        let busy = [];
        let live = false;                 // se consulta el calendario solo cuando la sección está por verse
        const loadedMonths = new Set();   // meses 'YYYY-MM' ya consultados
        const pendingMonths = new Map();
        const monthKey = (y, m) => y + '-' + pad(m + 1);
        const isLoaded = key => !endpoint || loadedMonths.has(key);
        let viewYear = ty;
        let viewMonth = tm - 1;
        let selectedDate = null;
        let selectedMin = null;
        let lastData = null;

        $('sch-duration').textContent = SCHEDULE.durationMin;

        function daySlots(dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
            const weekday = new Date(y, m - 1, d).getDay() || 7;
            if (!SCHEDULE.workDays.includes(weekday)) return [];
            const earliest = Date.now() + SCHEDULE.minNoticeHours * 36e5;
            const slots = [];
            for (let t = toMin(SCHEDULE.start); t + SCHEDULE.durationMin <= toMin(SCHEDULE.end); t += SCHEDULE.stepMin) {
                const end = t + SCHEDULE.durationMin;
                if (SCHEDULE.breaks.some(([a, b]) => t < toMin(b) && end > toMin(a))) continue;
                const s = slotStart(dateStr, t).getTime();
                const e = s + SCHEDULE.durationMin * 60000;
                if (s < earliest) continue;
                if (busy.some(b => s < b.end && e > b.start)) continue;
                slots.push(t);
            }
            return slots;
        }

        const inRange = dateStr => dateStr >= todayStr && dateStr <= lastStr;

        function renderCalendar() {
            const first = new Date(viewYear, viewMonth, 1);
            const label = first.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
            els.month.textContent = label.charAt(0).toUpperCase() + label.slice(1);
            els.prev.disabled = viewYear === ty && viewMonth === tm - 1;
            els.next.disabled = isoDate(viewYear, viewMonth + 1, 1) > lastStr;

            els.days.textContent = '';
            els.days.classList.toggle('is-loading', !isLoaded(monthKey(viewYear, viewMonth)));
            const offset = (first.getDay() + 6) % 7;
            for (let i = 0; i < offset; i++) els.days.appendChild(document.createElement('span'));

            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = isoDate(viewYear, viewMonth, d);
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'cal-day';
                btn.textContent = d;
                btn.setAttribute('aria-label', longDate(dateStr));
                const available = inRange(dateStr) && daySlots(dateStr).length > 0;
                btn.disabled = !available;
                btn.classList.toggle('available', available);
                btn.classList.toggle('today', dateStr === todayStr);
                btn.classList.toggle('selected', dateStr === selectedDate);
                btn.setAttribute('aria-pressed', String(dateStr === selectedDate));
                btn.addEventListener('click', () => selectDate(dateStr));
                els.days.appendChild(btn);
            }
        }

        function renderSlots() {
            els.slots.textContent = '';
            if (!selectedDate) {
                els.slotsTitle.textContent = 'Selecciona un día';
                return;
            }
            els.slotsTitle.textContent = 'Horarios para el ' + longDate(selectedDate);
            if (!isLoaded(selectedDate.slice(0, 7))) {
                for (let i = 0; i < 8; i++) {
                    const s = document.createElement('span');
                    s.className = 'slot-skeleton';
                    els.slots.appendChild(s);
                }
                return;
            }
            const slots = daySlots(selectedDate);
            if (!slots.length) {
                const p = document.createElement('p');
                p.className = 'slots-empty';
                p.textContent = 'No quedan horarios este día. Prueba con otra fecha.';
                els.slots.appendChild(p);
                return;
            }
            slots.forEach((t, i) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'slot' + (t === selectedMin ? ' selected' : '');
                btn.style.animationDelay = (i * 25) + 'ms';
                btn.textContent = fmtTime(t);
                btn.setAttribute('aria-pressed', String(t === selectedMin));
                btn.addEventListener('click', () => {
                    selectedMin = t;
                    els.slotError.hidden = true;
                    renderSlots();
                    els.cont.disabled = false;
                });
                els.slots.appendChild(btn);
            });
        }

        function selectDate(dateStr) {
            selectedDate = dateStr;
            selectedMin = null;
            els.cont.disabled = true;
            renderCalendar();
            renderSlots();
            const [y, m] = dateStr.split('-').map(Number);
            loadMonth(y, m - 1).then(() => {
                if (selectedDate === dateStr) { renderCalendar(); renderSlots(); }
            });
        }

        // Disponibilidad real desde Google Calendar, un mes a la vez
        function loadMonth(y, m) {
            const key = monthKey(y, m);
            if (!endpoint || !live || loadedMonths.has(key)) return Promise.resolve();
            if (pendingMonths.has(key)) return pendingMonths.get(key);
            const next = new Date(y, m + 1, 1);
            const from = new Date(isoDate(y, m, 1) + 'T00:00:00' + SCHEDULE.utcOffset);
            const to = new Date(isoDate(next.getFullYear(), next.getMonth(), 1) + 'T00:00:00' + SCHEDULE.utcOffset);
            const url = endpoint + (endpoint.includes('?') ? '&' : '?') +
                'from=' + encodeURIComponent(from.toISOString()) + '&to=' + encodeURIComponent(to.toISOString());
            const request = fetch(url)
                .then(r => r.json())
                .then(json => {
                    (json.busy || []).forEach(b => busy.push({ start: Date.parse(b.start), end: Date.parse(b.end) }));
                })
                .catch(() => { /* sin datos en vivo: se muestran los horarios de atención */ })
                .finally(() => {
                    loadedMonths.add(key);
                    pendingMonths.delete(key);
                });
            pendingMonths.set(key, request);
            return request;
        }

        function showMonth() {
            renderCalendar();
            const key = monthKey(viewYear, viewMonth);
            loadMonth(viewYear, viewMonth).then(() => {
                if (monthKey(viewYear, viewMonth) === key) renderCalendar();
            });
        }

        function selectFirstAvailable() {
            const d = new Date(ty, tm - 1, td);
            for (let i = 0; i <= SCHEDULE.maxDaysAhead; i++, d.setDate(d.getDate() + 1)) {
                const dateStr = isoDate(d.getFullYear(), d.getMonth(), d.getDate());
                if (daySlots(dateStr).length) {
                    viewYear = d.getFullYear();
                    viewMonth = d.getMonth();
                    selectDate(dateStr);
                    return;
                }
            }
            renderCalendar();
            renderSlots();
        }

        function goTo(step) {
            root.querySelectorAll('.sch-step').forEach(el => { el.hidden = Number(el.dataset.step) !== step; });
            root.querySelectorAll('[data-progress]').forEach(li => {
                const n = Number(li.dataset.progress);
                li.classList.toggle('active', n === step);
                li.classList.toggle('done', n < step);
            });
            if (step > 1) {
                root.querySelectorAll('.js-sum-date').forEach(el => { el.textContent = longDate(selectedDate); });
                root.querySelectorAll('.js-sum-time').forEach(el => { el.textContent = timeRange(selectedMin); });
            }
            if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        els.prev.addEventListener('click', () => {
            viewMonth--;
            if (viewMonth < 0) { viewMonth = 11; viewYear--; }
            showMonth();
        });
        els.next.addEventListener('click', () => {
            viewMonth++;
            if (viewMonth > 11) { viewMonth = 0; viewYear++; }
            showMonth();
        });
        els.cont.addEventListener('click', () => {
            goTo(2);
            if (window.matchMedia('(min-width: 601px)').matches) $('sf-name').focus();
        });
        root.querySelectorAll('[data-goto]').forEach(btn => {
            btn.addEventListener('click', () => goTo(Number(btn.dataset.goto)));
        });

        // --- Paso 2: validación ---
        const digits = v => v.replace(/\D/g, '');
        const validators = {
            name: v => v.trim().length >= 2,
            business: v => v.trim().length >= 2,
            phone: v => digits(v).length >= 7 && digits(v).length <= 12,
            email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
        };
        const rowOf = input => input.closest('.form-row');

        els.form.addEventListener('input', e => {
            const row = rowOf(e.target);
            if (row) row.classList.remove('invalid');
            els.error.hidden = true;
        });

        function whatsappMessage(d) {
            return 'Hola, quiero agendar una demo de MenuFacilito.\n' +
                (d.plan ? 'Plan de interés: ' + d.plan + '\n' : '') +
                'Fecha: ' + longDate(selectedDate) + ', ' + timeRange(selectedMin) + '\n' +
                'Nombre: ' + d.name + '\n' +
                'Restaurante: ' + d.business + ' (' + d.branches + ')\n' +
                'Teléfono: ' + d.phone + '\n' +
                'Correo: ' + d.email;
        }

        function showDone(viaCalendar) {
            if (viaCalendar) {
                els.doneTitle.textContent = '¡Tu demo está agendada!';
                els.doneText.textContent = 'Te enviamos la invitación con el enlace de la videollamada a ' + lastData.email + '. Si no la ves, revisa tu carpeta de spam.';
                els.doneWa.hidden = true;
            } else {
                els.doneTitle.textContent = '¡Ya casi está!';
                els.doneText.textContent = 'Abrimos WhatsApp con los datos de tu cita. Envía el mensaje para confirmarla y te responderemos enseguida.';
                els.doneWa.href = 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(whatsappMessage(lastData));
                els.doneWa.hidden = false;
            }
            goTo(3);
        }

        function setLoading(loading) {
            els.submit.disabled = loading;
            els.submit.classList.toggle('loading', loading);
            els.submit.querySelector('.js-submit-label').textContent = loading ? 'Agendando…' : 'Confirmar demo';
        }

        function showError(message, withWhatsApp) {
            els.error.textContent = message + ' ';
            if (withWhatsApp) {
                const link = document.createElement('a');
                link.href = 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(whatsappMessage(lastData));
                link.target = '_blank';
                link.rel = 'noopener';
                link.textContent = 'Confirmar por WhatsApp';
                link.style.textDecoration = 'underline';
                els.error.appendChild(link);
            }
            els.error.hidden = false;
        }

        els.form.addEventListener('submit', async e => {
            e.preventDefault();
            let valid = true;
            Object.keys(validators).forEach(name => {
                const input = els.form.elements[name];
                const ok = validators[name](input.value);
                rowOf(input).classList.toggle('invalid', !ok);
                if (!ok && valid) { valid = false; input.focus(); }
            });
            if (!valid) return;

            const f = els.form.elements;
            const country = f.country.value;
            let local = digits(f.phone.value);
            if (country === '+593') local = local.replace(/^0/, '');
            const start = slotStart(selectedDate, selectedMin);
            lastData = {
                name: f.name.value.trim(),
                business: f.business.value.trim(),
                phone: country + ' ' + local,
                email: f.email.value.trim(),
                branches: f.branches.value,
                plan: root.dataset.plan || '',
                website: f.website.value,
                start: start.toISOString()
            };

            if (!endpoint) {
                openWhatsApp(whatsappMessage(lastData));
                showDone(false);
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(endpoint, { method: 'POST', body: JSON.stringify(lastData) });
                const json = await res.json();
                if (json.ok) {
                    showDone(true);
                } else if (json.error === 'taken' || json.error === 'invalid_slot') {
                    busy.push({ start: start.getTime(), end: start.getTime() + SCHEDULE.durationMin * 60000 });
                    selectedMin = null;
                    els.cont.disabled = true;
                    renderCalendar();
                    renderSlots();
                    els.slotError.hidden = false;
                    goTo(1);
                } else {
                    showError('No pudimos agendar tu demo. Revisa tus datos e inténtalo de nuevo, o', true);
                }
            } catch (err) {
                showError('No pudimos conectar con el calendario. Inténtalo de nuevo, o', true);
            } finally {
                setLoading(false);
            }
        });

        selectFirstAvailable();
        if (endpoint) {
            const goLive = () => {
                live = true;
                loadMonth(ty, tm - 1).then(selectFirstAvailable);
            };
            if ('IntersectionObserver' in window) {
                const io = new IntersectionObserver(entries => {
                    if (entries.some(en => en.isIntersecting)) { io.disconnect(); goLive(); }
                }, { rootMargin: '400px 0px' });
                io.observe(root);
            } else {
                goLive();
            }
        }

        return {
            setPlan(plan) {
                if (plan) root.dataset.plan = plan;
                else delete root.dataset.plan;
            },
            // al volver a abrir después de agendar, empezar de nuevo
            resetIfDone() {
                if (root.querySelector('.sch-step[data-step="3"]').hidden) return;
                els.form.reset();
                selectFirstAvailable();
                goTo(1);
            }
        };
    }

    // --- WhatsApp chat widget ---
    let openChat = () => openWhatsApp('Hola, quiero información sobre MenuFacilito.');
    if (widget) {
        const panel = document.getElementById('wa-panel');
        const launcher = document.getElementById('wa-launcher');
        const closeBtn = document.getElementById('wa-close');
        const body = document.getElementById('wa-body');
        const typing = document.getElementById('wa-typing');
        const quick = document.getElementById('wa-quick');
        const form = document.getElementById('wa-form');
        const input = document.getElementById('wa-text');
        const teaser = document.getElementById('wa-teaser');
        const badge = document.getElementById('wa-badge');
        let greeted = false;

        const storage = {
            get(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
            set(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* sin almacenamiento */ } }
        };

        const time = () => new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

        function addMessage(text, fromUser) {
            const msg = document.createElement('div');
            msg.className = 'wa-msg' + (fromUser ? ' from-user' : '');
            msg.textContent = text;
            const stamp = document.createElement('time');
            stamp.textContent = time();
            msg.appendChild(stamp);
            body.insertBefore(msg, typing);
            body.scrollTop = body.scrollHeight;
        }

        function greet() {
            greeted = true;
            typing.hidden = false;
            setTimeout(() => {
                typing.hidden = true;
                addMessage('¡Hola! 👋 Somos el equipo de MenuFacilito.');
                setTimeout(() => {
                    addMessage('¿En qué te podemos ayudar? Elige una opción o escríbenos tu consulta.');
                    quick.hidden = false;
                    body.scrollTop = body.scrollHeight;
                }, 500);
            }, 900);
        }

        function setOpen(open) {
            panel.hidden = !open;
            widget.classList.toggle('open', open);
            launcher.setAttribute('aria-expanded', String(open));
            launcher.setAttribute('aria-label', open ? 'Cerrar chat' : 'Abrir chat de WhatsApp');
            if (open) {
                teaser.hidden = true;
                badge.hidden = true;
                storage.set('wa-seen', '1');
                if (!greeted) greet();
                if (window.matchMedia('(min-width: 601px)').matches) input.focus();
            }
        }

        function send(text) {
            addMessage(text, true);
            openWhatsApp(text);
        }

        openChat = () => setOpen(true);
        launcher.addEventListener('click', () => setOpen(panel.hidden));
        closeBtn.addEventListener('click', () => setOpen(false));
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !panel.hidden) setOpen(false);
        });

        quick.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => send(btn.dataset.msg));
        });

        form.addEventListener('submit', e => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            send(text);
        });

        // Mensaje de bienvenida tras unos segundos (una vez por sesión)
        if (storage.get('wa-seen')) {
            badge.hidden = true;
        } else {
            setTimeout(() => {
                if (panel.hidden) teaser.hidden = false;
            }, 4000);
        }
        document.getElementById('wa-teaser-body').addEventListener('click', () => setOpen(true));
        document.getElementById('wa-teaser-close').addEventListener('click', () => {
            teaser.hidden = true;
            storage.set('wa-seen', '1');
        });
    }

    // --- Modal: agenda una demo ---
    // El mismo agendador de la sección #demo se mueve al modal mientras está abierto.
    const PLANS = {
        Delivery: {
            price: '$49,99/mes',
            text: 'Ideal para dark kitchens y markets. Agenda una demo gratuita: te mostramos cómo vender a domicilio con tu propio link de pedidos, sin comisiones.'
        },
        Business: {
            price: '$99,99/mes',
            text: 'Agenda una demo gratuita: te mostramos cómo administrar todo tu restaurante desde una sola app.'
        }
    };
    const modal = document.getElementById('demo-modal');
    if (modal && scheduler && schedulerApi) {
        const dialog = modal.querySelector('.modal-dialog');
        const modalBody = document.getElementById('modal-body');
        const home = document.createComment('agendador');
        scheduler.parentNode.insertBefore(home, scheduler);
        let lastTrigger = null;
        const setText = (id, text) => { document.getElementById(id).textContent = text; };

        function openModal(plan, trigger) {
            lastTrigger = trigger || null;
            const info = PLANS[plan];
            setText('modal-eyebrow', info ? 'Plan ' + plan + ' · ' + info.price + ' · IVA incluido' : 'Demo gratuita · Sin compromiso');
            setText('modal-title', info ? 'Empieza con el plan ' + plan : 'Agenda una demo');
            setText('modal-text', info ? info.text : 'Elige el día y la hora y te mostramos MenuFacilito en una videollamada.');
            schedulerApi.setPlan(plan);
            schedulerApi.resetIfDone();
            modalBody.appendChild(scheduler);

            const scrollbar = window.innerWidth - document.documentElement.clientWidth;
            document.documentElement.style.setProperty('--scrollbar', scrollbar + 'px');
            document.documentElement.classList.add('modal-open');
            modal.hidden = false;
            dialog.scrollTop = 0;
            modal.querySelector('.modal-close').focus();
        }

        function closeModal() {
            if (modal.hidden) return;
            modal.hidden = true;
            document.documentElement.classList.remove('modal-open');
            home.parentNode.insertBefore(scheduler, home.nextSibling);
            schedulerApi.setPlan('');
            if (lastTrigger) lastTrigger.focus({ preventScroll: true });
        }

        document.querySelectorAll('[data-open-demo]').forEach(el => {
            el.addEventListener('click', e => {
                e.preventDefault();
                openModal(el.dataset.plan || '', el);
            });
        });
        modal.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));

        document.addEventListener('keydown', e => {
            if (modal.hidden) return;
            if (e.key === 'Escape') {
                closeModal();
                return;
            }
            // mantener el foco dentro del modal
            if (e.key === 'Tab') {
                const focusables = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not(.hp), select')]
                    .filter(el => el.offsetParent !== null);
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
    }

    // --- Botones "habla con un asesor" ---
    document.querySelectorAll('[data-open-chat]').forEach(btn => {
        btn.addEventListener('click', () => openChat());
    });

    // --- Calculadora de ahorro ---
    const calcSales = document.getElementById('calc-sales');
    const calcFee = document.getElementById('calc-fee');
    if (calcSales && calcFee) {
        const PLAN_DELIVERY = 49.99;
        const $ = id => document.getElementById(id);
        const money = n => '$' + n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const saveEl = $('calc-save');
        let shown = 0;
        let frame = null;

        // anima la cifra de ahorro hasta el nuevo valor
        function animateTo(target) {
            cancelAnimationFrame(frame);
            const from = shown;
            const t0 = performance.now();
            const step = now => {
                const p = Math.min((now - t0) / 350, 1);
                shown = from + (target - from) * (1 - Math.pow(1 - p, 3));
                saveEl.textContent = money(shown);
                if (p < 1) frame = requestAnimationFrame(step);
            };
            frame = requestAnimationFrame(step);
        }

        const paintTrack = input => {
            const pct = (input.value - input.min) / (input.max - input.min) * 100;
            input.style.setProperty('--fill', pct + '%');
        };

        function updateCalc() {
            const sales = Number(calcSales.value);
            const fee = Number(calcFee.value);
            const fees = sales * fee / 100;
            const save = Math.max(fees - PLAN_DELIVERY, 0);
            $('calc-sales-out').textContent = '$' + sales.toLocaleString('es-EC');
            $('calc-fee-out').textContent = fee + '%';
            $('calc-fees').textContent = money(fees) + '/mes';
            $('calc-year').textContent = save > 0
                ? 'al mes · ' + money(save * 12) + ' al año'
                : 'Con estas ventas, la comisión aún es menor que el plan';
            animateTo(save);
            paintTrack(calcSales);
            paintTrack(calcFee);
        }
        calcSales.addEventListener('input', updateCalc);
        calcFee.addEventListener('input', updateCalc);
        updateCalc();
    }

    // --- Preguntas frecuentes: una abierta a la vez ---
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        item.addEventListener('toggle', () => {
            if (item.open) faqItems.forEach(other => { if (other !== item) other.open = false; });
        });
    });

    // --- Testimonios ---
    const tSection = document.getElementById('testimonios');
    if (tSection && TESTIMONIALS.length) {
        const track = document.getElementById('t-track');
        TESTIMONIALS.forEach(t => {
            const rating = Math.max(1, Math.min(5, Number(t.rating) || 5));
            const card = document.createElement('article');
            card.className = 't-card';

            const stars = document.createElement('p');
            stars.className = 't-stars';
            stars.setAttribute('aria-label', rating + ' de 5 estrellas');
            stars.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);

            const text = document.createElement('p');
            text.className = 't-text';
            text.textContent = '“' + t.text + '”';

            const who = document.createElement('p');
            who.className = 't-who';
            const name = document.createElement('strong');
            name.textContent = t.name;
            const business = document.createElement('span');
            business.textContent = t.business;
            who.append(name, business);

            card.append(stars, text, who);
            track.appendChild(card);
        });
        tSection.hidden = false;
        const scrollTrack = dir => track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
        document.getElementById('t-prev').addEventListener('click', () => scrollTrack(-1));
        document.getElementById('t-next').addEventListener('click', () => scrollTrack(1));
    }

    // --- Año del footer ---
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
});
