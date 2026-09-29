/**
 * MenuFacilito · Agenda de demos conectada a Google Calendar
 *
 * Configuración (una sola vez, con la cuenta de Google del negocio):
 *  1. Entra a https://script.google.com y crea un proyecto nuevo.
 *  2. Pega este archivo completo en Code.gs.
 *  3. En "Servicios" (+) agrega "Google Calendar API" (identificador: Calendar).
 *  4. Implementar > Nueva implementación > Tipo: Aplicación web
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario
 *     Autoriza los permisos que pide Google.
 *  5. Copia la URL que termina en /exec y pégala en index.html,
 *     en el atributo data-endpoint del elemento con id="scheduler".
 *
 * Si cambias los horarios aquí, cambia también SCHEDULE en js/main.js.
 */

const CONFIG = {
  CALENDAR_ID: 'primary',          // o el ID de un calendario específico
  TIMEZONE: 'America/Guayaquil',
  DURATION_MIN: 30,                // duración de cada demo
  STEP_MIN: 30,                    // cada cuánto empieza un horario
  WORK_DAYS: [1, 2, 3, 4, 5, 6, 7], // 1 = lunes ... 7 = domingo
  START: '09:00',
  END: '18:00',
  BREAKS: [['13:00', '14:00']],
  MIN_NOTICE_HOURS: 3,
  MAX_DAYS_AHEAD: 365,
  EVENT_TITLE: 'Demo MenuFacilito · ',
  // Quién recibe el aviso de cada cita nueva. Vacío = la cuenta que publica el script.
  // Para varias personas: 'ventas@menufacilito.com, otra@correo.com'
  NOTIFY_EMAIL: '',
  // Recordatorios del evento en el calendario del negocio (minutos antes)
  REMINDER_POPUP_MIN: 30,
  REMINDER_EMAIL_MIN: 60
};

/**
 * Devuelve los intervalos ocupados (sin detalles de los eventos) entre ?from y ?to.
 * La web pide un mes a la vez; Google no permite consultar rangos muy largos.
 */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const now = new Date();
  let from = p.from ? new Date(p.from) : now;
  let to = p.to ? new Date(p.to) : new Date(now.getTime() + 31 * 864e5);
  if (isNaN(from) || from < now) from = now;
  const limit = new Date(Math.min(
    from.getTime() + 40 * 864e5,
    now.getTime() + (CONFIG.MAX_DAYS_AHEAD + 1) * 864e5
  ));
  if (isNaN(to) || to > limit) to = limit;
  if (to <= from) return json_({ ok: true, busy: [] });
  return json_({ ok: true, busy: getBusy_(from, to) });
}

