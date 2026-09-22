/* PayChase engine - pure functions for invoice aging, nudges and late fees. */
(function (root) {
  'use strict';
  var DAY = 86400000;

  function toDate(iso) {
    var d = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
    if (isNaN(d.getTime())) throw new Error('bad date: ' + iso);
    return d;
  }
  function addDays(iso, days) {
    return new Date(toDate(iso).getTime() + days * DAY).toISOString().slice(0, 10);
  }
  function diffDays(laterISO, earlierISO) {
    return Math.round((toDate(laterISO) - toDate(earlierISO)) / DAY);
  }

  function dueDate(issuedISO, termsDays) { return addDays(issuedISO, termsDays); }

  // positive = overdue by that many days, 0 = due today, negative = not due yet
  function daysOverdue(dueISO, nowISO) { return diffDays(nowISO, dueISO); }

  function bucket(daysOver) {
    if (daysOver < 0) return 'upcoming';
    if (daysOver === 0) return 'due-today';
    if (daysOver <= 7) return 'fresh';     // 1-7: first nudge window
    if (daysOver <= 30) return 'late';     // 8-30
    return 'stale';                        // 31+
  }
  var BUCKET_RANK = { stale: 0, late: 1, fresh: 2, 'due-today': 3, upcoming: 4, paid: 5 };

  // nudge cadence after the due date: day 1, 7, 14, then weekly
  function nudgeDays() {
    var d = [1, 7, 14];
    for (var i = 21; i <= 365; i += 7) d.push(i);
    return d;
  }

  // next calendar date a nudge should go out; null if none left within a year
  function nextNudge(dueISO, nowISO) {
    var over = daysOverdue(dueISO, nowISO);
    var days = nudgeDays();
    for (var i = 0; i < days.length; i++) {
      if (days[i] >= Math.max(1, over)) return addDays(dueISO, days[i]);
    }
    return null;
  }

  // simple pro-rata late fee: monthlyRate % per 30 days overdue, 0 before due
  function lateFee(amount, monthlyRate, daysOver) {
    if (daysOver <= 0) return 0;
    return Math.round(amount * (monthlyRate / 100) * (daysOver / 30) * 100) / 100;
  }

  // invoice: {client, amount, issued, termsDays, paid (bool)}
  function decorate(inv, nowISO) {
    if (inv.paid) return { invoice: inv, bucket: 'paid', daysOver: 0, due: null, fee: 0, nudge: null };
    var due = dueDate(inv.issued, inv.termsDays);
    var over = daysOverdue(due, nowISO);
    return {
      invoice: inv,
      bucket: bucket(over),
      daysOver: over,
      due: due,
      fee: lateFee(inv.amount, inv.lateRate || 0, over),
      nudge: nextNudge(due, nowISO)
    };
  }

  // worst first: stale, late, fresh, due-today, upcoming, paid
  function sortInvoices(invoices, nowISO) {
    return invoices.map(function (inv) { return decorate(inv, nowISO); })
      .sort(function (a, b) {
        var r = BUCKET_RANK[a.bucket] - BUCKET_RANK[b.bucket];
        if (r !== 0) return r;
        return b.daysOver - a.daysOver;
      });
  }

  function summary(invoices, nowISO) {
    var outstanding = 0, overdue = 0, overdueCount = 0, fees = 0, stalestDays = null;
    invoices.forEach(function (inv) {
      if (inv.paid) return;
      outstanding += Number(inv.amount) || 0;
      var d = decorate(inv, nowISO);
      if (d.daysOver > 0) {
        overdue += Number(inv.amount) || 0;
        overdueCount++;
        fees += d.fee;
        if (stalestDays === null || d.daysOver > stalestDays) stalestDays = d.daysOver;
      }
    });
    return {
      outstanding: Math.round(outstanding * 100) / 100,
      overdue: Math.round(overdue * 100) / 100,
      overdueCount: overdueCount,
      feesAccrued: Math.round(fees * 100) / 100,
      stalestDays: stalestDays
    };
  }

  var api = { dueDate: dueDate, daysOverdue: daysOverdue, bucket: bucket, nextNudge: nextNudge, lateFee: lateFee, decorate: decorate, sortInvoices: sortInvoices, summary: summary };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PayChase = api;
})(typeof window !== 'undefined' ? window : this);
