// Persistence helpers.
// Responsible only for saving/loading plain game state.

window.SKACHKI_STATE = (function () {
  var SAVE_KEY = 'skachki_proto_toptrack_v2';

  function save(state) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    SAVE_KEY: SAVE_KEY,
    save: save,
    load: load,
    reset: reset
  };
})();
