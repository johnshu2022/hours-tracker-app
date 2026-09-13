(function () {
  'use strict';

  const H = window.Hourglass;

  function renderDashboardHeading(active) {
    const heading = document.getElementById('dashboard-title');
    if (!heading || !active) return;

    if (active.id === 'default') {
      heading.textContent = 'Your time, at a glance.';
      return;
    }

    const possessive = /s$/i.test(active.name) ? '\u2019' : '\u2019s';
    heading.textContent = active.name + possessive + ' time, at a glance.';
  }

  if (H) renderDashboardHeading(H.getActiveProfile());

  const switcher = document.getElementById('profile-switcher');
  const openButton = document.getElementById('create-profile-open');
  const dialog = document.getElementById('profile-dialog');
  const form = document.getElementById('profile-form');
  const nameInput = document.getElementById('profile-name');
  const message = document.getElementById('profile-message');
  if (!H || !switcher || !openButton || !dialog || !form || !nameInput || !message) return;

  function populate() {
    const active = H.getActiveProfile();
    switcher.textContent = '';
    H.getProfiles().forEach(function (profile) {
      switcher.appendChild(new Option(profile.name, profile.id));
    });
    switcher.value = active.id;
    switcher.setAttribute('aria-label', 'Current user: ' + active.name);
    renderDashboardHeading(active);
  }

  switcher.addEventListener('change', function () {
    try {
      H.setActiveProfile(switcher.value);
      window.location.reload();
    } catch (_error) {
      populate();
    }
  });

  openButton.addEventListener('click', function () {
    form.reset();
    message.textContent = '';
    dialog.showModal();
    nameInput.focus();
  });

  document.getElementById('profile-cancel').addEventListener('click', function () { dialog.close(); });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    try {
      const profile = H.createProfile(nameInput.value);
      H.setActiveProfile(profile.id);
      window.location.reload();
    } catch (error) {
      message.textContent = error && error.message ? error.message : 'The user could not be created.';
    }
  });

  populate();
})();
