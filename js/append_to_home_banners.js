// HOME banner visibility override — append at the END of the latest js/home_banners.js.
// Keep the current Party Soiree entry and all of its navigation/action logic unchanged.
// Hide all other banners without deleting their definitions or event content.
if (Array.isArray(window.HOME_EVENT_BANNERS)) {
  window.HOME_EVENT_BANNERS.forEach(function (banner) {
    if (!banner || typeof banner !== 'object') return;
    // PARTY entry is identified from its id / image / alternative text.
    var id = String(banner.id || '').toLowerCase();
    var img = String(banner.img || '').toLowerCase();
    var alt = String(banner.alt || '').toLowerCase();
    var isRaid = id === 'event_daily_raid';
    var isParty = id.includes('party') || id.includes('soiree') ||
                  img.includes('event_party') || img.includes('soiree') ||
                  alt.includes('パラレル') || alt.includes('ソワレ');
    banner.hidden = !(isRaid || isParty);
  });
}