/** Crea la cita en Google Calendar e invita al cliente. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    if (d.website) return json_({ ok: true }); // honeypot anti-spam

    const name = clean_(d.name, 80);
    const business = clean_(d.business, 80);
    const email = clean_(d.email, 120);
    const phone = clean_(d.phone, 25);
    const branches = clean_(d.branches, 20);
    const plan = clean_(d.plan, 20);
    if (!name || !business || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[\d\s]{7,20}$/.test(phone)) {
      return json_({ ok: false, error: 'invalid_data' });
    }

    const start = new Date(d.start);
    if (isNaN(start) || !isValidSlot_(start)) return json_({ ok: false, error: 'invalid_slot' });
    const end = new Date(start.getTime() + CONFIG.DURATION_MIN * 60000);

    const taken = getBusy_(start, end).some(b => new Date(b.start) < end && new Date(b.end) > start);
    if (taken) return json_({ ok: false, error: 'taken' });

    const event = {
      summary: CONFIG.EVENT_TITLE + business,
      description:
        'Demo agendada desde menufacilito.com\n\n' +
        'Nombre: ' + name + '\n' +
        'Restaurante: ' + business + '\n' +
        'Locales: ' + branches + '\n' +
        (plan ? 'Plan de interés: ' + plan + '\n' : '') +
        'Teléfono / WhatsApp: ' + phone + '\n' +
        'Correo: ' + email,
      start: { dateTime: start.toISOString(), timeZone: CONFIG.TIMEZONE },
      end: { dateTime: end.toISOString(), timeZone: CONFIG.TIMEZONE },
      attendees: [{ email: email, displayName: name }],
      conferenceData: {
        createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: CONFIG.REMINDER_POPUP_MIN },
          { method: 'email', minutes: CONFIG.REMINDER_EMAIL_MIN }
        ]
      }
    };
    const created = Calendar.Events.insert(event, CONFIG.CALENDAR_ID, {
      conferenceDataVersion: 1,
      sendUpdates: 'all'
    });

    notifyTeam_({
      name: name, business: business, email: email, phone: phone,
      branches: branches, plan: plan, start: start,
      link: created.htmlLink, meet: created.hangoutLink
    });
    return json_({ ok: true, meet: created.hangoutLink || '' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server_error' });
  } finally {
    lock.releaseLock();
  }
}

/** Envía un correo al equipo con los datos de la cita. Si falla, la cita igual queda creada. */
function notifyTeam_(c) {
  try {
    const to = CONFIG.NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
    const when = Utilities.formatDate(c.start, CONFIG.TIMEZONE, "EEEE d 'de' MMMM, HH:mm");
    MailApp.sendEmail({
      to: to,
      replyTo: c.email,
      subject: 'Nueva demo agendada: ' + c.business + ' · ' + when,
      body:
        'Se agendó una nueva demo desde menufacilito.com\n\n' +
        'Fecha: ' + when + ' (hora de Ecuador)\n' +
        'Nombre: ' + c.name + '\n' +
        'Restaurante: ' + c.business + '\n' +
        'Locales: ' + c.branches + '\n' +
        (c.plan ? 'Plan de interés: ' + c.plan + '\n' : '') +
        'Teléfono / WhatsApp: ' + c.phone + '\n' +
        'Correo: ' + c.email + '\n\n' +
        (c.meet ? 'Google Meet: ' + c.meet + '\n' : '') +
        'Ver en Google Calendar: ' + c.link + '\n\n' +
        'Puedes responder este correo para escribirle directamente al cliente.'
    });
  } catch (err) {
    console.error('No se pudo enviar el aviso: ' + err);
  }
}

function getBusy_(from, to) {
  const res = Calendar.Freebusy.query({
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    timeZone: CONFIG.TIMEZONE,
    items: [{ id: CONFIG.CALENDAR_ID }]
  });
  const cal = res.calendars[CONFIG.CALENDAR_ID];
  return (cal && cal.busy) || [];
}

/** Comprueba que la hora pedida coincide con un horario ofrecido en la web. */
function isValidSlot_(start) {
  const now = Date.now();
  if (start.getTime() < now + CONFIG.MIN_NOTICE_HOURS * 36e5) return false;
  if (start.getTime() > now + (CONFIG.MAX_DAYS_AHEAD + 1) * 864e5) return false;

  const day = Number(Utilities.formatDate(start, CONFIG.TIMEZONE, 'u'));
  if (CONFIG.WORK_DAYS.indexOf(day) === -1) return false;

  const minutes = toMin_(Utilities.formatDate(start, CONFIG.TIMEZONE, 'HH:mm'));
  const endMin = minutes + CONFIG.DURATION_MIN;
  if (minutes < toMin_(CONFIG.START) || endMin > toMin_(CONFIG.END)) return false;
  if ((minutes - toMin_(CONFIG.START)) % CONFIG.STEP_MIN !== 0) return false;
  return !CONFIG.BREAKS.some(b => minutes < toMin_(b[1]) && endMin > toMin_(b[0]));
}

function toMin_(hhmm) {
  const p = hhmm.split(':');
  return Number(p[0]) * 60 + Number(p[1]);
}

function clean_(value, max) {
  return String(value || '').trim().slice(0, max);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
