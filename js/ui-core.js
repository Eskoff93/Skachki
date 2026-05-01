// Shared base UI helpers.

window.SKACHKI_UI = (function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function allScreens() {
    return Array.prototype.slice.call(document.querySelectorAll('.screen'));
  }

  function hideAllScreens() {
    allScreens().forEach(function (screen) {
      screen.classList.remove('active');
    });
  }

  function showScreenById(screenId) {
    hideAllScreens();
    var screen = byId(screenId);
    if (screen) screen.classList.add('active');
    return screen;
  }

  function showToast(message, duration) {
    var toast = byId('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('active');

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.classList.remove('active');
    }, duration || 1800);
  }

  return {
    byId: byId,
    hideAllScreens: hideAllScreens,
    showScreenById: showScreenById,
    showToast: showToast
  };
})();
