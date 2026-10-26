import React, {useEffect, useMemo, useState} from 'react';
import data from './data.json';
import snapshot from './rates.json';
import {Courses, CreditMosaic, CurrencyContext, CurrencySelect, Degrees, Sources, Spending, StudyDetails, Timeline} from './components.jsx';
import {convertedTotal, dateLabel, money} from './lib.js';

const daysBetween = (start, end) => Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000);
const RATES_URL = 'https://api.frankfurter.dev/v1/latest?base=USD';

function useCurrency() {
  const [fx, setFx] = useState({date: snapshot.date, rates: snapshot.rates, live: false});
  const [currency, setCurrency] = useState(() => {
    try { return localStorage.getItem('currency') || 'USD'; } catch { return 'USD'; }
  });
  useEffect(() => {
    const controller = new AbortController();
    fetch(RATES_URL, {signal: controller.signal})
      .then(response => response.ok ? response.json() : null)
      .then(latest => {if (latest?.rates) setFx({date: latest.date, rates: latest.rates, live: true});})
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const options = useMemo(() => ['USD', ...Object.keys(fx.rates).filter(code => code !== 'USD').sort()], [fx.rates]);
  const active = options.includes(currency) ? currency : 'USD';
  function choose(code) {
    setCurrency(code);
    try { localStorage.setItem('currency', code); } catch {}
  }
  return {value: {...fx, currency: active}, options, choose};
}

export default function App() {
  const {meta = {}, summary = {}, spending = [], timeline = [], courses = [], uopeopleCourses = [], degrees = [], sources = [], notes = []} = data;
  const fx = useCurrency();
  const {currency, rates} = fx.value;
  const bachelor = degrees.find(degree => degree.id === 'bachelor') || degrees[degrees.length - 1] || {};
  const days = summary.startDate && summary.endDate ? daysBetween(summary.startDate, summary.endDate) : null;
  const earnedCredits = uopeopleCourses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
  const currencySelect = className => <CurrencySelect value={currency} options={fx.options} onChange={fx.choose} className={className}/>;
  return <CurrencyContext.Provider value={fx.value}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="hero">
      <div className="masthead">
        <div className="brand">
          <img src="/brand/uopeople-logo-white.png" alt="University of the People" width="1043" height="259"/>
          <span>A personal record by {meta.name || 'Apoorv Darshan'}</span>
        </div>
        <div className="masthead-actions">
          <nav aria-label="Sections"><a href="#cost">Cost</a><a href="#timeline">Timeline</a><a href="#credits">Credits</a><a href="#degrees">Diplomas</a></nav>
          {currencySelect('currency-select-dark')}
        </div>
      </div>
      <div className="hero-body">
        <div className="hero-copy">
          <h1>{days ? `Two computer science degrees, ${days} days after my first term began.` : 'Two computer science degrees from University of the People.'}</h1>
          <p className="hero-lede">My University of the People record: what I actually paid, how {summary.transferCredits ?? 90} of my {summary.totalCredits || 120} credits transferred in, and the diplomas at the end.</p>
          <dl className="hero-facts">
            <div><dt>paid out of pocket</dt><dd>{money(convertedTotal(spending, currency, rates), currency)}</dd></div>
            <div><dt>credits transferred in</dt><dd>{summary.transferCredits ?? '—'}<small> of {summary.totalCredits || 120}</small></dd></div>
            {bachelor.gpa && <div><dt>bachelor’s GPA</dt><dd>{String(bachelor.gpa).split('/')[0].trim()}</dd></div>}
          </dl>
        </div>
        <CreditMosaic courses={courses} uopeopleCourses={uopeopleCourses} totalCredits={summary.totalCredits || 120}/>
      </div>
    </header>
    <main id="main">
      <Spending rows={spending} summary={summary} coverageNote={meta.costNote} currencyControl={currencySelect('currency-select-light')}/>
      <Timeline events={timeline}/>
      <Courses courses={courses} summary={summary} earnedCredits={earnedCredits}/>
      <StudyDetails data={data}/>
      <Degrees degrees={degrees}/>
      <Sources sources={sources} notes={notes} lastVerified={meta.lastVerified}/>
    </main>
    <footer className="site-footer">
      <img src="/brand/uopeople-shield-white.png" alt="" width="361" height="259"/>
      <div>
        <p>A personal record of one student’s path, not an admissions or pricing guarantee. Not affiliated with or endorsed by University of the People.</p>
        <p className="footer-credit">Exchange rates: European Central Bank reference rates via <a href="https://frankfurter.dev" target="_blank" rel="noreferrer">Frankfurter</a>, {fx.value.live ? 'loaded live' : 'saved snapshot'} for {dateLabel(fx.value.date)}. Notes and records keep the currency of the original document.</p>
        <p className="footer-credit">UoPeople logo by University of the People, <a href="https://commons.wikimedia.org/wiki/File:University_of_the_people_logo.webp" target="_blank" rel="noreferrer">CC BY 4.0 via Wikimedia Commons</a>, recolored. {meta.name || 'Apoorv Darshan'}, {new Date().getFullYear()}.</p>
      </div>
    </footer>
  </CurrencyContext.Provider>;
}
