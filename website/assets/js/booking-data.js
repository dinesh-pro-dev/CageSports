/* Shared by the Book Slot page and the organizer page: slot windows and the Supabase connection. */
(function initBookingData() {
  // Preferred windows only – the arena desk confirms real availability.
  const SLOT_WINDOWS = [
    {
      group: 'MORNING SLOTS',
      icon: 'wb_sunny',
      slots: ['06:00 AM - 07:00 AM', '07:00 AM - 08:00 AM', '08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM']
    },
    {
      group: 'AFTERNOON SLOTS',
      icon: 'light_mode',
      slots: ['02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM']
    },
    {
      group: 'EVENING / FLOODLIGHT',
      icon: 'sports_soccer',
      slots: ['06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM', '08:00 PM - 09:00 PM', '09:00 PM - 10:00 PM', '10:00 PM - 11:00 PM', '11:00 PM - 12:00 AM']
    }
  ];

  // "07:00 PM - 08:00 PM" -> "19:00" (the value stored in the database's slot_start column).
  function slotStartTime(slotText) {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(slotText || '');
    if (!match) return null;
    const hours = (Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    return `${String(hours).padStart(2, '0')}:${match[2]}`;
  }

  // "19:00:00" / "19:00" -> "07:00 PM - 08:00 PM", falling back to the start time alone
  // for a window that is not in the list above.
  function slotLabel(startTime) {
    const key = String(startTime || '').slice(0, 5);
    for (const group of SLOT_WINDOWS) {
      for (const slot of group.slots) {
        if (slotStartTime(slot) === key) return slot;
      }
    }
    const match = /^(\d{2}):(\d{2})$/.exec(key);
    if (!match) return '';
    const hours = Number(match[1]);
    return `${String(hours % 12 || 12).padStart(2, '0')}:${match[2]} ${hours < 12 ? 'AM' : 'PM'}`;
  }

  const config = window.CAGE_SPORTS_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase && window.supabase.createClient);

  // Returns null when the site has not been connected to Supabase yet (see README.md).
  function createClient(options) {
    if (!configured) return null;
    return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, options);
  }

  window.CageBooking = { SLOT_WINDOWS, slotStartTime, slotLabel, configured, createClient };
})();
