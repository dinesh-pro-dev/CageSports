/* Organizer page: sign in, review booking requests, confirm / decline them. */
(function initOrganizer() {
  const { SLOT_WINDOWS, slotStartTime, slotLabel } = window.CageBooking;
  const $ = (id) => document.getElementById(id);

  const panels = ['loading-panel', 'setup-panel', 'login-panel', 'denied-panel', 'dashboard'].map($);
  function showPanel(id) {
    panels.forEach((panel) => {
      const show = panel.id === id;
      panel.classList.toggle('hidden', !show);
      if (panel.id !== 'loading-panel') panel.classList.toggle('flex', show);
    });
    const signedIn = id === 'dashboard' || id === 'denied-panel';
    $('sign-out-btn').classList.toggle('hidden', !signedIn);
    $('sign-out-btn').classList.toggle('inline-flex', signedIn);
  }

  // Signing in is handled by Supabase Auth. What a signed-in account may read or change is
  // decided by the database policies, not by this page.
  const backend = window.CageBooking.createClient();
  if (!backend) {
    showPanel('setup-panel');
    return;
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const ALL_SLOTS = SLOT_WINDOWS.flatMap((group) => group.slots);

  const TABS = [
    { id: 'pending', label: 'Pending', statuses: ['pending'], empty: 'No pending requests. New requests appear here as customers submit them.' },
    { id: 'confirmed', label: 'Confirmed', statuses: ['confirmed'], empty: 'No confirmed bookings yet.' },
    { id: 'closed', label: 'Declined / Cancelled', statuses: ['declined', 'cancelled'], empty: 'No declined or cancelled requests.' }
  ];

  const ERRORS = {
    slot_already_booked: 'That date and time slot is already booked by another confirmed request, so this one was not confirmed. It is still pending.',
    request_already_decided: 'This request was already handled, possibly from another device. The list has been refreshed.',
    request_not_confirmed: 'This booking is no longer confirmed. The list has been refreshed.',
    request_not_found: 'This request no longer exists. The list has been refreshed.',
    date_and_slot_required: 'Choose a date and a time slot before confirming.',
    not_authorized: 'This account is not allowed to manage bookings.'
  };

  let requests = [];
  let activeTab = 'pending';
  let busy = false;
  let loadedOnce = false;
  let currentUserId = null;
  // Date / slot the organizer has picked for requests that arrived without one, kept across refreshes.
  const assignments = new Map();

  /* ---- Formatting ---------------------------------------------------- */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    // Customer-supplied values only ever go in as text, never as HTML.
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function icon(name, className) {
    const node = el('span', `material-symbols-outlined ${className || ''}`, name);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function formatDate(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!match) return '';
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${time}`;
  }

  function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  const slotKey = (date, start) => `${date}|${String(start).slice(0, 5)}`;

  function showMessage(text, kind) {
    const box = $('dashboard-message');
    box.textContent = text || '';
    box.classList.toggle('hidden', !text);
    const error = kind === 'error';
    box.setAttribute('role', error ? 'alert' : 'status');
    box.classList.toggle('bg-status-booked/10', error);
    box.classList.toggle('border-status-booked/30', error);
    box.classList.toggle('text-on-surface', true);
    box.classList.toggle('bg-status-live/10', !error);
    box.classList.toggle('border-status-live/30', !error);
    if (text) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---- Rendering ----------------------------------------------------- */

  function renderTabs() {
    const tabs = $('status-tabs');
    tabs.textContent = '';
    TABS.forEach((tab) => {
      const count = requests.filter((request) => tab.statuses.includes(request.status)).length;
      const active = tab.id === activeTab;
      const button = el('button', 'inline-flex items-center gap-2 px-4 min-h-[40px] rounded-full border font-label-caps text-label-caps uppercase transition active:scale-95 ' + (active
        ? 'bg-primary-container text-on-primary border-primary-container font-semibold'
        : 'bg-surface-panel text-on-surface border-border-subtle hover:border-primary-container hover:text-primary-container'));
      button.type = 'button';
      button.dataset.tab = tab.id;
      button.setAttribute('aria-pressed', String(active));
      button.append(el('span', '', tab.label), el('span', 'tab-count ' + (active ? '' : 'text-text-dim'), String(count)));
      button.addEventListener('click', () => {
        activeTab = tab.id;
        render();
      });
      tabs.appendChild(button);
    });
  }

  function detailRow(iconName, label, value, valueClass) {
    const row = el('div', 'flex items-start gap-2 min-w-0');
    row.appendChild(icon(iconName, 'text-[16px] text-text-dim mt-0.5'));
    const body = el('div', 'flex flex-col min-w-0');
    body.appendChild(el('span', 'font-label-caps text-[10px] uppercase tracking-wider text-text-dim', label));
    body.appendChild(el('span', `font-body-sm text-body-sm break-words ${valueClass || 'text-on-surface'}`, value));
    row.appendChild(body);
    return row;
  }

  const STATUS_STYLES = {
    pending: 'bg-surface-highlight text-primary-container',
    confirmed: 'bg-status-live/10 text-status-live',
    declined: 'bg-surface-highlight text-text-dim',
    cancelled: 'bg-surface-highlight text-text-dim'
  };

  const FIELD_CLASS = 'w-full min-h-[44px] bg-surface-elevated text-on-surface px-space-sm py-space-xs rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container border border-border-subtle';

  function requestCard(request, bookedBy) {
    const card = el('article', 'request-card bg-surface-panel p-4 md:p-5 rounded-2xl border border-border-subtle/50 flex flex-col gap-3 min-w-0');
    card.dataset.id = request.id;
    card.dataset.status = request.status;

    const head = el('div', 'flex items-start justify-between gap-3 border-b border-border-subtle/40 pb-3');
    const title = el('div', 'flex flex-col min-w-0');
    title.appendChild(el('h2', 'font-headline-sm text-headline-sm uppercase text-on-surface break-words', request.activity));
    title.appendChild(el('span', 'font-body-sm text-[12px] text-text-dim', `Requested ${formatTimestamp(request.created_at)}`));
    head.appendChild(title);
    head.appendChild(el('span', `status-pill shrink-0 font-label-caps text-[11px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${STATUS_STYLES[request.status] || ''}`, request.status));
    card.appendChild(head);

    const details = el('div', 'grid grid-cols-1 min-[420px]:grid-cols-2 gap-3');
    details.appendChild(detailRow('calendar_month', 'Date', request.booking_date ? formatDate(request.booking_date) : 'Not chosen', request.booking_date ? '' : 'text-text-dim italic'));
    const timeText = request.slot_start
      ? slotLabel(request.slot_start)
      : request.custom_time ? `Custom: ${request.custom_time}` : 'Not chosen';
    details.appendChild(detailRow('schedule', 'Time', timeText, request.slot_start || request.custom_time ? '' : 'text-text-dim italic'));
    details.appendChild(detailRow('person', 'Name', request.customer_name));

    const phoneRow = detailRow('call', 'Phone', request.customer_phone);
    const digits = String(request.customer_phone || '').replace(/\D/g, '');
    if (digits.length >= 10) {
      const links = el('span', 'flex items-center gap-3 pt-0.5');
      const call = el('a', 'font-label-md text-label-md text-primary-container hover:underline uppercase', 'Call');
      call.href = `tel:${digits.length === 10 ? digits : '+' + digits}`;
      const chat = el('a', 'font-label-md text-label-md text-primary-container hover:underline uppercase', 'WhatsApp');
      chat.href = `https://wa.me/${digits.length === 10 ? '91' + digits : digits}`;
      chat.target = '_blank';
      chat.rel = 'noopener noreferrer';
      links.append(call, chat);
      phoneRow.lastChild.appendChild(links);
    }
    details.appendChild(phoneRow);
    if (request.team) details.appendChild(detailRow('shield', 'Team', request.team));
    if (request.notes) details.appendChild(detailRow('description', 'Notes', request.notes));
    card.appendChild(details);

    if (request.status !== 'pending' && request.decided_at) {
      card.appendChild(el('p', 'font-body-sm text-[12px] text-text-dim', `${request.status[0].toUpperCase()}${request.status.slice(1)} ${formatTimestamp(request.decided_at)}`));
    }

    if (request.status === 'pending') {
      const needsDate = !request.booking_date;
      const needsSlot = !request.slot_start;
      const chosen = assignments.get(request.id) || {};
      const actions = el('div', 'flex flex-col gap-3 pt-3 border-t border-border-subtle/40 mt-auto');

      const confirmBtn = el('button', 'confirm-btn flex-1 min-h-[44px] bg-primary-container text-on-primary font-headline-sm text-[14px] uppercase tracking-wide rounded-full flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-[0.98] transition-all font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100');
      confirmBtn.type = 'button';
      confirmBtn.append(icon('check_circle', 'text-[18px]'), el('span', '', 'Confirm'));

      const conflictNote = el('p', 'conflict-note hidden font-body-sm text-[12px] text-status-booked');

      // A slot already held by another confirmed request cannot be confirmed again. The database
      // refuses it regardless; this just says so before the organizer tries.
      const refreshConflict = () => {
        const date = request.booking_date || chosen.date;
        const start = request.slot_start || chosen.slot;
        const taken = Boolean(date && start && bookedBy.has(slotKey(date, start)));
        conflictNote.textContent = taken ? 'This date and time slot is already booked by another confirmed request.' : '';
        conflictNote.classList.toggle('hidden', !taken);
        confirmBtn.disabled = busy || taken;
      };

      if (needsDate || needsSlot) {
        const assign = el('div', 'grid grid-cols-1 min-[420px]:grid-cols-2 gap-3');
        if (needsDate) {
          const wrap = el('label', 'flex flex-col gap-1');
          wrap.appendChild(el('span', 'font-label-caps text-[11px] uppercase tracking-wide text-text-dim', 'Set date to confirm'));
          const input = el('input', `assign-date ${FIELD_CLASS}`);
          input.type = 'date';
          input.min = todayIso();
          input.value = chosen.date || '';
          input.addEventListener('change', () => {
            chosen.date = input.value;
            assignments.set(request.id, chosen);
            refreshConflict();
          });
          wrap.appendChild(input);
          assign.appendChild(wrap);
        }
        if (needsSlot) {
          const wrap = el('label', 'flex flex-col gap-1');
          wrap.appendChild(el('span', 'font-label-caps text-[11px] uppercase tracking-wide text-text-dim', 'Set time slot to confirm'));
          const select = el('select', `assign-slot ${FIELD_CLASS}`);
          select.appendChild(new Option('Choose a slot…', ''));
          ALL_SLOTS.forEach((slot) => select.appendChild(new Option(slot, slotStartTime(slot))));
          select.value = chosen.slot || '';
          select.addEventListener('change', () => {
            chosen.slot = select.value;
            assignments.set(request.id, chosen);
            refreshConflict();
          });
          wrap.appendChild(select);
          assign.appendChild(wrap);
        }
        actions.appendChild(assign);
      }

      actions.appendChild(conflictNote);

      const buttons = el('div', 'flex items-center gap-2');
      const declineBtn = el('button', 'decline-btn flex-1 min-h-[44px] bg-surface-panel border border-border-subtle text-on-surface hover:border-status-booked hover:text-status-booked font-headline-sm text-[14px] uppercase tracking-wide rounded-full flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed');
      declineBtn.type = 'button';
      declineBtn.disabled = busy;
      declineBtn.append(icon('close', 'text-[18px]'), el('span', '', 'Decline'));

      confirmBtn.addEventListener('click', () => {
        const date = request.booking_date || chosen.date;
        const start = request.slot_start || chosen.slot;
        if (!date || !start) {
          showMessage(ERRORS.date_and_slot_required, 'error');
          return;
        }
        decide(request, 'confirmed', {
          p_booking_date: needsDate ? date : null,
          p_slot_start: needsSlot ? start : null
        });
      });
      declineBtn.addEventListener('click', () => {
        if (window.confirm(`Decline the request from ${request.customer_name}?`)) decide(request, 'declined');
      });

      buttons.append(declineBtn, confirmBtn);
      actions.appendChild(buttons);
      card.appendChild(actions);
      refreshConflict();
    }

    if (request.status === 'confirmed') {
      const actions = el('div', 'pt-3 border-t border-border-subtle/40 mt-auto');
      const cancelBtn = el('button', 'cancel-btn w-full min-h-[44px] bg-surface-panel border border-border-subtle text-on-surface hover:border-status-booked hover:text-status-booked font-headline-sm text-[14px] uppercase tracking-wide rounded-full flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed');
      cancelBtn.type = 'button';
      cancelBtn.disabled = busy;
      cancelBtn.append(icon('close', 'text-[18px]'), el('span', '', 'Cancel booking & free the slot'));
      cancelBtn.addEventListener('click', () => {
        if (window.confirm(`Cancel the confirmed booking for ${request.customer_name}? The slot becomes available again.`)) decide(request, 'cancelled');
      });
      actions.appendChild(cancelBtn);
      card.appendChild(actions);
    }

    return card;
  }

  function render() {
    renderTabs();

    // Which date + slot pairs are held by a confirmed request (and by which one).
    const bookedBy = new Map();
    requests.forEach((request) => {
      if (request.status === 'confirmed') bookedBy.set(slotKey(request.booking_date, request.slot_start), request.id);
    });

    const tab = TABS.find((item) => item.id === activeTab);
    const visible = requests.filter((request) => tab.statuses.includes(request.status));
    // Pending: oldest first, so nobody is left waiting. Others: most recently decided first.
    visible.sort((a, b) => (activeTab === 'pending'
      ? a.created_at.localeCompare(b.created_at)
      : String(b.decided_at || b.created_at).localeCompare(String(a.decided_at || a.created_at))));

    const list = $('request-list');
    list.textContent = '';
    visible.forEach((request) => list.appendChild(requestCard(request, bookedBy)));

    const empty = $('empty-state');
    empty.textContent = loadedOnce ? tab.empty : '';
    empty.classList.toggle('hidden', visible.length > 0 || !loadedOnce);
  }

  /* ---- Data ---------------------------------------------------------- */

  function setBusy(on) {
    busy = on;
    $('refresh-btn').disabled = on;
    $('refresh-btn').classList.toggle('opacity-60', on);
    document.querySelectorAll('#request-list button').forEach((button) => {
      if (on) button.disabled = true;
    });
    if (!on) render();
  }

  // Returns true when the list was loaded. Never clears the list on failure – but says the
  // data on screen may be out of date.
  async function loadRequests({ quiet } = {}) {
    try {
      const { data, error } = await backend
        .from('booking_requests')
        .select('id, created_at, status, activity, booking_date, slot_start, custom_time, customer_name, customer_phone, team, notes, decided_at')
        .order('created_at', { ascending: false })
        .limit(500)
        .abortSignal(AbortSignal.timeout(15000));
      if (error) throw error;
      requests = data;
      loadedOnce = true;
      $('last-updated').textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      if (!busy) render();
      return true;
    } catch (error) {
      console.error('Could not load booking requests:', error);
      if (!quiet) showMessage('Couldn’t load the booking requests. Check your connection and press Refresh. Anything shown below may be out of date.', 'error');
      $('last-updated').textContent = 'Not updated';
      return false;
    }
  }

  async function decide(request, decision, extra) {
    if (busy) return;
    setBusy(true);
    showMessage('');
    let result = null;
    try {
      const { error } = await backend
        .rpc('decide_booking_request', { p_request_id: request.id, p_decision: decision, ...(extra || {}) })
        .abortSignal(AbortSignal.timeout(15000));
      result = error
        ? { error: ERRORS[error.message] || 'Couldn’t update the request, so nothing was changed. Check your connection and try again.' }
        : { ok: true };
      if (error) console.error('decide_booking_request failed:', error);
    } catch (error) {
      console.error('decide_booking_request failed:', error);
      result = { error: 'Couldn’t update the request, so nothing was changed. Check your connection and try again.' };
    }

    // Always re-read from the database so the page shows what is really stored.
    const reloaded = await loadRequests({ quiet: true });
    setBusy(false);

    if (result.error) {
      showMessage(result.error, 'error');
    } else if (!reloaded) {
      showMessage('The change was saved, but the list could not be refreshed. Press Refresh to see the current state.', 'error');
    } else {
      assignments.delete(request.id);
      const done = { confirmed: 'confirmed – the slot now shows as booked to visitors', declined: 'declined', cancelled: 'cancelled – the slot is available again' }[decision];
      showMessage(`Request from ${request.customer_name} ${done}.`, 'ok');
    }
  }

  $('refresh-btn').addEventListener('click', async () => {
    if (busy) return;
    showMessage('');
    await loadRequests();
  });

  // Pick up new requests without a manual refresh.
  setInterval(() => {
    if (currentUserId && !busy && !document.hidden) loadRequests({ quiet: true });
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (currentUserId && !busy && !document.hidden) loadRequests({ quiet: true });
  });

  /* ---- Sign in / out -------------------------------------------------- */

  async function enter(session) {
    if (currentUserId === session.user.id) return;
    currentUserId = session.user.id;

    const { data: isOrganizer, error } = await backend.rpc('is_organizer');
    if (currentUserId !== session.user.id) return;

    if (error) {
      console.error('is_organizer failed:', error);
      $('denied-message').textContent = 'Couldn’t check this account’s access. Check your connection and reload the page. If this keeps happening, the database migration may not have been run yet (see the README).';
      showPanel('denied-panel');
      return;
    }
    if (!isOrganizer) {
      $('denied-message').textContent = `${session.user.email} is signed in but is not listed as an organizer, so booking requests are not available to it. Ask the site owner to add this account to the organizers table, or sign out and use the organizer account.`;
      showPanel('denied-panel');
      return;
    }

    $('organizer-email').textContent = session.user.email;
    requests = [];
    loadedOnce = false;
    activeTab = 'pending';
    showMessage('');
    render();
    showPanel('dashboard');
    await loadRequests();
  }

  function leave() {
    currentUserId = null;
    requests = [];
    assignments.clear();
    $('request-list').textContent = '';
    $('login-password').value = '';
    showPanel('login-panel');
  }

  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = $('login-submit');
    const errorBox = $('login-error');
    errorBox.classList.add('hidden');
    submit.disabled = true;
    submit.classList.add('opacity-60');
    try {
      const { error } = await backend.auth.signInWithPassword({
        email: $('login-email').value.trim(),
        password: $('login-password').value
      });
      if (error) {
        errorBox.textContent = error.status === 400 || error.code === 'invalid_credentials'
          ? 'Incorrect email or password.'
          : 'Couldn’t sign in. Check your connection and try again.';
        errorBox.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Sign-in failed:', error);
      errorBox.textContent = 'Couldn’t sign in. Check your connection and try again.';
      errorBox.classList.remove('hidden');
    } finally {
      submit.disabled = false;
      submit.classList.remove('opacity-60');
    }
  });

  $('sign-out-btn').addEventListener('click', async () => {
    // Drop the local session even if the network call fails, so the device is signed out.
    await backend.auth.signOut({ scope: 'local' }).catch(() => {});
    leave();
  });

  backend.auth.onAuthStateChange((event, session) => {
    // Supabase advises against awaiting other client calls inside this callback.
    setTimeout(() => {
      if (session) enter(session);
      else leave();
    }, 0);
  });
})();
