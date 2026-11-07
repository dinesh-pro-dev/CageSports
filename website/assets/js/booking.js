/* Book Slot page: activity → date → time → desk request. */
(function initBooking() {
  // Desk number that receives the Request Slot Confirmation message (country code + number, digits only).
  const WHATSAPP_NUMBER = '918056752258';

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Slot windows and the Supabase connection live in booking-data.js.
  const { SLOT_WINDOWS, slotStartTime } = window.CageBooking;
  // Visitors always use the public (anon) role; no session is kept on this page.
  const backend = window.CageBooking.createClient({
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const $ = (id) => document.getElementById(id);
  const daysGrid = $('calendar-days-grid');
  const form = $('reservation-form');
  if (!daysGrid || !form) return;

  const nameInput = $('player-name');
  const phoneInput = $('player-phone');
  const teamInput = $('player-team');
  const notesInput = $('player-notes');
  const customInput = $('custom-time-input');

  function setFieldInlineError(fieldId, errorMsg) {
    const input = $(fieldId);
    const errorEl = $(`${fieldId}-error`);
    if (!input) return;
    if (errorMsg) {
      input.classList.remove('border-border-subtle', 'focus:ring-primary-container', 'focus:border-primary-container');
      input.classList.add('border-status-booked', 'focus:ring-status-booked', 'focus:border-status-booked');
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `${fieldId}-error`);
      if (errorEl) {
        const textSpan = errorEl.querySelector('.error-text') || errorEl;
        textSpan.textContent = errorMsg;
        errorEl.classList.remove('hidden');
        errorEl.classList.add('flex');
      }
    } else {
      input.classList.remove('border-status-booked', 'focus:ring-status-booked', 'focus:border-status-booked');
      input.classList.add('border-border-subtle', 'focus:ring-primary-container', 'focus:border-primary-container');
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.classList.remove('flex');
        const textSpan = errorEl.querySelector('.error-text') || errorEl;
        textSpan.textContent = '';
      }
    }
  }

  function validateName(raw) {
    const val = (raw || '').trim().replace(/\s+/g, ' ');
    if (
      !val ||
      val.length < 2 ||
      val.length > 80 ||
      /\d/.test(val) ||
      !/\p{L}/u.test(val) ||
      !/^[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*(?: [\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*)*$/u.test(val)
    ) {
      return { valid: false, message: 'Invalid name' };
    }
    return { valid: true, value: val };
  }

  function validatePhone(raw) {
    const val = (raw || '').trim();
    if (!val || /[^0-9]/.test(val) || val.length !== 10 || !/^[6-9]/.test(val)) {
      return { valid: false, message: 'Invalid phone number' };
    }
    return { valid: true, value: val };
  }

  function validateTeam(raw) {
    const val = (raw || '').trim().replace(/\s+/g, ' ');
    if (!val) return { valid: true, value: '' };
    if (val.length > 80) return { valid: false, message: 'Team name must not exceed 80 characters.' };
    if (!/^[\p{L}\p{M}0-9\s'-]+$/u.test(val)) {
      return { valid: false, message: 'Team name can only contain letters, numbers, spaces, hyphens, and apostrophes.' };
    }
    return { valid: true, value: val };
  }

  function validateNotes(raw) {
    const val = (raw || '').trim();
    if (!val) return { valid: true, value: '' };
    if (val.length > 500) return { valid: false, message: 'Notes must not exceed 500 characters.' };
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(val)) {
      return { valid: false, message: 'Notes contain invalid control characters.' };
    }
    return { valid: true, value: val };
  }

  function validateCustomTime(raw) {
    const val = (raw || '').trim().replace(/\s+/g, ' ');
    if (!val) return { valid: true, value: '' };
    if (val.length < 3) return { valid: false, message: 'Custom window note must be at least 3 characters.' };
    if (val.length > 120) return { valid: false, message: 'Custom window note must not exceed 120 characters.' };
    if (!/^[a-zA-Z0-9\s:\-.,()\/+]+$/.test(val)) {
      return { valid: false, message: 'Custom window note contains invalid characters.' };
    }
    return { valid: true, value: val };
  }

  if (nameInput) {
    nameInput.addEventListener('blur', () => {
      const res = validateName(nameInput.value);
      if (!res.valid) {
        setFieldInlineError('player-name', res.message);
      } else {
        setFieldInlineError('player-name', '');
        nameInput.value = res.value;
      }
    });
    nameInput.addEventListener('input', () => {
      if (nameInput.getAttribute('aria-invalid') === 'true') {
        const res = validateName(nameInput.value);
        if (res.valid) setFieldInlineError('player-name', '');
      }
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener('blur', () => {
      const res = validatePhone(phoneInput.value);
      if (!res.valid) {
        setFieldInlineError('player-phone', res.message);
      } else {
        setFieldInlineError('player-phone', '');
        phoneInput.value = res.value;
      }
    });
    phoneInput.addEventListener('input', () => {
      if (phoneInput.getAttribute('aria-invalid') === 'true') {
        const res = validatePhone(phoneInput.value);
        if (res.valid) setFieldInlineError('player-phone', '');
      }
    });
  }

  if (teamInput) {
    teamInput.addEventListener('blur', () => {
      const res = validateTeam(teamInput.value);
      if (!res.valid) {
        setFieldInlineError('player-team', res.message);
      } else {
        setFieldInlineError('player-team', '');
        if (teamInput.value) teamInput.value = res.value;
      }
    });
    teamInput.addEventListener('input', () => {
      if (teamInput.getAttribute('aria-invalid') === 'true') {
        const res = validateTeam(teamInput.value);
        if (res.valid) setFieldInlineError('player-team', '');
      }
    });
  }

  if (notesInput) {
    notesInput.addEventListener('blur', () => {
      const res = validateNotes(notesInput.value);
      if (!res.valid) {
        setFieldInlineError('player-notes', res.message);
      } else {
        setFieldInlineError('player-notes', '');
        if (notesInput.value) notesInput.value = res.value;
      }
    });
    notesInput.addEventListener('input', () => {
      if (notesInput.getAttribute('aria-invalid') === 'true') {
        const res = validateNotes(notesInput.value);
        if (res.valid) setFieldInlineError('player-notes', '');
      }
    });
  }

  if (customInput) {
    customInput.addEventListener('blur', () => {
      if (state.customTime) {
        const res = validateCustomTime(customInput.value);
        if (!res.valid) {
          setFieldInlineError('custom-time-input', res.message);
        } else {
          setFieldInlineError('custom-time-input', '');
          customInput.value = res.value;
          state.customTime = res.value;
        }
      } else {
        setFieldInlineError('custom-time-input', '');
      }
    });
  }

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

  let currentSubmitLabel = 'CONFIRM & BOOK SLOT';

  const state = {
    activity: '5 a-side football',
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
      hint.textContent = 'Select a match date to view available time slots.';
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

  const ALL_SLOTS = SLOT_WINDOWS.flatMap((group) => group.slots);

  // When a window begins on the given date, e.g. "11:00 PM - 12:00 AM" -> 23:00 that day.
  function slotStart(date, slotText) {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(slotText);
    if (!match) return null;
    const hours = (Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    return new Date(date.year, date.month, date.day, hours, Number(match[2]));
  }

  // Confirmed bookings from the shared database, as "YYYY-MM-DD|HH:MM". Pending requests are
  // never in here: only confirmed bookings make a slot booked.
  let bookedSlots = new Set();
  // 'loading' until the first answer; 'ready' once booked slots are known; 'unavailable' if they
  // could not be loaded (or the site is not connected to Supabase yet).
  let availability = backend ? 'loading' : 'unavailable';

  function isBooked(date, slotText) {
    return bookedSlots.has(`${date.iso}|${slotStartTime(slotText)}`);
  }

  // 'open'   – can be requested
  // 'booked' – a confirmed booking exists for this date + window
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
            slotBtn.className += 'bg-surface-elevated/40 text-text-disabled border-dashed border-hairline cursor-not-allowed';
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

    updateBookingMode();
  }

  function updateBookingMode() {
    const isCustom = Boolean(state.customTime);
    const modeBadge = $('slot-mode-badge');
    const modeDesc = $('slot-mode-description');
    const summaryType = $('summary-booking-type');
    const policyNotice = $('booking-policy-notice');
    const submitLabel = $('submit-btn-label') || (submitBtn && submitBtn.querySelector('span:last-child'));

    if (modeBadge) modeBadge.textContent = isCustom ? 'Inquiry Mode' : 'Instant Booking';
    if (modeDesc) {
      modeDesc.textContent = isCustom
        ? 'Custom time windows require confirmation from the arena desk. Enter your preferred hours above.'
        : 'Select your match time window. Standard slots are confirmed and reserved immediately in our system.';
    }
    if (summaryType) summaryType.textContent = isCustom ? 'Inquiry' : 'Instant Booking';
    if (policyNotice) {
      policyNotice.textContent = isCustom
        ? 'Custom time windows are saved as pending inquiries. The arena desk will review your timing and reach out via WhatsApp/Phone.'
        : 'Standard slots are confirmed and reserved immediately in our system upon submission. A pre-filled WhatsApp message will open so you can notify the arena desk.';
    }
    currentSubmitLabel = isCustom ? 'SEND INQUIRY TO DESK' : 'CONFIRM & BOOK SLOT';
    if (!saving && submitLabel) {
      submitLabel.textContent = currentSubmitLabel;
    }
  }

  customInput.addEventListener('input', () => {
    state.customTime = customInput.value.trim();
    if (state.customTime) state.slot = null;
    if (customInput.getAttribute('aria-invalid') === 'true') {
      const res = validateCustomTime(customInput.value);
      if (res.valid) setFieldInlineError('custom-time-input', '');
    }
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
    const nameVal = nameInput ? nameInput.value.trim().replace(/\s+/g, ' ') : '';
    const phoneVal = phoneInput ? phoneInput.value.trim() : '';
    const teamVal = teamInput ? teamInput.value.trim().replace(/\s+/g, ' ') : '';
    const notesVal = notesInput ? notesInput.value.trim() : '';

    const date = state.date
      ? `${state.date.weekday}, ${state.date.day} ${MONTHS[state.date.month]} ${state.date.year}`
      : 'To be discussed';
    const time = state.customTime || state.slot || 'To be discussed';
    const intro = state.customTime
      ? 'Hi Cage Sports Desk, I would like to inquire about a custom booking.'
      : 'Hi Cage Sports Desk, I have booked a slot online.';

    const lines = [
      intro,
      '',
      `Activity: ${state.activity}`,
      `Date: ${date}`,
      `Time: ${time}`,
      `Name: ${nameVal}`,
      `Phone: ${phoneVal}`
    ];
    if (teamVal) lines.push(`Team: ${teamVal}`);
    if (notesVal) lines.push(`Notes: ${notesVal}`);

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  // What gets stored. Column names match public.booking_requests; the database sets
  // status = 'pending' itself and visitors have no permission to send anything else.
  function buildRequest() {
    const nameRes = validateName(nameInput ? nameInput.value : '');
    const phoneRes = validatePhone(phoneInput ? phoneInput.value : '');
    const teamRes = validateTeam(teamInput ? teamInput.value : '');
    const notesRes = validateNotes(notesInput ? notesInput.value : '');
    const customRes = validateCustomTime(customInput ? customInput.value : '');

    return {
      activity: state.activity,
      booking_date: state.date ? state.date.iso : null,
      slot_start: state.slot && !state.customTime ? slotStartTime(state.slot) : null,
      custom_time: (state.customTime && customRes.valid && customRes.value) ? customRes.value : null,
      customer_name: nameRes.valid ? nameRes.value : (nameInput ? nameInput.value.trim() : ''),
      customer_phone: phoneRes.valid ? phoneRes.value : (phoneInput ? phoneInput.value.trim() : ''),
      team: (teamRes.valid && teamRes.value) ? teamRes.value : null,
      notes: (notesRes.valid && notesRes.value) ? notesRes.value : null
    };
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = $('submit-btn-label') || submitBtn.querySelector('span:last-child');
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
    submitLabel.textContent = on ? 'SAVING…' : currentSubmitLabel;
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
    const bookAnotherBtn = $('book-another-btn');
    if (bookAnotherBtn) bookAnotherBtn.classList.add('hidden');
    state.submitted = false;
    renderSteps();
    showBanner(errorBanner);
  }

  function showSaved(whatsAppUrl, status = 'confirmed') {
    $('booking-whatsapp-link').href = whatsAppUrl;
    const titleEl = $('booking-confirmation-title');
    const textEl = $('booking-confirmation-text');
    if (status === 'confirmed') {
      if (titleEl) titleEl.textContent = 'Slot Confirmed & Reserved!';
      if (textEl) textEl.textContent = 'Your slot is confirmed and reserved immediately in our system! WhatsApp has been opened with your booking details so you can notify the desk.';
    } else {
      if (titleEl) titleEl.textContent = 'Inquiry Received – Pending Desk Confirmation';
      if (textEl) textEl.textContent = 'Your custom inquiry has been received and saved as pending. WhatsApp has been opened with your details so you can coordinate with the desk.';
    }
    const bookAnotherBtn = $('book-another-btn');
    if (bookAnotherBtn) bookAnotherBtn.classList.remove('hidden');
    state.submitted = true;
    renderSteps();
    showBanner(savedBanner);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    showBanner(null);

    // Validate customer inputs
    const nameRes = validateName(nameInput ? nameInput.value : '');
    const phoneRes = validatePhone(phoneInput ? phoneInput.value : '');
    const teamRes = validateTeam(teamInput ? teamInput.value : '');
    const notesRes = validateNotes(notesInput ? notesInput.value : '');
    const customRes = validateCustomTime(customInput ? customInput.value : '');

    let firstInvalid = null;

    if (!nameRes.valid) {
      setFieldInlineError('player-name', nameRes.message);
      if (!firstInvalid) firstInvalid = nameInput;
    } else {
      setFieldInlineError('player-name', '');
      if (nameInput) nameInput.value = nameRes.value;
    }

    if (!phoneRes.valid) {
      setFieldInlineError('player-phone', phoneRes.message);
      if (!firstInvalid) firstInvalid = phoneInput;
    } else {
      setFieldInlineError('player-phone', '');
      if (phoneInput) phoneInput.value = phoneRes.value;
    }

    if (!teamRes.valid) {
      setFieldInlineError('player-team', teamRes.message);
      if (!firstInvalid) firstInvalid = teamInput;
    } else {
      setFieldInlineError('player-team', '');
      if (teamInput && teamInput.value) teamInput.value = teamRes.value;
    }

    if (!notesRes.valid) {
      setFieldInlineError('player-notes', notesRes.message);
      if (!firstInvalid) firstInvalid = notesInput;
    } else {
      setFieldInlineError('player-notes', '');
      if (notesInput && notesInput.value) notesInput.value = notesRes.value;
    }

    if (state.customTime && !customRes.valid) {
      setFieldInlineError('custom-time-input', customRes.message);
      if (!firstInvalid) firstInvalid = customInput;
    } else {
      setFieldInlineError('custom-time-input', '');
      if (customInput && customInput.value) customInput.value = customRes.value;
    }

    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid.focus();
      return;
    }

    // Validate activity selection against supported whitelist
    const VALID_ACTIVITIES = new Set([
      '5 a-side football',
      '6 a-side football',
      '7 a-side football',
      'Indoor cricket',
      'Softball batting cage',
      'Birthday parties (Inquiry)',
      'Corporate & school events (Inquiry)'
    ]);

    if (!state.activity || !VALID_ACTIVITIES.has(state.activity)) {
      $('activity-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      showSaveError('Please select a valid sport or event activity from the list.', buildWhatsAppUrl());
      return;
    }

    // Both concrete bookings and custom-time inquiries require a valid calendar date.
    if (!state.date) {
      $('date-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      showSaveError('Please select a booking date on the calendar.', buildWhatsAppUrl());
      return;
    }

    // A standard slot or custom time window is required.
    if (!state.slot && !state.customTime) {
      $('time-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      showSaveError('Please select a time slot or specify a custom time window.', buildWhatsAppUrl());
      return;
    }

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
      try {
        window.open(url, '_blank', 'noopener');
      } catch {}
      showSaved(url, request.custom_time ? 'pending' : 'confirmed');
      return;
    }

    showBanner(null);
    setSaving(true);
    try {
      // Fast local check against already-loaded booked slots
      await loadBookedSlots();
      if (request.slot_start && bookedSlots.has(`${request.booking_date}|${request.slot_start}`)) {
        showSaveError('That slot has just been booked, so your request was not saved. Please choose another time window.', url);
        return;
      }

      // Atomic submission via secure PostgreSQL function
      const { data, error } = await backend
        .rpc('submit_instant_booking', {
          p_activity: request.activity,
          p_booking_date: request.booking_date,
          p_slot_start: request.slot_start,
          p_custom_time: request.custom_time,
          p_customer_name: request.customer_name,
          p_customer_phone: request.customer_phone,
          p_team: request.team,
          p_notes: request.notes
        })
        .abortSignal(AbortSignal.timeout(15000));

      if (error) {
        const errStr = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
        if (errStr.includes('slot_already_booked')) {
          await loadBookedSlots();
          showSaveError('That slot has just been booked, so your request was not saved. Please choose another time window.', url);
          return;
        }
        if (errStr.includes('booking_date_in_past') || errStr.includes('booking_slot_in_past')) {
          showSaveError('The selected booking date or slot has already passed. Please choose an upcoming window.', url);
          return;
        }
        if (errStr.includes('invalid_activity')) {
          $('activity-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
          showSaveError('Selected activity is not recognized. Please choose an activity from the list.', url);
          return;
        }
        if (errStr.includes('invalid_customer_name')) {
          setFieldInlineError('player-name', 'Invalid name');
          if (nameInput) {
            nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInput.focus();
          }
          return;
        }
        if (errStr.includes('invalid_customer_phone')) {
          setFieldInlineError('player-phone', 'Invalid phone number');
          if (phoneInput) {
            phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            phoneInput.focus();
          }
          return;
        }
        if (errStr.includes('invalid_team')) {
          setFieldInlineError('player-team', 'Team name can only contain letters, numbers, spaces, hyphens, and apostrophes (max 80 chars).');
          if (teamInput) {
            teamInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            teamInput.focus();
          }
          return;
        }
        if (errStr.includes('invalid_notes')) {
          setFieldInlineError('player-notes', 'Notes must not exceed 500 characters.');
          if (notesInput) {
            notesInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            notesInput.focus();
          }
          return;
        }
        if (errStr.includes('invalid_custom_time')) {
          setFieldInlineError('custom-time-input', 'Custom window note must be 3-120 characters.');
          if (customInput) {
            customInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            customInput.focus();
          }
          return;
        }
        throw error;
      }

      // Verify that the function returned a valid booking response
      if (!data || !data.id || !data.status) {
        throw new Error('Invalid response received from booking service.');
      }

      lastSavedRequest = requestKey;

      // If slot was instantly confirmed, update the slot grid in background
      if (data.status === 'confirmed') {
        loadBookedSlots();
      }

      // Open WhatsApp click-to-chat strictly after successful database insertion.
      // Handled with popup-blocking fallback so a blocked popup never reports failure.
      try {
        const whatsAppWindow = window.open(url, '_blank', 'noopener');
        if (!whatsAppWindow || whatsAppWindow.closed || typeof whatsAppWindow.closed === 'undefined') {
          console.info('WhatsApp popup was blocked by browser. User can tap the link in the confirmation banner.');
        }
      } catch (openErr) {
        console.warn('Unable to open WhatsApp window automatically:', openErr);
      }

      showSaved(url, data.status);
    } catch (error) {
      console.error('Could not save the booking request:', error);
      showSaveError('We couldn’t save your request, so it has not been recorded or sent. Please check your connection and try again.', url);
      return;
    } finally {
      setSaving(false);
    }
  });

  const bookAnotherBtn = $('book-another-btn');
  if (bookAnotherBtn) {
    bookAnotherBtn.addEventListener('click', async () => {
      // 1. Hide the previous success banner
      showBanner(null);
      bookAnotherBtn.classList.add('hidden');

      // 2. Reset customer fields and clear inline errors
      if (nameInput) nameInput.value = '';
      if (phoneInput) phoneInput.value = '';
      if (teamInput) teamInput.value = '';
      if (notesInput) notesInput.value = '';
      if (customInput) customInput.value = '';

      setFieldInlineError('player-name', '');
      setFieldInlineError('player-phone', '');
      setFieldInlineError('player-team', '');
      setFieldInlineError('player-notes', '');
      setFieldInlineError('custom-time-input', '');

      // 3. Clear date and time slot state, preserve current activity selection
      state.date = null;
      state.slot = null;
      state.customTime = '';
      state.submitted = false;
      lastSavedRequest = '';

      // 4. Reset UI components, calendar, and booking summary
      renderCalendar();
      renderDateLabels();
      renderSlots();
      renderSteps();

      // 5. Refresh booked slots from Supabase before allowing another booking
      await loadBookedSlots();

      // 6. Scroll customer back to the activity/date selection section
      const target = $('date-section') || $('activity-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  renderActivities();
  renderCalendar();
  renderSlots();
  renderSteps();
  loadBookedSlots();
})();
