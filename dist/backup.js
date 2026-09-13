(function () {
  'use strict';

  const MAX_BACKUP_SIZE = 25 * 1024 * 1024;
  const H = window.Hourglass;
  const downloadButton = document.getElementById('download-backup');
  const chooseButton = document.getElementById('choose-backup');
  const fileInput = document.getElementById('backup-file');
  const message = document.getElementById('backup-message');
  const dialog = document.getElementById('restore-dialog');
  const summary = document.getElementById('restore-summary');
  const restoreMessage = document.getElementById('restore-message');
  let pendingBackup = null;

  if (!H || !downloadButton || !chooseButton || !fileInput || !message || !dialog || !summary || !restoreMessage) return;

  function counts(backup) {
    return backup.profiles.reduce(function (totals, profile) {
      totals.shifts += profile.shifts.length;
      totals.noWorkDays += profile.noWorkRecords.length;
      totals.jobs += profile.settings.jobs.length;
      totals.payments += profile.payments.length;
      totals.images += profile.shifts.filter(function (shift) { return Boolean(shift.image); }).length;
      if (profile.clockPhoto) totals.images += 1;
      return totals;
    }, { shifts: 0, noWorkDays: 0, jobs: 0, payments: 0, images: 0 });
  }

  function addSummaryItem(text) {
    const item = document.createElement('li');
    item.textContent = text;
    summary.appendChild(item);
  }

  function showRestorePreview(backup) {
    const totals = counts(backup);
    summary.textContent = '';
    addSummaryItem(backup.profiles.length + (backup.profiles.length === 1 ? ' user' : ' users'));
    addSummaryItem(totals.shifts + (totals.shifts === 1 ? ' shift' : ' shifts'));
    addSummaryItem(totals.noWorkDays + (totals.noWorkDays === 1 ? ' no-work day' : ' no-work days'));
    addSummaryItem(totals.jobs + (totals.jobs === 1 ? ' configured job' : ' configured jobs'));
    addSummaryItem(totals.payments + (totals.payments === 1 ? ' payment record' : ' payment records'));
    addSummaryItem(totals.images + (totals.images === 1 ? ' saved image' : ' saved images'));
    restoreMessage.textContent = '';
    dialog.showModal();
  }

  function downloadBackup() {
    try {
      const backup = H.createFullBackup();
      const contents = JSON.stringify(backup, null, 2);
      const url = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hourglass-full-backup-' + H.dateKey(new Date()) + '.json';
      link.click();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      const totals = counts(backup);
      message.textContent = 'Full backup downloaded: ' + backup.profiles.length + (backup.profiles.length === 1 ? ' user and ' : ' users and ') + totals.shifts + (totals.shifts === 1 ? ' shift.' : ' shifts.');
    } catch (_error) {
      message.textContent = 'The backup could not be created. Check that browser storage is available.';
    }
  }

  function readBackupFile(file) {
    if (!file) return;
    if (file.size > MAX_BACKUP_SIZE) {
      message.textContent = 'Choose a backup file that is 25 MB or smaller.';
      fileInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', function () {
      try {
        const text = String(reader.result || '');
        if (text.length > MAX_BACKUP_SIZE) throw new RangeError('The backup file is too large.');
        pendingBackup = H.validateFullBackup(JSON.parse(text));
        message.textContent = '';
        showRestorePreview(pendingBackup);
      } catch (error) {
        pendingBackup = null;
        message.textContent = error && error.message ? error.message : 'The selected backup could not be read.';
      }
      fileInput.value = '';
    });
    reader.addEventListener('error', function () {
      pendingBackup = null;
      message.textContent = 'The selected backup could not be read.';
      fileInput.value = '';
    });
    reader.readAsText(file);
  }

  downloadButton.addEventListener('click', downloadBackup);
  chooseButton.addEventListener('click', function () {
    message.textContent = '';
    fileInput.click();
  });
  fileInput.addEventListener('change', function () {
    readBackupFile(fileInput.files && fileInput.files[0]);
  });
  document.getElementById('cancel-restore').addEventListener('click', function () {
    pendingBackup = null;
    dialog.close();
  });
  document.getElementById('confirm-restore').addEventListener('click', function () {
    if (!pendingBackup) return;
    try {
      const restored = H.restoreFullBackup(pendingBackup);
      try {
        sessionStorage.setItem('hourglass.restoreMessage', 'Restored ' + restored.profiles.length + (restored.profiles.length === 1 ? ' user.' : ' users.'));
      } catch (_error) {
        // A successful restore should still reload when session storage is unavailable.
      }
      window.location.reload();
    } catch (_error) {
      restoreMessage.textContent = 'The restore could not be completed. Your previous Hourglass data was retained.';
    }
  });

  let restoredMessage = '';
  try { restoredMessage = sessionStorage.getItem('hourglass.restoreMessage') || ''; } catch (_error) { restoredMessage = ''; }
  if (restoredMessage) {
    try { sessionStorage.removeItem('hourglass.restoreMessage'); } catch (_error) { /* Nothing to clear. */ }
    message.textContent = restoredMessage;
  }
})();
