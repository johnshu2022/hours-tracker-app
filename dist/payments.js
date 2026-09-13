(function () {
  'use strict';

  const H = window.Hourglass;
  const settings = H.getSettings();
  const form = document.getElementById('payment-form');
  const idInput = document.getElementById('payment-id');
  const jobInput = document.getElementById('payment-job');
  const paymentDateInput = document.getElementById('payment-date');
  const periodStartInput = document.getElementById('payment-period-start');
  const periodEndInput = document.getElementById('payment-period-end');
  const methodInput = document.getElementById('payment-method');
  const referenceInput = document.getElementById('payment-reference');
  const grossInput = document.getElementById('payment-gross');
  const netInput = document.getElementById('payment-net');
  const notesInput = document.getElementById('payment-notes');
  const shiftList = document.getElementById('payment-shift-list');
  const expectedOutput = document.getElementById('payment-expected');
  const selectedHoursOutput = document.getElementById('payment-selected-hours');
  const formMessage = document.getElementById('payment-form-message');
  const cancelEditButton = document.getElementById('cancel-payment-edit');
  let selectedShiftIds = new Set();

  function currentMonthRange() {
    const today = new Date();
    const month = H.dateKey(today).slice(0, 7);
    return { start: month + '-01', end: H.dateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
  }

  function jobName(value) {
    return String(value || '').trim() || 'Unassigned';
  }

  function methodName(value) {
    return { 'direct-deposit': 'Direct deposit', check: 'Check', cash: 'Cash', other: 'Other' }[value] || 'Other';
  }

  function populateJobs(preferred) {
    const names = [];
    const seen = new Set();
    settings.jobs.forEach(function (job) {
      if (!seen.has(job.name)) { seen.add(job.name); names.push(job.name); }
    });
    H.getShifts().forEach(function (shift) {
      const name = String(shift.job || '').trim();
      if (name && !seen.has(name)) { seen.add(name); names.push(name); }
    });
    H.getPayments().forEach(function (payment) {
      const name = String(payment.job || '').trim();
      if (name && !seen.has(name)) { seen.add(name); names.push(name); }
    });
    jobInput.textContent = '';
    jobInput.appendChild(new Option('Unassigned', ''));
    names.forEach(function (name) { jobInput.appendChild(new Option(name, name)); });
    const requested = preferred == null ? settings.defaultJob : preferred;
    jobInput.value = Array.from(jobInput.options).some(function (option) { return option.value === requested; }) ? requested : '';
  }

  function selectedShifts() {
    const selected = selectedShiftIds;
    return H.getShifts().filter(function (shift) { return selected.has(shift.id); });
  }

  function expectedGross(shifts) {
    return Math.round(shifts.reduce(function (sum, shift) {
      return sum + H.shiftMinutes(shift) / 60 * H.getShiftHourlyWage(shift, settings);
    }, 0) * 100) / 100;
  }

  function updateExpected() {
    const shifts = selectedShifts();
    const minutes = shifts.reduce(function (sum, shift) { return sum + H.shiftMinutes(shift); }, 0);
    expectedOutput.textContent = H.formatCurrency(expectedGross(shifts), settings.currency);
    selectedHoursOutput.textContent = H.formatDecimalHours(minutes) + ' hours';
  }

  function renderShiftChoices() {
    const currentPayment = H.getPayments().find(function (payment) { return payment.id === idInput.value; }) || null;
    const currentIds = new Set(currentPayment ? currentPayment.shiftIds : []);
    const linkedElsewhere = new Set();
    H.getPayments().forEach(function (payment) {
      if (!currentPayment || payment.id !== currentPayment.id) {
        payment.shiftIds.forEach(function (shiftId) { linkedElsewhere.add(shiftId); });
      }
    });
    const start = periodStartInput.value;
    const end = periodEndInput.value;
    const eligible = H.getShifts().filter(function (shift) {
      if (String(shift.job || '') !== jobInput.value) return false;
      if (!start || !end || shift.date < start || shift.date > end) return false;
      if (linkedElsewhere.has(shift.id)) return false;
      return true;
    }).sort(function (a, b) { return a.date.localeCompare(b.date) || a.clockIn.localeCompare(b.clockIn); });
    const eligibleIds = new Set(eligible.map(function (shift) { return shift.id; }));
    selectedShiftIds = new Set(Array.from(selectedShiftIds).filter(function (shiftId) { return eligibleIds.has(shiftId); }));
    shiftList.textContent = '';
    if (!eligible.length) {
      const empty = document.createElement('div');
      empty.className = 'payment-shift-empty';
      empty.textContent = start && end ? 'No unlinked shifts are available for this job and pay period.' : 'Choose a complete pay period to see shifts awaiting payment.';
      shiftList.appendChild(empty);
      updateExpected();
      return;
    }
    eligible.forEach(function (shift) {
      const option = document.createElement('label');
      option.className = 'payment-shift-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = shift.id;
      checkbox.checked = selectedShiftIds.has(shift.id);
      const details = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = H.formatDate(shift.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const time = document.createElement('small');
      const shiftPay = H.shiftMinutes(shift) / 60 * H.getShiftHourlyWage(shift, settings);
      time.textContent = H.formatTime12(shift.clockIn) + '–' + H.formatTime12(shift.clockOut) + ' · ' + H.formatDecimalHours(H.shiftMinutes(shift)) + ' hours · ' + H.formatCurrency(shiftPay, settings.currency);
      details.append(title, time);
      option.append(checkbox, details);
      checkbox.addEventListener('change', function () {
        if (checkbox.checked) selectedShiftIds.add(shift.id);
        else selectedShiftIds.delete(shift.id);
        updateExpected();
      });
      shiftList.appendChild(option);
    });
    updateExpected();
  }

  function resetForm() {
    const range = currentMonthRange();
    form.reset();
    idInput.value = '';
    populateJobs(settings.defaultJob);
    paymentDateInput.value = H.dateKey(new Date());
    periodStartInput.value = range.start;
    periodEndInput.value = range.end;
    methodInput.value = 'direct-deposit';
    selectedShiftIds = new Set();
    document.getElementById('payment-form-title').textContent = 'Record a payment';
    document.getElementById('save-payment').textContent = 'Save payment';
    cancelEditButton.classList.add('hidden');
    formMessage.textContent = '';
    renderShiftChoices();
  }

  function updateMetrics() {
    const shifts = H.getShifts();
    const awaiting = H.getShiftsAwaitingPayment();
    const awaitingMinutes = awaiting.reduce(function (sum, shift) { return sum + H.shiftMinutes(shift); }, 0);
    document.getElementById('payment-awaiting-hours').textContent = H.formatDecimalHours(awaitingMinutes) + 'h';
    document.getElementById('payment-awaiting-pay').textContent = H.formatCurrency(expectedGross(awaiting), settings.currency) + ' expected gross';

    const month = H.dateKey(new Date()).slice(0, 7);
    const monthPayments = H.getPayments().filter(function (payment) { return payment.paymentDate.startsWith(month); });
    const monthNet = monthPayments.reduce(function (sum, payment) { return sum + payment.netReceived; }, 0);
    document.getElementById('payment-month-net').textContent = H.formatCurrency(monthNet, settings.currency);
    document.getElementById('payment-month-count').textContent = monthPayments.length ? monthPayments.length + (monthPayments.length === 1 ? ' payment recorded' : ' payments recorded') : 'No payments recorded';
    const discrepancyCount = H.getPayments().filter(function (payment) { return Math.abs(payment.paycheckGross - payment.expectedGross) >= 0.01; }).length;
    document.getElementById('payment-discrepancy-count').textContent = String(discrepancyCount);
  }

  function appendStat(container, label, value, className) {
    const item = document.createElement('div');
    const term = document.createElement('span'); term.textContent = label;
    const amount = document.createElement('strong'); amount.textContent = value;
    if (className) amount.className = className;
    item.append(term, amount);
    container.appendChild(item);
  }

  function renderHistory() {
    const list = document.getElementById('payment-list');
    const empty = document.getElementById('payment-empty');
    const payments = H.getPayments().slice().sort(function (a, b) {
      return b.paymentDate.localeCompare(a.paymentDate) || b.createdAt.localeCompare(a.createdAt);
    });
    list.textContent = '';
    empty.classList.toggle('hidden', payments.length > 0);
    payments.forEach(function (payment) {
      const card = document.createElement('article');
      card.className = 'payment-record';
      const heading = document.createElement('div');
      heading.className = 'payment-record-heading';
      const titleWrap = document.createElement('div');
      const title = document.createElement('h3'); title.textContent = jobName(payment.job);
      const date = document.createElement('span'); date.textContent = 'Paid ' + H.formatDate(payment.paymentDate) + ' · ' + methodName(payment.method);
      titleWrap.append(title, date);
      const actions = document.createElement('div');
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'text-button'; edit.textContent = 'Edit';
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'text-button danger'; remove.textContent = 'Delete';
      edit.setAttribute('aria-label', 'Edit ' + jobName(payment.job) + ' payment from ' + H.formatDate(payment.paymentDate));
      remove.setAttribute('aria-label', 'Delete ' + jobName(payment.job) + ' payment from ' + H.formatDate(payment.paymentDate));
      edit.addEventListener('click', function () { editPayment(payment.id); });
      remove.addEventListener('click', function () { removePayment(payment.id); });
      actions.append(edit, remove);
      heading.append(titleWrap, actions);

      const stats = document.createElement('div');
      stats.className = 'payment-record-stats';
      const difference = Math.round((payment.paycheckGross - payment.expectedGross) * 100) / 100;
      appendStat(stats, 'Pay period', H.formatDate(payment.periodStart, { month: 'short', day: 'numeric' }) + '–' + H.formatDate(payment.periodEnd, { month: 'short', day: 'numeric', year: 'numeric' }));
      appendStat(stats, 'Linked shifts', String(payment.shiftIds.length));
      appendStat(stats, 'Expected gross', H.formatCurrency(payment.expectedGross, settings.currency));
      appendStat(stats, 'Reported gross', H.formatCurrency(payment.paycheckGross, settings.currency));
      appendStat(stats, 'Net received', H.formatCurrency(payment.netReceived, settings.currency));
      appendStat(stats, 'Gross difference', H.formatCurrency(difference, settings.currency), difference < -0.009 ? 'difference-negative' : (difference > 0.009 ? 'difference-positive' : ''));
      card.append(heading, stats);
      if (payment.reference || payment.notes) {
        const notes = document.createElement('p');
        notes.className = 'payment-record-notes';
        notes.textContent = (payment.reference ? 'Reference: ' + payment.reference + (payment.notes ? ' · ' : '') : '') + (payment.notes || '');
        card.appendChild(notes);
      }
      list.appendChild(card);
    });
    updateMetrics();
  }

  function editPayment(id) {
    const payment = H.getPayments().find(function (item) { return item.id === id; });
    if (!payment) return;
    idInput.value = payment.id;
    populateJobs(payment.job);
    paymentDateInput.value = payment.paymentDate;
    periodStartInput.value = payment.periodStart;
    periodEndInput.value = payment.periodEnd;
    methodInput.value = payment.method;
    referenceInput.value = payment.reference;
    grossInput.value = payment.paycheckGross.toFixed(2);
    netInput.value = payment.netReceived.toFixed(2);
    notesInput.value = payment.notes;
    selectedShiftIds = new Set(payment.shiftIds);
    document.getElementById('payment-form-title').textContent = 'Edit payment';
    document.getElementById('save-payment').textContent = 'Update payment';
    cancelEditButton.classList.remove('hidden');
    formMessage.textContent = '';
    renderShiftChoices();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function removePayment(id) {
    const payment = H.getPayments().find(function (item) { return item.id === id; });
    if (!payment || !window.confirm('Delete this payment? Its linked shifts will become available for another payment.')) return;
    try {
      H.deletePayment(id);
      if (idInput.value === id) resetForm();
      renderHistory();
      formMessage.textContent = 'Payment deleted. Its linked shifts are available for another payment.';
    } catch (_error) {
      formMessage.textContent = 'The payment could not be deleted.';
    }
  }

  jobInput.addEventListener('change', function () { selectedShiftIds = new Set(); renderShiftChoices(); });
  periodStartInput.addEventListener('change', renderShiftChoices);
  periodEndInput.addEventListener('change', renderShiftChoices);
  document.getElementById('new-payment').addEventListener('click', function () {
    resetForm();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  cancelEditButton.addEventListener('click', resetForm);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const paycheckGross = Number(grossInput.value);
    const netReceived = Number(netInput.value);
    if (!paymentDateInput.value || !periodStartInput.value || !periodEndInput.value) {
      formMessage.textContent = 'Choose the payment date and complete pay period.';
      return;
    }
    if (periodStartInput.value > periodEndInput.value) {
      formMessage.textContent = 'The pay-period start must be before or the same as the end.';
      return;
    }
    if (!selectedShiftIds.size) {
      formMessage.textContent = 'Select at least one shift awaiting payment.';
      return;
    }
    if (grossInput.value === '' || !Number.isFinite(paycheckGross) || paycheckGross < 0 || netInput.value === '' || !Number.isFinite(netReceived) || netReceived < 0) {
      formMessage.textContent = 'Enter valid gross and net amounts of zero or more.';
      return;
    }
    try {
      H.savePayment({
        id: idInput.value,
        job: jobInput.value,
        paymentDate: paymentDateInput.value,
        periodStart: periodStartInput.value,
        periodEnd: periodEndInput.value,
        paycheckGross: paycheckGross,
        netReceived: netReceived,
        method: methodInput.value,
        reference: referenceInput.value,
        notes: notesInput.value,
        shiftIds: Array.from(selectedShiftIds)
      });
      resetForm();
      renderHistory();
      formMessage.textContent = 'Payment saved and selected shifts linked to it.';
    } catch (error) {
      formMessage.textContent = error && error.message ? error.message : 'The payment could not be saved.';
    }
  });

  resetForm();
  renderHistory();
})();
