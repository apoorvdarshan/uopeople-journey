import React from 'react';
import data from './data.json';
import {Courses, Degrees, Sources, Spending, StudyDetails, Timeline} from './components.jsx';
import {hasAmount, money} from './lib.js';

export default function App() {
  const {meta = {}, summary = {}, spending = [], timeline = [], courses = [], degrees = [], sources = [], notes = []} = data;
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="site-shell">
      <header className="site-header"><a className="wordmark" href="#main" aria-label="My UoPeople journey home"><strong>AD</strong><span className="wordmark-slash">/</span><span>Learning, documented.</span></a><nav aria-label="Main navigation"><a href="#cost">The cost</a><a href="#timeline">Timeline</a><a href="#credits">Transfer credits</a><a href="#degrees">Degrees</a></nav></header>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><h1 id="hero-title">Two degrees.<br/>One open path.</h1><p className="hero-description">{meta.description || "My University of the People journey, with the costs, transfer credits, and milestones I can document."}</p><div className="author-line"><span/>A personal record by {meta.name || 'Apoorv Darshan'}</div></div><div className="hero-image"><img src="/academic-still-life.png" alt="An illustrated graduation cap, books, and a rolled diploma" fetchPriority="high" width="1448" height="1086"/></div></section>
        <div className="summary-strip"><div><span className="stat-label">Confirmed spending</span><strong>{hasAmount(summary.confirmedTotal) ? money(summary.confirmedTotal, summary.currency || 'USD') : '—'}</strong>{(summary.additionalTotals || []).map(item => <span className="additional-total" key={item.currency}>+ {money(item.amount, item.currency)}</span>)}<span className="stat-note">out of pocket · original currencies</span></div><div><span className="stat-label">Transfer credits</span><strong>{summary.transferCredits ?? '—'} <span className="stat-denominator">/ {summary.totalCredits || 120}</span></strong><span className="stat-note">accepted toward the bachelor’s</span></div><div><span className="stat-label">The journey</span><strong className="stat-period">{meta.period || '2025–2026'}</strong><span className="stat-note">application to graduation</span></div><div><span className="stat-label">The result</span><strong>{degrees.length || 2} degrees</strong><span className="stat-note">Associate’s + Bachelor’s</span></div></div>
        {meta.coverageNote && <p className="overview-note">{meta.coverageNote}</p>}
        <Spending rows={spending} summary={summary} coverageNote={meta.costNote}/>
        <Timeline events={timeline}/>
        <Courses courses={courses} summary={summary}/><StudyDetails data={data}/>
        <Degrees degrees={degrees}/>
        <Sources sources={sources} notes={notes} lastVerified={meta.lastVerified}/>
      </main>
      <footer><p>A personal experience, not an admissions guarantee.</p><span>{meta.name || 'Apoorv Darshan'} · {new Date().getFullYear()}</span></footer>
    </div>
  </>;
}
