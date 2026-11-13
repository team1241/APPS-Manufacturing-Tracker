"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUpRight, Check, CheckCheck, Clock3, FileText, Loader2, Maximize2, Minimize2, Pause, Play, RefreshCw, Search, Settings2, UserRound, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIES, recentCompletions, robotProgress, searchParts, sortParts, type BoardData, type Part } from "@/lib/manufacturing";

function PartDrawings({ part }: { part: Part }) {
  if (!part.drawings.length) return <div className="drawing-empty"><FileText size={18} /><span>No file attached</span></div>;
  return (
    <div className="part-files">
      {part.drawings.map((drawing) => <a key={drawing.id} className="part-file-button" href={`/api/drawings/${encodeURIComponent(drawing.id)}`} target="_blank" rel="noreferrer" aria-label={`Open ${drawing.name} in a new tab`} title={`Open ${drawing.name} in a new tab`}><FileText size={15} aria-hidden="true" /><span>{drawing.name}</span><ArrowUpRight size={14} aria-hidden="true" /></a>)}
    </div>
  );
}

function PartCard({ part }: { part: Part }) {
  const [number, ...description] = part.name.split(" · ");
  const detail = part.description || description.join(" · ");
  return (
    <article className={`part-card priority-${part.priority.toLowerCase()}`} aria-label={part.name}>
      <div className="part-card-top"><h3 className="part-number">{number}</h3><span className="quantity-badge" aria-label={`Quantity: ${part.quantity ?? "not specified"}`}>QTY {part.quantity ?? "—"}</span><span className="part-status" data-status={part.status}>{part.sourceStatus || part.status}</span></div>
      {detail && <p className="part-description" title={detail}>{detail}</p>}
      <div className="part-tags">{part.priority !== "Normal" && <span className={`priority-tag priority-${part.priority.toLowerCase()}`}>{part.sourcePriority || part.priority}</span>}<span className="category-tag" data-category={part.category}>{part.category}</span><p className="part-assignee" data-assigned={Boolean(part.assignee)}><UserRound size={14} aria-hidden="true" /><span>{part.assignee || "Unassigned"}</span></p></div>
      <PartDrawings part={part} />
    </article>
  );
}

function Lane({ title, parts, active, page, tv }: { title: string; parts: Part[]; active?: boolean; page: number; tv: boolean }) {
  const sorted = sortParts(parts);
  const pageSize = 4;
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = page % pages;
  const shown = tv ? sorted.slice(current * pageSize, current * pageSize + pageSize) : sorted;
  return (
    <section className={`shop-lane ${active ? "active-lane" : ""}`} aria-label={title}>
      <div className="lane-header"><h2>{title}</h2><span className="lane-count">{parts.length}</span></div>
      <div className="lane-parts">{shown.map((part) => <PartCard key={part.id} part={part} />)}{shown.length === 0 && <div className="lane-empty"><Check size={20} /><span>{active ? "No parts in progress" : "Queue is clear"}</span></div>}</div>
      <div className="lane-footer">{tv && pages > 1 ? `Page ${current + 1} of ${pages} · rotates every 15s` : `${parts.length} ${active ? "in progress" : "in queue"}`}</div>
    </section>
  );
}

