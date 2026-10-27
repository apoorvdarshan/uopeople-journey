import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {convertUsd, convertedTotal, currencyName, dateLabel, exportCsv, hasAmount, money, rowValue, safeUrl} from './lib.js';

export const CurrencyContext = createContext({currency: 'USD', rates: {}, date: null, live: false});

export function CurrencySelect({value, options, onChange, className = ''}) {
  return <label className={`currency-select ${className}`}>
    <span className="sr-only">Show amounts in</span>
    <select value={value} onChange={event => onChange(event.target.value)}>
      {options.map(code => <option key={code} value={code}>{code} ({currencyName(code)})</option>)}
    </select>
    <Icon name="chevron"/>
  </label>;
}

export function Icon({name = 'arrow', ...props}) {
  const paths = {arrow: <><path d="M4 12h15m-5-5 5 5-5 5"/></>, external:<><path d="M8 5h11v11M19 5 5 19"/></>, search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>, download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>, close:<><path d="m6 6 12 12M18 6 6 18"/></>, chevron:<path d="m7 10 5 5 5-5"/>, check:<path d="m5 12 4 4L19 6"/>, expand:<><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></>};
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export const providerKind = provider => ({'Coursera': 'coursera', 'Sophia Learning': 'sophia', 'UoPeople': 'uopeople'})[provider] || 'other';

export function SectionHeading({id, title, children, aside}) {
  return <div className="section-heading">
    <div className="section-heading-copy"><h2 id={id}>{title}</h2>{children && <p>{children}</p>}</div>
    {aside}
  </div>;
}

function Evidence({source, note, label = 'Details'}) {
  if (!source && !note) return null;
  return <details className="evidence"><summary>{label}<Icon name="chevron"/></summary><div>{note && <p>{note}</p>}{source && <p className="source-line">Source: {Array.isArray(source) ? source.join('; ') : source}</p>}</div></details>;
}

export function CreditMosaic({courses, uopeopleCourses, totalCredits = 120}) {
  const tiles = useMemo(() => [
    ...courses.filter(course => course.provider === 'Coursera').map(course => ({key: course.id, kind: 'coursera', title: course.title, detail: `${course.code}, transferred in from Coursera ACE credit`})),
    ...courses.filter(course => course.provider === 'Sophia Learning').map(course => ({key: course.id, kind: 'sophia', title: course.title, detail: `${course.code}, transferred in from Sophia’s ${course.sourceCourse}`})),
    ...uopeopleCourses.map(course => ({key: course.code, kind: 'uopeople', title: course.title, detail: `${course.code} at UoPeople, grade ${course.grade}, ${dateLabel(course.term, true)}`})),
  ], [courses, uopeopleCourses]);
  const [active, setActive] = useState(null);
  const [hovered, setHovered] = useState(null);
  const buttons = useRef([]);
  const shown = tiles[hovered ?? active];
  const credits = kind => [...courses, ...uopeopleCourses.map(course => ({...course, provider: 'UoPeople'}))].filter(course => providerKind(course.provider) === kind).reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
  const legend = [['coursera', 'Coursera'], ['sophia', 'Sophia Learning'], ['uopeople', 'Earned at UoPeople']];

  function move(event, index) {
    const steps = {ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10};
    let next = null;
    if (event.key in steps) next = index + steps[event.key];
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tiles.length - 1;
    if (next === null || next < 0 || next >= tiles.length) return;
    event.preventDefault();
    setHovered(null);
    setActive(next);
    buttons.current[next]?.focus();
  }

  return <figure className="mosaic">
    <div className="mosaic-grid" role="group" aria-label={`My ${totalCredits} bachelor’s credits, one square per 3-credit course. Use the arrow keys to move between courses.`} onMouseLeave={() => setHovered(null)}>
      {tiles.map((tile, index) => <button
        key={tile.key}
        ref={element => {buttons.current[index] = element;}}
        type="button"
        className={`tile tile-${tile.kind}`}
        style={{'--i': index}}
        tabIndex={index === (active ?? 0) ? 0 : -1}
        aria-pressed={active === index}
        aria-label={`${tile.title}. ${tile.detail}`}
        onClick={() => setActive(index)}
        onFocus={() => setActive(index)}
        onMouseEnter={() => setHovered(index)}
        onKeyDown={event => move(event, index)}
      />)}
    </div>
    <figcaption className="mosaic-caption">
      {shown
        ? <><i className={`swatch swatch-${shown.kind}`}/><span><strong>{shown.title}</strong>{shown.detail}</span></>
        : <span>Each square is one 3-credit course on my bachelor’s transcript. Point at one, or tab in and use the arrow keys, to see what it was.</span>}
    </figcaption>
    <ul className="mosaic-legend">
      {legend.map(([kind, label]) => <li key={kind}><i className={`swatch swatch-${kind}`}/>{label}<strong>{credits(kind)}</strong></li>)}
    </ul>
  </figure>;
}

export function Spending({rows, summary, coverageNote, currencyControl}) {
  const {currency, rates, date} = useContext(CurrencyContext);
  const [category, setCategory] = useState('All expenses');
  const categories = ['All expenses', ...new Set(rows.map(row => row.category).filter(Boolean))];
  const filtered = category === 'All expenses' ? rows : rows.filter(row => row.category === category);
  const paid = convertedTotal(filtered, currency, rates);
  const total = convertedTotal(rows, currency, rates);
  const unknown = rows.filter(row => row.status === 'unconfirmed' || (!hasAmount(row.amount) && !['scholarship', 'waived'].includes(row.status)));
  const groups = [...new Set(rows.filter(row => row.status === 'paid' || row.status === 'refunded').map(row => row.category))].map(name => ({name, amount: convertedTotal(rows.filter(row => row.category === name), currency, rates)}));
  const isAll = category === 'All expenses';
  const paidInCurrency = rows.some(row => row.status === 'paid' && row.currency === currency);
  const foreignPaid = rows.filter(row => row.status === 'paid' && row.currency !== 'USD');
  const rateNote = currency === 'USD'
    ? (foreignPaid.length ? `The ${foreignPaid.map(row => `${money(row.amount, row.currency, {whole: true})} ${row.provider}`).join(' and ')} ${foreignPaid.length === 1 ? 'payment is' : 'payments are'} converted at the rate on the payment date.` : '')
    : `Converted from US dollars at the ECB rate for ${dateLabel(date)}.${paidInCurrency ? ` Payments made in ${currency} keep their exact amount.` : ''}`;
  const scholarship = (summary.scholarshipNote || 'Scholarship support is excluded from personal spending.').replace('{amount}', money(convertUsd(summary.scholarshipTotal, currency, rates), currency, {whole: true}));
  return <section id="cost" className="section cost-section" aria-labelledby="cost-title">
    <SectionHeading id="cost-title" title="What it cost" aside={<div className="cost-total">
      <strong>{money(isAll ? total : paid, currency)}</strong>
      <span className="cost-total-note">{isAll ? 'Paid out of pocket.' : `Paid for ${category.toLowerCase()}.`} {rateNote}</span>
    </div>}>Every payment I made, from receipts and the university ledger. Scholarships and waivers are listed but not counted.</SectionHeading>

    {groups.length > 0 && <div className="cost-breakdown">
      <div className="cost-bar" role="img" aria-label={`Payments by category: ${groups.map(group => `${group.name} ${money(group.amount, currency)}`).join(', ')}`}>
        {groups.filter(group => group.amount > 0).map((group, index) => <span key={group.name} className={`bar-segment segment-${index % 3}`} style={{flexGrow: group.amount / total}}/>)}
      </div>
      <div className="cost-legend" role="group" aria-label="Show one category">
        {groups.map((group, index) => <button type="button" key={group.name} aria-pressed={category === group.name} onClick={() => setCategory(category === group.name ? 'All expenses' : group.name)}>
          <i className={`segment-${index % 3}`}/>
          <span>{group.name}</span>
          <strong>{money(group.amount, currency)}</strong>
        </button>)}
      </div>
    </div>}

    <div className="cost-context">
      <Icon name="check"/>
      <div><p>{scholarship}</p>{coverageNote && <p className="coverage-note">{coverageNote}</p>}</div>
    </div>

    <div className="table-toolbar">
      <div className="filter-list" role="group" aria-label="Filter expenses">{categories.map(item => <button type="button" key={item} className="filter" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="toolbar-actions">
        {currencyControl}
        <button type="button" className="button-quiet" onClick={() => exportCsv(filtered)} disabled={!filtered.length}><Icon name="download"/>Export CSV</button>
      </div>
    </div>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable expense records">
      <table className="data-table expense-table">
        <caption className="sr-only">Education expenses in {currencyName(currency)}, including payment status and supporting evidence</caption>
        <thead><tr><th>Date</th><th>Expense</th><th>Category</th><th className="numeric">Paid ({currency})</th></tr></thead>
        <tbody>{filtered.length ? filtered.map((row, index) => {
          const unverified = row.status === 'unconfirmed' || (!hasAmount(row.amount) && !['scholarship', 'waived'].includes(row.status));
          const support = ['scholarship', 'waived'].includes(row.status);
          const value = rowValue(row, currency, rates);
          return <tr key={row.id || index} className={support ? 'support-row' : undefined}>
            <td className="date-cell">{dateLabel(row.date)}</td>
            <td><strong className="row-title">{row.label}</strong>{row.provider && <span className="row-secondary">{row.provider}</span>}<Evidence source={row.source} note={row.note}/></td>
            <td><span className="category-label">{row.category}</span></td>
            <td className="numeric amount-cell">{unverified || value === null
              ? <span className="unverified">Not verified</span>
              : support
                ? <><span className="support-value">{row.status === 'waived' ? 'Waived' : 'Covered'}</span><small>Not out of pocket</small></>
                : <><span>{row.status === 'refunded' ? '−' : ''}{money(value, currency)}</span>{row.currency !== currency && <small>{money(row.amount, row.currency)} paid</small>}{row.status === 'refunded' && <small>Refund</small>}</>}
            </td>
          </tr>;
        }) : <tr><td colSpan="4" className="empty-state">No expenses in this category.</td></tr>}</tbody>
      </table>
    </div>
    <div className="table-footnote"><span>{filtered.length} {filtered.length === 1 ? 'record' : 'records'} shown, amounts in {currency}</span>{unknown.length > 0 && <span>{unknown.length} {unknown.length === 1 ? 'record excludes' : 'records exclude'} an unverified amount from the total</span>}</div>
  </section>;
}

export function Timeline({events}) {
  const [expanded, setExpanded] = useState(false);
  const milestones = events.filter(event => event.milestone);
  const primary = milestones.length ? milestones : events.slice(0, 4);
  const visible = expanded ? events : primary;
  return <section id="timeline" className="section timeline-section" aria-labelledby="timeline-title">
    <SectionHeading id="timeline-title" title="From application to graduation">The key dates, each backed by an email, ledger entry or diploma.</SectionHeading>
    <ol className={`timeline ${expanded ? 'timeline-expanded' : ''}`}>
      {visible.map((event, index) => <li key={`${event.date}-${index}`} className={event.type === 'degree' ? 'timeline-degree' : undefined}>
        <span className="timeline-dot" aria-hidden="true"/>
        <time dateTime={event.date}>{dateLabel(event.date)}</time>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        <Evidence source={event.source} note={event.note} label="Evidence"/>
      </li>)}
    </ol>
    {events.length > primary.length && <button type="button" className="button-quiet timeline-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'Show key dates only' : `Show all ${events.length} dates`}<Icon name="chevron" style={{transform: expanded ? 'rotate(180deg)' : undefined}}/></button>}
  </section>;
}

export function Courses({courses, summary, earnedCredits}) {
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('All providers');
  const providers = ['All providers', ...new Set(courses.map(course => course.provider).filter(Boolean))];
  const filtered = courses.filter(course => (provider === 'All providers' || course.provider === provider) && [course.title, course.code, course.provider, course.sourceCourse].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const credits = filtered.reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
  const totalCredits = summary.totalCredits || 120;
  const byProvider = providers.slice(1).map(name => ({name, credits: courses.filter(course => course.provider === name).reduce((sum, course) => sum + Number(course.credits || 0), 0)})).sort((a, b) => b.credits - a.credits);
  return <section id="credits" className="section credits-section" aria-labelledby="credits-title">
    <SectionHeading id="credits-title" title="The credits I brought with me">{summary.transferCredits ?? '—'} of my {totalCredits} bachelor’s credits came from courses I finished elsewhere first. These are my accepted transfers, not a promise of what UoPeople will accept for anyone else.</SectionHeading>
    <div className="transfer-layout">
      <aside className="transfer-summary" aria-label="Credit sources">
        <p className="transfer-fraction"><strong>{summary.transferCredits ?? '—'}</strong> of {totalCredits} credits transferred</p>
        <div className="credit-ratio" role="img" aria-label={`${byProvider.map(item => `${item.name} ${item.credits}`).join(', ')}, earned at UoPeople ${earnedCredits} credits`}>
          {byProvider.map(item => <span key={item.name} className={`ratio-${providerKind(item.name)}`} style={{flexGrow: item.credits}}/>)}
          <span className="ratio-uopeople" style={{flexGrow: earnedCredits}}/>
        </div>
        <div className="provider-list" role="group" aria-label="Show one provider">
          {byProvider.map(item => <button key={item.name} type="button" aria-pressed={provider === item.name} onClick={() => setProvider(provider === item.name ? 'All providers' : item.name)}>
            <i className={`swatch swatch-${providerKind(item.name)}`}/><span>{item.name}</span><strong>{item.credits}</strong>
          </button>)}
          <div className="provider-earned"><i className="swatch swatch-uopeople"/><span>Earned at UoPeople</span><strong>{earnedCredits}</strong></div>
        </div>
        <p className="transfer-note">Each row is a UoPeople course my transfer credit counted as, from my transfer evaluation and degree audit.</p>
      </aside>
      <div className="course-list">
        <div className="course-controls">
          <label className="search-field"><Icon name="search"/><input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Search courses" aria-label="Search transferred courses"/></label>
          <label className="select-field"><span className="sr-only">Filter by transfer provider</span><select value={provider} onChange={event => setProvider(event.target.value)}>{providers.map(name => <option key={name}>{name}</option>)}</select><Icon name="chevron"/></label>
        </div>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable transfer course records">
          <table className="data-table courses-table">
            <caption className="sr-only">Accepted transfer credits: the UoPeople course each counted as, and where it came from</caption>
            <thead><tr><th>Accepted as</th><th>Transferred from</th><th className="numeric">Credits</th></tr></thead>
            <tbody>{filtered.length ? filtered.map((course, index) => <tr key={course.id || `${course.code}-${index}`}>
              <td><span className="course-code">{course.code}</span><strong className="row-title">{course.title}</strong><Evidence source={course.source} note={course.note}/></td>
              <td><span className="provider-tag"><i className={`swatch swatch-${providerKind(course.provider)}`}/>{course.provider}</span>{course.sourceCourse
                ? (safeUrl(course.url) ? <a className="course-link source-link" href={safeUrl(course.url)} target="_blank" rel="noreferrer">{course.sourceCourse}<Icon name="external"/></a> : <span className="row-secondary">{course.sourceCourse}</span>)
                : <span className="row-secondary">ACE subject credit</span>}</td>
              <td className="numeric">{course.credits}</td>
            </tr>) : <tr><td colSpan="3" className="empty-state">No courses match this search. <button type="button" className="button-quiet" onClick={() => {setQuery(''); setProvider('All providers');}}>Clear filters</button></td></tr>}</tbody>
          </table>
        </div>
        <div className="table-footnote" aria-live="polite">{filtered.length} of {courses.length} courses, {credits} credits shown</div>
      </div>
    </div>
  </section>;
}

export function Degrees({degrees}) {
  const [selected, setSelected] = useState(null);
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);
  useEffect(() => {if (selected && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();}, [selected]);
  function open(event, degree) {previousFocus.current = event.currentTarget; setSelected(degree);}
  function close() {dialogRef.current?.close(); setSelected(null); previousFocus.current?.focus();}
  return <section id="degrees" className="degrees-section" aria-labelledby="degrees-title">
    <div className="section">
      <SectionHeading id="degrees-title" title="The diplomas">Both in Computer Science. The associate’s came first, on the way to the bachelor’s.</SectionHeading>
      <div className="degree-grid">{degrees.map((degree, index) => <article className="degree" key={degree.id || index}>
        <button type="button" className="degree-image" onClick={event => open(event, degree)} disabled={!degree.image} aria-label={`Enlarge the ${degree.title} diploma`}>
          {degree.image ? <img src={degree.image} alt={`${degree.title} diploma awarded to Apoorv Darshan`} loading="lazy"/> : <span className="degree-pending">Document pending</span>}
          <span className="degree-zoom"><Icon name="expand"/></span>
        </button>
        <div className="degree-info">
          <h3>{degree.title}<span>in {degree.subject || 'Computer Science'}</span></h3>
          <dl className="degree-details">
            <div><dt>Conferred</dt><dd>{dateLabel(degree.date)}</dd></div>
            {degree.gpa && <div><dt>GPA</dt><dd>{degree.gpa}</dd></div>}
            {degree.honors && <div><dt>Honors</dt><dd className="degree-honors">{degree.honors}</dd></div>}
          </dl>
          {degree.description && <p className="degree-description">{degree.description}.</p>}
        </div>
      </article>)}</div>
    </div>
    <dialog ref={dialogRef} className="degree-dialog" aria-labelledby="degree-dialog-title" onClose={() => setSelected(null)} onClick={event => {if (event.target === event.currentTarget) close();}}>
      <div className="dialog-heading"><h3 id="degree-dialog-title">{selected?.title}</h3><button autoFocus className="icon-button" type="button" onClick={close} aria-label="Close diploma preview"><Icon name="close"/></button></div>
      {selected?.image && <img src={selected.image} alt={`${selected.title} diploma awarded to Apoorv Darshan`}/>}
      <p>The diploma page only. Full transcripts are not published here.</p>
    </dialog>
  </section>;
}

export function Sources({sources, notes, lastVerified}) {
  return <section id="sources" className="section sources-section" aria-label="Sources and notes">
    <details>
      <summary><span>Sources and notes<small>Where every number comes from, and what is left out</small></span><Icon name="chevron"/></summary>
      <div className="sources-content">
        <p className="sources-intro">Assembled from university documents, payment records and related email. Last reconciled {dateLabel(lastVerified)}.</p>
        <div className="source-grid">{sources.map((source, index) => <div key={index}><h3>{safeUrl(source.url) ? <a href={safeUrl(source.url)} target="_blank" rel="noreferrer">{source.title}<Icon name="external"/></a> : source.title}</h3><p>{source.description}</p></div>)}</div>
        {notes.length > 0 && <ul className="source-notes">{notes.map((note, index) => <li key={index}>{note}</li>)}</ul>}
      </div>
    </details>
  </section>;
}

export function StudyDetails({data}) {
  const {uopeopleCourses = [], courseraSubjects = [], completedNotTransferred = [], guide = []} = data;
  const certificates = [...new Set(courseraSubjects.map(subject => subject.certificate))].map(name => {
    const subjects = courseraSubjects.filter(subject => subject.certificate === name);
    return {name, url: subjects[0].url, subjects};
  });
  const earned = uopeopleCourses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
  return <div className="section study-details">
    {uopeopleCourses.length > 0 && <details>
      <summary><span>The {uopeopleCourses.length} courses I took at UoPeople<small>{earned} credits earned at the university, assessments covered by scholarship</small></span><Icon name="chevron"/></summary>
      <div className="details-content table-scroll" tabIndex={0} role="region" aria-label="Scrollable UoPeople course records">
        <table className="data-table earned-table"><caption className="sr-only">Courses earned directly at University of the People</caption>
          <thead><tr><th>Course</th><th>Term started</th><th>Grade</th><th className="numeric">Credits</th></tr></thead>
          <tbody>{uopeopleCourses.map(course => <tr key={course.code}><td><span className="course-code">{course.code}</span><strong className="row-title">{course.title}</strong></td><td>{dateLabel(course.term)}</td><td className="grade">{course.grade}</td><td className="numeric">{course.credits}</td></tr>)}</tbody>
        </table>
      </div>
    </details>}
    {certificates.length > 0 && <details>
      <summary><span>The Coursera courses behind the {courseraSubjects.length * 3} credits<small>{courseraSubjects.length} ACE subjects from {certificates.length} certificate programs</small></span><Icon name="chevron"/></summary>
      <div className="details-content">
        <p className="detail-explanation">{data.courseraDestinationNote}</p>
        <div className="certificate-list">{certificates.map(certificate => <section key={certificate.name}>
          <h3>{safeUrl(certificate.url) ? <a href={safeUrl(certificate.url)} target="_blank" rel="noreferrer">{certificate.name}<Icon name="external"/></a> : certificate.name}</h3>
          <ul>{certificate.subjects.map(subject => <li key={subject.title}>{subject.title}</li>)}</ul>
        </section>)}</div>
      </div>
    </details>}
    {completedNotTransferred.length > 0 && <details>
      <summary><span>Completed, but not transferred<small>Extra learning, not part of the 90 transferred credits</small></span><Icon name="chevron"/></summary>
      <div className="details-content"><ul className="extra-course-list">{completedNotTransferred.map(course => <li key={course.title}><a href={safeUrl(course.url)} target="_blank" rel="noreferrer">{course.title}<Icon name="external"/></a><span>{course.status}</span></li>)}</ul></div>
    </details>}
    {guide.length > 0 && <details>
      <summary><span>If you’re planning your own path<small>What I learned from the process</small></span><Icon name="chevron"/></summary>
      <ol className="details-content guide-list">{guide.map((item, index) => <li key={index}><h3>{item.title}</h3><p>{item.text}</p>{item.source && <p className="guide-source">Source: {item.source}</p>}</li>)}</ol>
    </details>}
  </div>;
}
