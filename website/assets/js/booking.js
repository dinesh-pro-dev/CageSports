/* Book Slot page: activity → date → time → desk request. */
(function initBooking() {
  // Desk number that receives the Request Slot Confirmation message (country code + number, digits only).
  const WHATSAPP_NUMBER = '918056752258';

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Slot windows and the Supabase connection live in booking-data.js (shared with the organizer page).
  const { SLOT_WINDOWS, slotStartTime } = window.CageBooking;
  // Visitors always use the public (anon) role; no session is kept on this page.
  const backend = window.CageBooking.createClient({
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const $ = (id) => document.getElementById(id);
  const daysGrid = $('calendar-days-grid');
  const form = $('reservation-form');
  if (!daysGrid || !form) return;

  // The browser's local clock is read at runtime (and re-read as time passes),
  // so "today" and "already started" are never fixed at page load.
  function readToday() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }

  function isoOf(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  let today = readToday();

  const state = {
    activity: 'Birthday parties (Inquiry)',
    date: null, // { iso, day, month, year, weekday }
    slot: null, // one of SLOT_WINDOWS[].slots
    customTime: '',
    submitted: false,
    viewYear: today.year,
    viewMonth: today.month
  };

  function swap(el, remove, add) {
    el.classList.remove(...remove);
    el.classList.add(...add);
  }

  /* ---- Step 1: activity ------------------------------------------- */

  const activityButtons = Array.from(document.querySelectorAll('.activity-btn'));

  function renderActivities() {
    activityButtons.forEach((btn) => {
      const selected = btn.dataset.activity === state.activity;
      btn.setAttribute('aria-pressed', String(selected));
      if (selected) {
        swap(btn, ['bg-surface-panel', 'border-transparent'], ['bg-surface-highlight', 'border-primary-container']);
      } else {
        swap(btn, ['bg-surface-highlight', 'border-primary-container'], ['bg-surface-panel', 'border-transparent']);
      }
      const icon = btn.querySelector('.check-icon');
      if (icon) {
        icon.textContent = selected ? 'check_circle' : 'radio_button_unchecked';
        icon.classList.toggle('text-primary-container', selected);
        icon.classList.toggle('text-text-dim', !selected);
      }
    });
    $('selected-activity-display').textContent = state.activity;
    $('summary-activity').textContent = state.activity.replace(' (Inquiry)', '').replace(' football', '');
  }

  activityButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activity = btn.dataset.activity || '';
      renderActivities();
      renderSteps();
    });
  });

  /* ---- Step 2: calendar ------------------------------------------- */

  function isCurrentOrPastMonth() {
    return state.viewYear < today.year || (state.viewYear === today.year && state.viewMonth <= today.month);
  }

  function renderCalendar() {
    $('cal-month-display').textContent = `${MONTHS[state.viewMonth]} ${state.viewYear}`;

    const prevBtn = $('cal-prev-btn');
    const locked = isCurrentOrPastMonth();
    prevBtn.disabled = locked;
    prevBtn.classList.toggle('opacity-30', locked);
    prevBtn.classList.toggle('cursor-not-allowed', locked);
    prevBtn.classList.toggle('hover:bg-surface-highlight', !locked);
    prevBtn.classList.toggle('active:scale-95', !locked);

    daysGrid.textContent = '';
    const firstDayIndex = new Date(state.viewYear, state.viewMonth, 1).getDay();
    const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'h-9 md:h-10 w-full';
      daysGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = day;
      btn.className = 'cal-day-cell h-9 md:h-10 w-full rounded-lg flex items-center justify-center font-headline-sm text-[13px] md:text-[14px] transition-all';

      const isPast = state.viewYear < today.year ||
        (state.viewYear === today.year && state.viewMonth < today.month) ||
        (state.viewYear === today.year && state.viewMonth === today.month && day < today.day);

      const weekday = WEEKDAYS[new Date(state.viewYear, state.viewMonth, day).getDay()];
      const iso = isoOf(state.viewYear, state.viewMonth, day);
      btn.setAttribute('aria-label', `${weekday}, ${day} ${MONTHS[state.viewMonth]} ${state.viewYear}`);

      if (isPast) {
        btn.disabled = true;
        btn.classList.add('text-text-dim/30', 'line-through', 'cursor-not-allowed', 'opacity-35');
      } else {
        const isSelected = state.date && state.date.iso === iso;
        const isToday = state.viewYear === today.year && state.viewMonth === today.month && day === today.day;
        btn.setAttribute('aria-pressed', String(Boolean(isSelected)));

        if (isSelected) {
          btn.classList.add('bg-primary-container', 'text-on-primary', 'font-bold', 'shadow-[0_0_24px_rgba(245,213,71,0.22)]', 'scale-105');
        } else {
          btn.classList.add('text-on-surface', 'hover:bg-surface-highlight', 'active:scale-95');
          // Today is only outlined until a date is picked, so it never reads as a second selection.
          if (isToday && !state.date) btn.classList.add('border', 'border-primary-container', 'text-primary-container', 'font-bold');
        }

        const year = state.viewYear;
        const month = state.viewMonth;
        btn.addEventListener('click', () => selectDate({ iso, day, month, year, weekday }));
      }

      daysGrid.appendChild(btn);
    }
  }

  function renderDateLabels() {
    const date = state.date;
    const badge = $('selected-date-display');
    const hint = $('cal-status-hint');

    if (!date) {
      badge.textContent = 'NO DATE SELECTED';
      swap(badge, ['text-primary-container', 'font-semibold'], ['text-text-dim']);
      $('summary-date').textContent = 'None';
      hint.textContent = 'Select a match date to view and request available time windows.';
      hint.classList.remove('text-primary-container');
      return;
    }

    const monthName = MONTHS[date.month];
    badge.textContent = `${date.weekday}, ${date.day} ${monthName.substring(0, 3)}`;
    swap(badge, ['text-text-dim'], ['text-primary-container', 'font-semibold']);

    $('summary-date').textContent = `${date.day} ${monthName.substring(0, 3)}`;

    hint.textContent = `Selected match date: ${date.weekday}, ${date.day} ${monthName} ${date.year}`;
    hint.classList.add('text-primary-container');
  }

  function selectDate(date) {
    // The cell may have been drawn before midnight; never accept a day that is now past.
    syncClock();
    if (date.iso < isoOf(today.year, today.month, today.day)) return;
    state.date = date;
    // A new date means the picked window needs re-choosing (a typed custom note is kept).
    state.slot = null;
    renderCalendar();
    renderDateLabels();
    renderSlots();
    refreshBookedSlotsIfStale();
    renderSteps();

    // Keep keyboard focus on the chosen day after the grid re-renders.
    const selectedBtn = daysGrid.querySelector('[aria-pressed="true"]');
    if (selectedBtn) selectedBtn.focus({ preventScroll: true });
  }

  $('cal-prev-btn').addEventListener('click', () => {
    if (isCurrentOrPastMonth()) return;
    state.viewMonth--;
    if (state.viewMonth < 0) {
      state.viewMonth = 11;
      state.viewYear--;
    }
    renderCalendar();
  });

  $('cal-next-btn').addEventListener('click', () => {
    state.viewMonth++;
    if (state.viewMonth > 11) {
      state.viewMonth = 0;
      state.viewYear++;
    }
    renderCalendar();
  });

  /* ---- Step 3: time ----------------------------------------------- */

  const customInput = $('custom-time-input');
  const ALL_SLOTS = SLOT_WINDOWS.flatMap((group) => group.slots);

  // When a window begins on the given date, e.g. "11:00 PM - 12:00 AM" -> 23:00 that day.
  function slotStart(date, slotText) {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(slotText);
    if (!match) return null;
    const hours = (Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    return new Date(date.year, date.month, date.day, hours, Number(match[2]));
  }

  // Confirmed bookings from the shared database, as "YYYY-MM-DD|HH:MM". Pending requests are
  // never in here: only an organizer's confirmation makes a slot booked.
  let bookedSlots = new Set();
  // 'loading' until the first answer; 'ready' once booked slots are known; 'unavailable' if they
  // could not be loaded (or the site is not connected to Supabase yet).
  let availability = backend ? 'loading' : 'unavailable';

  function isBooked(date, slotText) {
    return bookedSlots.has(`${date.iso}|${slotStartTime(slotText)}`);
  }

  // 'open'   – can be requested
  // 'booked' – an organizer has confirmed someone for this date + window
  // 'past'   – the window has already started (today depends on the clock; future dates never are)
  function slotStatus(slotText, now = new Date()) {
    if (!state.date) return 'past';
    const start = slotStart(state.date, slotText);
    if (start && start.getTime() <= now.getTime()) return 'past';
    return isBooked(state.date, slotText) ? 'booked' : 'open';
  }

  function isSlotOpen(slotText, now = new Date()) {
    return Boolean(state.date) && slotStatus(slotText, now) === 'open';
  }

  // Each window's status right now – lets the clock tick re-render only on a change.
  function slotSignature() {
    if (!state.date) return availability;
    const now = new Date();
    return availability + ':' + state.date.iso + ':' + ALL_SLOTS.map((slot) => slotStatus(slot, now)[0]).join('');
  }

  let bookedSlotsLoadedAt = 0;
  let bookedSlotsRequest = null;

  // Reads which date + window pairs are booked. The database only exposes those two columns
  // to visitors – no customer details ever reach this page.
  function loadBookedSlots() {
    if (!backend) return Promise.resolve();
    if (bookedSlotsRequest) return bookedSlotsRequest;

    bookedSlotsRequest = (async () => {
      try {
        const { data, error } = await backend
          .from('booked_slots')
          .select('booking_date, slot_start')
          .gte('booking_date', isoOf(today.year, today.month, today.day))
          .abortSignal(AbortSignal.timeout(15000));
        if (error) throw error;
        bookedSlots = new Set(data.map((row) => `${row.booking_date}|${String(row.slot_start).slice(0, 5)}`));
        availability = 'ready';
      } catch (error) {
        // Do not keep showing a stale picture as if it were live.
        bookedSlots = new Set();
        availability = 'unavailable';
        console.error('Could not load booked slots:', error);
      } finally {
        bookedSlotsLoadedAt = Date.now();
        bookedSlotsRequest = null;
      }
      syncClock();
    })();
    return bookedSlotsRequest;
  }

  function refreshBookedSlotsIfStale() {
    if (!document.hidden && Date.now() - bookedSlotsLoadedAt > 10000) loadBookedSlots();
  }

  let renderedSignature = '';

  function renderSlots() {
    const promptBox = $('slot-prompt-box');
    const gridWrapper = $('slot-grid-wrapper');
    const periods = $('slot-periods-container');

    promptBox.classList.toggle('hidden', Boolean(state.date));
    gridWrapper.classList.toggle('hidden', !state.date);
    gridWrapper.classList.toggle('flex', Boolean(state.date));

    const now = new Date();
    if (state.slot && !isSlotOpen(state.slot, now)) state.slot = null;
    const focusedSlot = periods.contains(document.activeElement) ? document.activeElement.dataset.slot : null;

    periods.textContent = '';
    if (state.date) {
      const addNote = (id, text) => {
        const note = document.createElement('div');
        note.id = id;
        note.className = 'p-space-md bg-surface-elevated/40 border border-border-subtle/30 rounded-lg text-center';
        const noteText = document.createElement('p');
        noteText.className = 'font-body-sm text-[13px] text-text-dim italic';
        noteText.textContent = text;
        note.appendChild(noteText);
        periods.appendChild(note);
      };

      if (availability === 'unavailable') {
        addNote('slot-availability-note', 'Live bookings could not be loaded, so slots that are already booked are not marked here. The arena desk will confirm availability.');
      }

      const statuses = ALL_SLOTS.map((slot) => slotStatus(slot, now));
      if (!statuses.includes('open')) {
        addNote('slot-closed-note', statuses.includes('booked')
          ? 'No slot windows are left on this date. Choose another date or add a custom window note below.'
          : 'All of today’s slot windows have already started. Choose another date or add a custom window note below.');
      }

      SLOT_WINDOWS.forEach((group) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'flex flex-col space-y-1.5';

        const titleRow = document.createElement('div');
        titleRow.className = 'flex items-center gap-1.5 text-text-dim';
        titleRow.innerHTML = `<span class="material-symbols-outlined text-[14px] text-primary-container" aria-hidden="true">${group.icon}</span><span class="font-label-caps text-[10px] tracking-wider uppercase font-semibold">${group.group}</span>`;
        groupDiv.appendChild(titleRow);

        const pillsGrid = document.createElement('div');
        pillsGrid.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-1.5 md:gap-2';

        group.slots.forEach((slotText) => {
          const status = slotStatus(slotText, now);
          const open = status === 'open';
          const active = open && state.slot === slotText;
          const slotBtn = document.createElement('button');
          slotBtn.type = 'button';
          slotBtn.dataset.slot = slotText;
          slotBtn.setAttribute('aria-pressed', String(active));
          slotBtn.className = 'time-slot-pill min-h-[42px] px-2 py-1 rounded-lg border text-left flex items-center justify-between gap-1 transition-all text-[11px] min-[420px]:text-[12px] font-body-sm ';

          const label = document.createElement('span');
          // Keep the window on one line wherever the two-column grid has room for it.
          label.className = 'min-[380px]:whitespace-nowrap';
          label.textContent = slotText;
          slotBtn.appendChild(label);

          if (!open) {
            // Booked or already started: a native disabled button takes no click, tap or keyboard focus.
            slotBtn.disabled = true;
            slotBtn.dataset.status = status;
            slotBtn.className += 'bg-surface-elevated/40 text-[#52525b] border-dashed border-[#262626] cursor-not-allowed';
            label.classList.add('line-through');
            if (status === 'booked') {
              const tag = document.createElement('span');
              tag.className = 'font-label-caps text-[10px] uppercase tracking-wider text-status-booked shrink-0';
              tag.textContent = 'Booked';
              slotBtn.appendChild(tag);
              slotBtn.setAttribute('aria-label', `${slotText} – booked`);
            } else {
              slotBtn.setAttribute('aria-label', `${slotText} – unavailable, start time has passed`);
            }
            pillsGrid.appendChild(slotBtn);
            return;
          }

          slotBtn.className += 'active:scale-95 ' + (active
            ? 'bg-primary-container text-on-primary border-primary-container font-semibold shadow-[0_0_24px_rgba(245,213,71,0.22)]'
            : 'bg-surface-elevated text-on-surface border-border-subtle/50 hover:bg-surface-highlight hover:border-border-subtle');

          const icon = document.createElement('span');
          icon.className = 'material-symbols-outlined text-[16px]' + (active ? '' : ' text-text-dim');
          icon.setAttribute('aria-hidden', 'true');
          icon.textContent = active ? 'check_circle' : 'radio_button_unchecked';
          slotBtn.appendChild(icon);

          slotBtn.addEventListener('click', () => {
            // The clock may have passed the start since this pill was drawn.
            if (!isSlotOpen(slotText)) {
              syncClock();
              return;
            }
            state.slot = slotText;
            state.customTime = '';
            customInput.value = '';
            renderSlots();
            renderSteps();
            const again = periods.querySelector('[aria-pressed="true"]');
            if (again) again.focus({ preventScroll: true });
          });

          pillsGrid.appendChild(slotBtn);
        });

        groupDiv.appendChild(pillsGrid);
        periods.appendChild(groupDiv);
      });
    }

    renderedSignature = slotSignature();
    if (focusedSlot) {
      const refocus = Array.from(periods.querySelectorAll('.time-slot-pill')).find((pill) => pill.dataset.slot === focusedSlot && !pill.disabled);
      if (refocus) refocus.focus({ preventScroll: true });
    }

    // Header badge + summary tile
    const slotDisplay = $('selected-slot-display');
    const summarySlot = $('summary-slot');
    if (state.customTime) {
      slotDisplay.textContent = 'CUSTOM';
      summarySlot.textContent = state.customTime;
    } else if (state.slot) {
      const start = state.slot.split(' - ')[0];
      slotDisplay.textContent = `${start} SELECTED`;
      summarySlot.textContent = start;
    } else {
      slotDisplay.textContent = 'NONE SELECTED';
      summarySlot.textContent = 'None';
    }
  }

  customInput.addEventListener('input', () => {
    state.customTime = customInput.value.trim();
    if (state.customTime) state.slot = null;
    renderSlots();
    renderSteps();
  });

  /* ---- Keeping up with the clock ----------------------------------- */

  // Re-reads the local date and time. Returns true if a chosen date or window had to be cleared.
  function syncClock() {
    const fresh = readToday();
    const dayChanged = fresh.year !== today.year || fresh.month !== today.month || fresh.day !== today.day;
    today = fresh;
    let cleared = false;

    if (dayChanged) {
      // Midnight passed: yesterday is no longer bookable.
      if (state.date && state.date.iso < isoOf(today.year, today.month, today.day)) {
        state.date = null;
        state.slot = null;
        cleared = true;
        renderDateLabels();
      }
      if (state.viewYear < today.year || (state.viewYear === today.year && state.viewMonth < today.month)) {
        state.viewYear = today.year;
        state.viewMonth = today.month;
      }
      renderCalendar();
    }

    if (state.slot && !isSlotOpen(state.slot)) {
      state.slot = null;
      cleared = true;
    }

    if (dayChanged || cleared || slotSignature() !== renderedSignature) {
      renderSlots();
      renderSteps();
    }
    return cleared;
  }

  setInterval(syncClock, 1000);
  // Another visitor's request may get confirmed while this page is open.
  setInterval(refreshBookedSlotsIfStale, 60000);
  // Timers are throttled in background tabs, so catch up as soon as the page is looked at again.
  const catchUp = () => {
    syncClock();
    refreshBookedSlotsIfStale();
  };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) catchUp();
  });
  window.addEventListener('focus', catchUp);
  window.addEventListener('pageshow', catchUp);

  /* ---- Progress steps --------------------------------------------- */

  function renderSteps() {
    const done = {
      activity: Boolean(state.activity),
      date: Boolean(state.date),
      time: Boolean(state.slot || state.customTime),
      desk: state.submitted
    };
    document.querySelectorAll('#booking-steps [data-step]').forEach((step) => {
      const lit = done[step.dataset.step];
      const dot = step.querySelector('.step-dot');
      const label = step.querySelector('.step-label');
      if (lit) {
        swap(dot, ['bg-surface-highlight', 'text-text-dim'], ['bg-primary-container', 'text-on-primary', 'font-bold']);
        swap(label, ['text-text-dim'], ['text-on-surface']);
      } else {
        swap(dot, ['bg-primary-container', 'text-on-primary', 'font-bold'], ['bg-surface-highlight', 'text-text-dim']);
        swap(label, ['text-on-surface'], ['text-text-dim']);
      }
    });
  }

  /* ---- Step 4: send the request to the arena desk ------------------ */

  function buildWhatsAppUrl() {
    const value = (id) => $(id).value.trim();
    const date = state.date
      ? `${state.date.weekday}, ${state.date.day} ${MONTHS[state.date.month]} ${state.date.year}`
      : 'To be discussed';
    const time = state.customTime || state.slot || 'To be discussed';

    const lines = [
      'Hi Cage Sports Desk, I would like to request a slot confirmation.',
      '',
      `Activity: ${state.activity}`,
      `Date: ${date}`,
      `Time: ${time}`,
      `Name: ${value('player-name')}`,
      `Phone: ${value('player-phone')}`
    ];
    if (value('player-team')) lines.push(`Team: ${value('player-team')}`);
    if (value('player-notes')) lines.push(`Notes: ${value('player-notes')}`);

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  // What gets stored. Column names match public.booking_requests; the database sets
  // status = 'pending' itself and visitors have no permission to send anything else.
  function buildRequest() {
    const value = (id) => $(id).value.trim();
    return {
      activity: state.activity,
      booking_date: state.date ? state.date.iso : null,
      slot_start: state.slot && !state.customTime ? slotStartTime(state.slot) : null,
      custom_time: state.customTime || null,
      customer_name: value('player-name'),
      customer_phone: value('player-phone'),
      team: value('player-team') || null,
      notes: value('player-notes') || null
    };
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn.querySelector('span:last-child');
  const submitLabelText = submitLabel.textContent;
  const savedBanner = $('booking-confirmation-banner');
  const errorBanner = $('booking-error-banner');
  let saving = false;
  let lastSavedRequest = '';

  function setSaving(on) {
    saving = on;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.classList.toggle('opacity-60', on);
    submitBtn.classList.toggle('cursor-wait', on);
    submitLabel.textContent = on ? 'SAVING REQUEST…' : submitLabelText;
  }

  function showBanner(banner) {
    [savedBanner, errorBanner].forEach((el) => {
      el.classList.toggle('hidden', el !== banner);
      el.classList.toggle('flex', el === banner);
    });
    if (!banner) return;
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    banner.focus({ preventScroll: true });
  }

  // Nothing was stored: say so plainly and leave the desk's direct contacts as the way forward.
  function showSaveError(message, whatsAppUrl) {
    $('booking-error-message').textContent = message;
    $('booking-error-whatsapp-link').href = whatsAppUrl;
    state.submitted = false;
    renderSteps();
    showBanner(errorBanner);
  }

  function showSaved(whatsAppUrl) {
    $('booking-whatsapp-link').href = whatsAppUrl;
    state.submitted = true;
    renderSteps();
    showBanner(savedBanner);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!form.reportValidity()) return;

    // Never send a window that has started since it was picked.
    if (syncClock()) {
      $('time-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const url = buildWhatsAppUrl();
    const request = buildRequest();
    const requestKey = JSON.stringify(request);

    if (!backend) {
      showSaveError('Online booking requests are not switched on for this site yet, so your request has not been recorded.', url);
      return;
    }

    // Pressing the button again with the same details re-opens WhatsApp without storing a duplicate.
    if (requestKey === lastSavedRequest) {
      window.open(url, '_blank', 'noopener');
      showSaved(url);
      return;
    }

    // Browsers only allow a new tab to be opened during the tap itself, so reserve it now
    // and point it at WhatsApp once the request is safely stored.
    const whatsAppTab = window.open('', '_blank');
    const closeTab = () => {
      if (whatsAppTab && !whatsAppTab.closed) whatsAppTab.close();
    };

    showBanner(null);
    setSaving(true);
    try {
      await loadBookedSlots();
      if (request.slot_start && bookedSlots.has(`${request.booking_date}|${request.slot_start}`)) {
        closeTab();
        showSaveError('That slot has just been booked, so your request was not saved. Please choose another time window.', url);
        return;
      }

      const { error } = await backend
        .from('booking_requests')
        .insert(request)
        .abortSignal(AbortSignal.timeout(15000));
      if (error) throw error;
    } catch (error) {
      console.error('Could not save the booking request:', error);
      closeTab();
      showSaveError('We couldn’t save your request, so it has not been recorded or sent. Please check your connection and try again.', url);
      return;
    } finally {
      setSaving(false);
    }

    lastSavedRequest = requestKey;
    if (whatsAppTab && !whatsAppTab.closed) {
      whatsAppTab.opener = null;
      whatsAppTab.location.replace(url);
    }
    showSaved(url);
  });

  renderActivities();
  renderCalendar();
  renderSlots();
  renderSteps();
  loadBookedSlots();
})();
