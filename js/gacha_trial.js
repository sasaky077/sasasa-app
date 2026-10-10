/* ZERAPHIA Gacha Trial — bridge to the genuine ShootingCore engine. No separate simulator. */
(function () {
  'use strict';
  let pending = false;
  async function start(characterId) {
    const id = Number(characterId);
    if (id !== 36 && id !== 40 || pending) return false;
    pending = true;
    try {
      if (window.__sasaphiaShootingModulesReady) await window.__sasaphiaShootingModulesReady;
      if (typeof window.openShootingTrial !== 'function') throw new Error('ShootingCore trial entry not loaded');
      const result = window.openShootingTrial(id);
      if (result === false) throw new Error('Trial start rejected');
      return true;
    } catch (error) {
      console.error('[gacha trial] failed to start', error);
      if (typeof window.showToast === 'function') window.showToast('試遊を開始できませんでした');
      return false;
    } finally {
      pending = false;
    }
  }
  function close() {
    if (typeof window.closeShootingEvent === 'function') return window.closeShootingEvent();
    return false;
  }
  window.ZeraphiaGachaTrial = { start, close };
})();