export function ManufacturingBoard({ initialData }: { initialData: BoardData | null }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [tv, setTv] = useState(false);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState("");
  const searching = Boolean(search.trim());
  const [settings, setSettings] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const requestSequence = useRef(0);

  const load = useCallback((fresh = false) => {
    const sequence = ++requestSequence.current;
    return fetch(fresh ? "/api/board?refresh=1" : "/api/board", { cache: "no-store", signal: AbortSignal.timeout(60_000) }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load board.");
      if (sequence === requestSequence.current) { setData(result); setNow(Date.now()); setError(""); }
    }).catch((error: unknown) => {
      if (sequence === requestSequence.current) setError(error instanceof Error ? error.message : "Unable to refresh the board.");
    }).finally(() => { if (sequence === requestSequence.current) setLoading(false); });
  }, []);

  useEffect(() => {
    if (!initialData) void load();
  }, [initialData, load]);
  useEffect(() => {
    if (data?.source !== "monday") return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, data.refreshSeconds * 1000);
    return () => clearInterval(timer);
  }, [data?.source, data?.refreshSeconds, load]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!tv || paused || settings || searching) return;
    const timer = setInterval(() => setPage((value) => value + 1), 15_000);
    return () => clearInterval(timer);
  }, [tv, paused, settings, searching]);

  async function toggleTv() {
    if (tv) {
      setTv(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    } else {
      setTv(true); setPage(0);
      await document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  const allParts = data?.parts ?? [];
  const parts = searchParts(allParts, search);
  const progress = robotProgress(allParts);
  const completed = recentCompletions(parts, data?.retentionHours ?? 48, now);
  const uncategorized = parts.filter((part) => part.category === "Uncategorized" && part.status !== "Completed" && part.status !== "In progress");
  const inProgress = parts.filter((part) => part.status === "In progress");
  const completedParts = parts.filter((part) => part.status === "Completed").sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || "") || a.name.localeCompare(b.name));
  const syncDate = data ? new Date(data.fetchedAt) : null;

  return (
    <div className={`shop-app ${tv ? "tv-mode" : ""} ${paused ? "motion-paused" : ""}`}>
      <header className="shop-header">
        <div className="shop-brand"><span className="shop-logo"><Wrench size={21} /></span><div><span className="shop-eyebrow">APPS ROBOTICS / SHOP FLOOR</span><h1>{data?.name || "Manufacturing"}<span className="title-dot">.</span></h1></div></div>
        <div className="shop-header-actions"><span className={`source-badge ${error ? "source-error" : ""}`}><span />{error ? "Sync issue" : data?.source === "monday" ? "Monday connected" : data ? "Demo board" : "Connecting"}</span><button type="button" className="shop-button icon-only" onClick={() => setSettings(true)} aria-label="Monday setup"><Settings2 size={17} /></button><button type="button" className="shop-button" onClick={() => void toggleTv()}>{tv ? <Minimize2 size={15} /> : <Maximize2 size={15} />}<span>{tv ? "Exit TV" : "TV mode"}</span></button></div>
      </header>

      <div className="shop-search-bar" role="search">
        <Search size={18} aria-hidden="true" />
        <input type="search" id="part-search" placeholder="Search parts, descriptions, assignees, statuses, or files…" aria-label="Search parts" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
        <span className="search-count" role="status" aria-live="polite">{data ? `${parts.length} ${parts.length === 1 ? "part" : "parts"}${searching ? ` found / ${allParts.length}` : ""}` : ""}</span>
        {search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(""); document.getElementById("part-search")?.focus(); }}><X size={16} /></button>}
        <div className="shop-tools"><button type="button" className="shop-button icon-only" aria-label={paused ? "Resume animations and page rotation" : "Pause animations and page rotation"} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>{data?.source !== "demo" && <button type="button" className="shop-button icon-only" aria-label="Refresh Monday board" disabled={loading} onClick={() => { setLoading(true); void load(true); }}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>}</div>
      </div>

      {data?.source === "demo" && <div className="demo-banner"><span><span className="demo-pill">DEMO</span>Sample parts and quantities. Updates are made in Monday.</span><button type="button" onClick={() => setSettings(true)}>Connect Monday <ArrowUpRight size={13} /></button></div>}
      {error && <div className="shop-alert" role="alert"><AlertTriangle size={16} /><span>{error} {data && "Showing the last successful snapshot."}</span><button type="button" onClick={() => { setLoading(true); void load(true); }}>Retry</button></div>}
      {data?.warnings.map((warning) => <div className="shop-warning" key={warning}><AlertTriangle size={14} />{warning}</div>)}

      {!data ? <main className="shop-loading">{loading ? <Loader2 className="animate-spin" /> : <AlertTriangle />}<h2>{loading ? "Loading the shop floor…" : "Monday setup needs attention"}</h2><p>{loading ? "Fetching parts, quantities, and drawings." : "Open setup for the board structure and connection steps."}</p><button type="button" className="shop-button" onClick={() => setSettings(true)}>Monday setup</button></main> : <>
        {searching ? <main className="shop-search-results" aria-label="Search results">{sortParts(parts).map((part) => <PartCard key={part.id} part={part} />)}{!parts.length && <div className="search-empty"><Search size={24} /><h2>No parts found</h2><p>Try a part number, description, assignee, category, status, or drawing filename.</p><button type="button" className="shop-button" onClick={() => setSearch("")}>Clear search</button></div>}</main> : <main className="shop-board" aria-label="Manufacturing queues">
          {CATEGORIES.map((category) => <Lane key={category} title={category} parts={parts.filter((part) => part.category === category && part.status !== "In progress" && part.status !== "Completed")} page={page} tv={tv} />)}
          <Lane title="In progress" parts={inProgress} active page={page} tv={tv} />
        </main>}
        {!searching && uncategorized.length > 0 && <section className="uncategorized-parts"><h2>Uncategorized — update Category in Monday</h2><div>{uncategorized.map((part) => <PartCard key={part.id} part={part} />)}</div></section>}
        <section className="completed-strip" aria-label="Recently completed parts">
          <div className="completed-label"><CheckCheck size={18} /><span>COMPLETED<span>LAST {data.retentionHours} HOURS</span></span><strong>{completed.length}</strong></div>
          <div className="ticker-viewport">{completed.length ? <div className="ticker-track">{[0, 1].map((copy) => <div className="ticker-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>{completed.map((part) => <div className="ticker-part" key={`${copy}-${part.id}`}><Check size={12} /><strong>{part.name}</strong><span>{part.category}</span></div>)}</div>)}</div> : <span className="ticker-empty">No recent completions</span>}</div>
        </section>
        {!searching && <details className="completed-history">
          <summary>All completed parts <span>{completedParts.length}</span></summary>
          <div className="completed-history-grid">{completedParts.map((part) => <PartCard key={part.id} part={part} />)}{!completedParts.length && <p className="notes-empty">No completed parts match.</p>}</div>
        </details>}
        <div className="shop-bottom">
          <section className="notes-panel"><div className="panel-heading"><h2>Shop notes & dates</h2></div><div className="note-list">{data.notes.length ? data.notes.map((note) => <div key={note.id} className="shop-note"><span className="note-marker" />{note.date && <time dateTime={note.date}>{new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(note.date))}</time>}<p>{note.text}</p></div>) : <p className="notes-empty">No shop notes</p>}</div></section>
          <section className="robot-panel"><div className="panel-heading"><h2>Robot progress</h2></div><div className="progress-summary"><div><strong>{progress.percent}<span>%</span></strong><p>{progress.completed} of {progress.total} parts completed</p></div></div><div className="robot-progress" role="progressbar" aria-label="Robot parts completed" aria-valuemin={0} aria-valuemax={progress.total || 1} aria-valuenow={progress.completed}><span className="progress-done" style={{ width: `${progress.total ? progress.completed / progress.total * 100 : 0}%` }} /><span className="progress-active" style={{ width: `${progress.total ? progress.active / progress.total * 100 : 0}%` }} /></div><div className="progress-legend"><span><i className="legend-complete" />Completed {progress.completed}</span><span><i className="legend-active" />In progress {progress.active}</span><span><i />Remaining {progress.total - progress.completed - progress.active}</span></div></section>
        </div>
      </>}
      <footer className="shop-footer"><span><Clock3 size={11} />{syncDate ? `Snapshot ${new Intl.DateTimeFormat("en-CA", { hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" }).format(syncDate)} ET` : "Waiting for first sync"}{data?.source === "monday" && ` · refresh every ${Math.round(data.refreshSeconds / 60)} min`}{tv && " · queues rotate every 15s"}</span></footer>

      <Dialog open={settings} onOpenChange={setSettings}><DialogContent className="max-h-[85svh] overflow-auto sm:max-w-xl"><DialogHeader><DialogTitle>Connect the shop to Monday</DialogTitle><DialogDescription>Connection and board settings.</DialogDescription></DialogHeader><ol className="list-decimal space-y-3 pl-5 text-sm leading-6"><li>Use one top-level item per part, with Category (Status), Status (Status), Priority (Status), Files (Files), and Completed Date (Date).</li><li>Description (Long text), QTY (Numbers), and Drawing Status (Status) provide extra part details. An optional People or Text column shows assignees on the cards.</li><li>Update parts directly in Monday. This display keeps your board’s labels. Working on it and Final Machining appear In progress; Pending and Saw Cut stay in the queues; Done counts as completed; Stuck is blocked. Medium sorts as Normal priority.</li><li>Keep your token and board ID in the server’s <code>.env.local</code>. Run <code>npm run monday:inspect</code> to inspect column IDs and labels, then configure the matching variables.</li><li>File buttons on each card open drawings in a new tab. Use search to find active or completed parts by number, description, assignee, category, status, or filename.</li><li>For completions made inside Monday, use an automation to set Completed Date when Status becomes Done, or enter the date manually.</li></ol><p className="text-sm text-muted-foreground">Older completed parts stay in robot progress and All completed parts. Only parts with a recent completion date appear in the ticker. The display refreshes automatically; manual refresh has a 10-second cooldown.</p><Button variant="outline" asChild><a href="https://developer.monday.com/api-reference/docs/authentication" target="_blank" rel="noreferrer">Monday token instructions <ArrowUpRight /></a></Button></DialogContent></Dialog>
    </div>
  );
}
