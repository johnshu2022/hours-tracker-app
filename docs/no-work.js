(function () {
  'use strict';

  const H = window.Hourglass;
  const button = document.getElementById('no-work-action');
  if (!H || !button) return;

  function todayKey() {
    return H.dateKey(new Date());
  }

  function render() {
    const today = todayKey();
    const activeShift = H.getActiveShift();
    const marked = Boolean(H.getNoWorkRecord(today));
    const action = document.getElementById('clock-action');
    const job = document.getElementById('quick-job');
    const title = document.getElementById('quick-clock-title');
    const status = document.getElementById('clock-status');
    const dayDetail = document.getElementById('day-detail');

    button.classList.toggle('hidden', Boolean(activeShift));
    button.classList.toggle('undo', marked);
    button.textContent = marked ? 'Undo no work' : 'No Work Today';
    if (action) action.disabled = marked;
    if (job) job.disabled = Boolean(activeShift) || marked;
    if (!activeShift && title) title.textContent = marked ? 'No work today' : 'Not clocked in';
    if (!activeShift && status) status.textContent = marked ? 'Today is marked as a non-working day.' : 'Use Quick Clock to record today’s shift.';
    if (dayDetail && !H.getShifts().some(function (shift) { return shift.date === today; })) {
      dayDetail.textContent = marked ? 'Marked as no work today' : 'No hours recorded';
    }
  }

  button.addEventListener('click', function () {
    const today = todayKey();
    const status = document.getElementById('clock-status');
    if (H.getActiveShift()) {
      if (status) status.textContent = 'Clock out before marking today as a non-working day.';
      return;
    }
    const marking = !H.getNoWorkRecord(today);
    const todayShiftCount = H.getShifts().filter(function (shift) { return shift.date === today; }).length;
    if (marking && todayShiftCount) {
      if (status) status.textContent = 'No Work Today cannot be selected because ' + todayShiftCount + (todayShiftCount === 1 ? ' shift is' : ' shifts are') + ' already recorded for today.';
      return;
    }
    try {
      if (marking) {
        H.setNoWorkDate(today);
        H.clearClockPhoto();
      } else {
        H.clearNoWorkDate(today);
      }
      render();
      window.dispatchEvent(new Event('hourglass:no-work-changed'));
    } catch (_error) {
      if (status) status.textContent = 'The no-work status could not be saved in this browser.';
    }
  });

  render();
})();
