import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {convertedTotal, convertUsd, rowValue, settledTotal, safeUrl} from './lib.js';

const data = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));

test('cash totals separate currencies and exclude awards, waivers and unknown costs', () => {
  const rows = [
    {currency:'USD', amount:17.64, status:'paid'},
    {currency:'USD', amount:16.80, status:'paid'},
    {currency:'USD', amount:1.25, status:'refunded'},
    {currency:'USD', amount:2100, status:'scholarship'},
    {currency:'USD', amount:60, status:'waived'},
    {currency:'USD', amount:99, status:'unconfirmed'},
    {currency:'USD', amount:null, status:'paid'},
    {currency:'INR', amount:2099, status:'paid'},
  ];
  assert.equal(settledTotal(rows, 'USD'), 33.19);
  assert.equal(settledTotal(rows, 'INR'), 2099);
});

test('published totals reconcile to the evidence ledger without duplicate IDs', () => {
  assert.equal(new Set(data.spending.map(row=>row.id)).size, data.spending.length);
  assert.equal(settledTotal(data.spending, 'USD'), 558.08);
  assert.equal(settledTotal(data.spending, 'INR'), 2099);
  assert.equal(settledTotal(data.spending.filter(row=>row.provider==='UoPeople'), 'USD'), 427);
  assert.equal(settledTotal(data.spending.filter(row=>row.provider==='ProctorU'), 'USD'), 52.08);
});

test('overall total is in US dollars, with the rupee payment converted on its payment date', () => {
  const inr = data.spending.filter(row => row.currency === 'INR');
  assert.equal(inr.length, 1);
  assert.equal(inr[0].usdAmount, Math.round(inr[0].amount / inr[0].fxRate * 100) / 100);
  assert.equal(convertedTotal(data.spending, 'USD'), 581.89);
  assert.equal(data.summary.confirmedTotal, convertedTotal(data.spending, 'USD'));
  assert.equal(data.summary.additionalTotals, undefined);
});

test('currency switch converts from USD and keeps exact amounts paid in the chosen currency', () => {
  const rates = {INR: 88, EUR: 0.5, JPY: 150.4};
  const rows = [
    {currency:'USD', amount:10, status:'paid'},
    {currency:'INR', amount:2099, usdAmount:23.81, status:'paid'},
    {currency:'USD', amount:2100, status:'scholarship'},
    {currency:'USD', amount:1, status:'refunded'},
  ];
  assert.equal(rowValue(rows[1], 'INR', rates), 2099);
  assert.equal(rowValue(rows[0], 'INR', rates), 880);
  assert.equal(convertedTotal(rows, 'INR', rates), 880 + 2099 - 88);
  assert.equal(convertedTotal(rows, 'EUR', rates), 5 + 11.91 - 0.5);
  assert.equal(convertUsd(10.33, 'JPY', rates), 1554);
  assert.equal(convertUsd(10, 'XYZ', rates), null);
});

test('accepted transfers and earned credits reconcile to the bachelor transcript', () => {
  assert.equal(data.courses.length, 30);
  assert.equal(new Set(data.courses.map(row=>row.id)).size, 30);
  const credits = rows => rows.reduce((total,row)=>total+row.credits,0);
  assert.equal(credits(data.courses.filter(row=>row.provider==='Coursera')), 63);
  assert.equal(credits(data.courses.filter(row=>row.provider==='Sophia Learning')), 27);
  assert.equal(credits(data.uopeopleCourses), 30);
  assert.equal(credits(data.courses)+credits(data.uopeopleCourses), data.summary.totalCredits);
  assert.equal(data.completedNotTransferred.length, 3);
  assert.ok(data.courses.every(row=>safeUrl(row.url)?.startsWith('https://')));
});

test('degrees use standalone local document images and actual conferral dates', () => {
  assert.deepEqual(data.degrees.map(d=>d.date), ['2026-04-01','2026-06-10']);
  for (const degree of data.degrees) {
    assert.ok(degree.image.startsWith('/degrees/'));
    assert.ok(existsSync(new URL(`../public${degree.image}`, import.meta.url)));
  }
});

test('external links reject executable and local-file schemes', () => {
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('file:///private/transcript.pdf'), null);
  assert.equal(safeUrl('https://www.coursera.org/'), 'https://www.coursera.org/');
});
