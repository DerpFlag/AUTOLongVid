'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, Job } from '@/lib/supabase';

/* Step icons – coding-green theme (SVG) */
const IconQueued = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></svg>
);
const IconScripts = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
);
const IconVoices = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v4" /><path d="M8 23h8" /></svg>
);
const IconImages = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
);
const IconVideo = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
);
const IconSuccess = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" /></svg>
);

const PIPELINE_STEPS = [
  { key: 'pending', label: 'Queued', icon: IconQueued },
  { key: 'generating_jsons', label: 'Scripts', icon: IconScripts },
  { key: 'generating_voice', label: 'Voices', icon: IconVoices },
  { key: 'generating_images', label: 'Images', icon: IconImages },
  { key: 'stitching', label: 'Video', icon: IconVideo },
  { key: 'complete', label: 'Success', icon: IconSuccess },
];

const ELEVEN_VOICES = [
  { value: 'Adam - Dominant, Firm', label: 'Adam - Dominant, Firm' },
  { value: 'Alice - Clear, Engaging Educator', label: 'Alice - Clear, Engaging Educator' },
  { value: 'Antoni', label: 'Antoni' },
  { value: 'Aria', label: 'Aria' },
  { value: 'Arnold', label: 'Arnold' },
  { value: 'Bella - Professional, Bright, Warm', label: 'Bella - Professional, Bright, Warm' },
  { value: 'Bill - Wise, Mature, Balanced', label: 'Bill - Wise, Mature, Balanced' },
  { value: 'Brian - Deep, Resonant and Comforting', label: 'Brian - Deep, Resonant and Comforting' },
  { value: 'Callum - Husky Trickster', label: 'Callum - Husky Trickster' },
  { value: 'Charlie - Deep, Confident, Energetic', label: 'Charlie - Deep, Confident, Energetic' },
  { value: 'Charlotte', label: 'Charlotte' },
  { value: 'Chris - Charming, Down-to-Earth', label: 'Chris - Charming, Down-to-Earth' },
  { value: 'Clyde', label: 'Clyde' },
  { value: 'Daniel - Steady Broadcaster', label: 'Daniel - Steady Broadcaster' },
  { value: 'Dave', label: 'Dave' },
  { value: 'Domi', label: 'Domi' },
  { value: 'Dorothy', label: 'Dorothy' },
  { value: 'Drew', label: 'Drew' },
  { value: 'Elli', label: 'Elli' },
  { value: 'Emily', label: 'Emily' },
  { value: 'Eric - Smooth, Trustworthy', label: 'Eric - Smooth, Trustworthy' },
  { value: 'Ethan', label: 'Ethan' },
  { value: 'Fin', label: 'Fin' },
  { value: 'Freya', label: 'Freya' },
  { value: 'George - Warm, Captivating Storyteller', label: 'George - Warm, Captivating Storyteller' },
  { value: 'Gigi', label: 'Gigi' },
  { value: 'Giovanni', label: 'Giovanni' },
  { value: 'Glinda', label: 'Glinda' },
  { value: 'Grace', label: 'Grace' },
  { value: 'Harry - Fierce Warrior', label: 'Harry - Fierce Warrior' },
  { value: 'James', label: 'James' },
  { value: 'Jeremy', label: 'Jeremy' },
  { value: 'Jessica - Playful, Bright, Warm', label: 'Jessica - Playful, Bright, Warm' },
  { value: 'Jessie', label: 'Jessie' },
  { value: 'Joseph', label: 'Joseph' },
  { value: 'Josh', label: 'Josh' },
  { value: 'Laura - Enthusiast, Quirky Attitude', label: 'Laura - Enthusiast, Quirky Attitude' },
  { value: 'Liam - Energetic, Social Media Creator', label: 'Liam - Energetic, Social Media Creator' },
  { value: 'Lily - Velvety Actress', label: 'Lily - Velvety Actress' },
  { value: 'Matilda - Knowledgable, Professional', label: 'Matilda - Knowledgable, Professional' },
  { value: 'Michael', label: 'Michael' },
  { value: 'Mimi', label: 'Mimi' },
  { value: 'Nicole', label: 'Nicole' },
  { value: 'Patrick', label: 'Patrick' },
  { value: 'Paul', label: 'Paul' },
  { value: 'Rachel', label: 'Rachel' },
  { value: 'River - Relaxed, Neutral, Informative', label: 'River - Relaxed, Neutral, Informative' },
  { value: 'Roger - Laid-Back, Casual, Resonant', label: 'Roger - Laid-Back, Casual, Resonant' },
  { value: 'Sam', label: 'Sam' },
  { value: 'Sarah - Mature, Reassuring, Confident', label: 'Sarah - Mature, Reassuring, Confident' },
  { value: 'Serena', label: 'Serena' },
  { value: 'Thomas', label: 'Thomas' },
  { value: 'Will - Relaxed Optimist', label: 'Will - Relaxed Optimist' },
];

function getStepState(jobStatus: string, stepKey: string) {
  const stepOrder = PIPELINE_STEPS.map(s => s.key);
  const currentIdx = stepOrder.indexOf(jobStatus);
  const stepIdx = stepOrder.indexOf(stepKey);
  if (jobStatus === 'error') return stepIdx < currentIdx ? 'done' : stepIdx === currentIdx ? 'error' : 'pending';
  if (stepKey === 'complete' && jobStatus === 'complete') return 'done';
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

function getStatusBadge(status: string) {
  if (status === 'complete') return { className: 'status-complete', dotClass: 'pulse-dot-complete', label: 'Complete' };
  if (status === 'error') return { className: 'status-error', dotClass: 'pulse-dot-error', label: 'Error' };
  if (status === 'pending') return { className: 'status-pending', dotClass: '', label: 'Pending' };
  return { className: 'status-processing', dotClass: 'pulse-dot-processing', label: 'Processing' };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const [script, setScript] = useState('');
  const [voiceName, setVoiceName] = useState(() => ELEVEN_VOICES.find(v => v.value === 'Rachel')?.value ?? ELEVEN_VOICES[0].value);
  const [segmentCount, setSegmentCount] = useState(5);

  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (!error && data) {
      setJobs(data as Job[]);
      setSelectedJob(prev => {
        if (!prev) return null;
        const updated = data.find(j => j.id === prev.id);
        return updated ? (updated as Job) : prev;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const lastJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    const container = logContainerRef.current;
    if (container && selectedJob) {
      const isSameJob = lastJobIdRef.current === selectedJob.id;
      lastJobIdRef.current = selectedJob.id;
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      if (isSameJob && isAtBottom) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else if (!isSameJob) {
        container.scrollTop = 0;
      }
    }
  }, [selectedJob?.logs, selectedJob?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!script.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: script.trim(), voice_name: voiceName, segment_count: segmentCount }),
      });
      const data = await res.json();
      if (data.success) {
        setScript('');
        fetchJobs();
      }
    } catch (err) {
      console.error('Submit error:', err);
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <section className="glass-card cyber-chamfer mb-6 p-6">
        <h1
          className="text-accent text-lg md:text-xl font-bold uppercase tracking-[0.2em] mb-3"
          style={{ fontFamily: 'var(--font-heading), monospace' }}
        >
          Automated Long Format Text to Video Pipeline
        </h1>
        <p className="text-sm text-mutedForeground leading-relaxed">
          Convert long-form, text-based scripts into fully assembled AI videos — voice, visuals, and final render —
          with an automated, cloud-native pipeline tuned for desirable long-format storytelling.
        </p>
      </section>
      <div className="dashboard-grid">
        {/* Left: Form + Job list */}
        <div className="flex flex-col gap-6">
          <div className="glass-card cyber-chamfer animate-fade-in p-6">
            <h2
              className="form-label mb-5 text-accent uppercase tracking-[0.2em] cyber-glitch-subtle inline-block"
              style={{ fontFamily: 'var(--font-heading), monospace', fontSize: '1rem' }}
              data-text="▶ START NEW PIPELINE"
            >
              ▶ Start New Pipeline
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="form-label">Script</label>
                <div className="input-wrapper">
                  <textarea
                    className="input-field cyber-chamfer-sm"
                    placeholder="Paste your story or script..."
                    value={script}
                    onChange={e => setScript(e.target.value)}
                    rows={5}
                  />
                </div>
              </div>
              <div className="grid grid-cols-[1.5fr_1fr] gap-4">
                <div>
                  <label className="form-label">Voice</label>
                  <select
                    className="input-field cyber-chamfer-sm"
                    value={voiceName}
                    onChange={e => setVoiceName(e.target.value)}
                  >
                    {ELEVEN_VOICES.map(v => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Approx Duration</label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      className="input-field cyber-chamfer-sm"
                      min={1}
                      max={60}
                      value={segmentCount}
                      onChange={e => setSegmentCount(Math.min(60, Math.max(1, parseInt(e.target.value) || 5)))}
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="btn-gradient cyber-chamfer-sm w-full"
                disabled={submitting || !script.trim()}
              >
                {submitting ? '⏳ Submitting...' : '▶ Generate Assets'}
              </button>
            </form>
          </div>

          <div className="glass-card cyber-chamfer p-5">
            <h2
              className="form-label mb-4 uppercase tracking-[0.2em]"
              style={{ fontFamily: 'var(--font-heading), monospace', fontSize: '0.85rem' }}
            >
              Recent Tasks
            </h2>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton cyber-chamfer-sm h-14" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <p className="text-center py-8 text-mutedForeground text-sm uppercase tracking-wider">No tasks yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {jobs.map((job) => {
                  const badge = getStatusBadge(job.status);
                  return (
                    <div
                      key={job.id}
                      className={`job-card glass-card cyber-chamfer-sm p-3 ${selectedJob?.id === job.id ? 'active' : ''}`}
                      onClick={() => setSelectedJob(job)}
                    >
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <span className="text-foreground text-sm font-medium truncate max-w-[200px]">
                          {job.script.substring(0, 36)}...
                        </span>
                        <span className={`status-badge ${badge.className} flex-shrink-0`}>{badge.label}</span>
                      </div>
                      <p className="text-xs text-mutedForeground uppercase tracking-wider">
                        ~{job.segment_count * 10}s • {timeAgo(job.created_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Job detail */}
        <div className="glass-card terminal cyber-chamfer animate-fade-in p-7 min-h-[600px]">
          {!selectedJob ? (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-mutedForeground gap-6">
              <span className="text-5xl opacity-60" style={{ filter: 'drop-shadow(0 0 8px var(--accent))' }}>▶</span>
              <div className="text-center">
                <p
                  className="cyber-glitch text-accent font-bold text-xl uppercase tracking-[0.25em] mb-3"
                  style={{ fontFamily: 'var(--font-heading), monospace', textShadow: '0 0 12px rgba(0,255,136,0.4)' }}
                  data-text="CLOUD STUDIO"
                >
                  Cloud Studio
                </p>
                <p className="text-sm max-w-[280px] mx-auto tracking-wide">
                  Select a task from the list or start a new one to generate AI assets.
                  <span className="inline-block w-2 h-4 ml-0.5 bg-accent align-middle animate-blink" aria-hidden />
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start gap-4 mb-8">
                <div>
                  <h2
                    className="cyber-glitch text-accent uppercase tracking-[0.15em] text-xl font-bold mb-1 inline-block"
                    style={{ fontFamily: 'var(--font-heading), monospace', textShadow: '0 0 10px rgba(0,255,136,0.4)' }}
                    data-text="TASK EXECUTION"
                  >
                    Task Execution
                  </h2>
                  <p className="text-xs text-mutedForeground font-mono">ID: {selectedJob.id}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`status-badge ${getStatusBadge(selectedJob.status).className} mb-2`}>
                    {selectedJob.status}
                  </div>
                  <p className="text-accent font-bold text-lg" style={{ textShadow: '0 0 10px rgba(0,255,136,0.5)' }}>
                    {selectedJob.progress}%
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <div className="progress-bar cyber-chamfer-sm mb-5">
                  <div className="progress-fill" style={{ width: `${selectedJob.progress}%` }} />
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {PIPELINE_STEPS.map((step) => {
                    const state = getStepState(selectedJob.status, step.key);
                    const StepIcon = step.icon;
                    return (
                      <div key={step.key} className="text-center">
                        <div className={`step-icon step-${state} mx-auto mb-2`}>
                          {state === 'done' ? <IconSuccess /> : <StepIcon />}
                        </div>
                        <p className={`text-[0.65rem] font-bold uppercase tracking-wider ${state === 'active' ? 'text-accent' : 'text-mutedForeground'}`}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="form-label mb-3">Current Activity</h3>
                <div
                  className="cyber-chamfer-sm p-4 flex items-center gap-3 border border-border"
                  style={{ background: 'rgba(0, 255, 136, 0.04)', borderColor: 'rgba(0, 255, 136, 0.2)' }}
                >
                  <div className="pulse-dot pulse-dot-processing" />
                  <span className="text-sm font-medium text-foreground">
                    {selectedJob.current_task || 'Initializing...'}
                  </span>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="form-label mb-3">Live Execution Logs</h3>
                <div className="log-container cyber-chamfer-sm" ref={logContainerRef}>
                  {selectedJob.logs && selectedJob.logs.length > 0 ? (
                    <>
                      {selectedJob.logs.map((log, idx) => (
                        <div key={idx} className="log-item">
                          <span className="log-timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className={`log-message log-${log.type}`}>{log.message}</span>
                        </div>
                      ))}
                      {selectedJob.status === 'error' && selectedJob.error_message && (
                        <div className="log-item">
                          <span className="log-timestamp">[{new Date().toLocaleTimeString()}]</span>
                          <span className="log-message log-error log-error-block">{selectedJob.error_message}</span>
                        </div>
                      )}
                    </>
                  ) : selectedJob.status === 'error' && selectedJob.error_message ? (
                    <div className="log-item">
                      <span className="log-timestamp">[{new Date().toLocaleTimeString()}]</span>
                      <span className="log-message log-error log-error-block">{selectedJob.error_message}</span>
                    </div>
                  ) : (
                    <p className="py-5 text-center text-mutedForeground text-sm">Waiting for log data...</p>
                  )}
                </div>
              </div>

              {selectedJob.status === 'complete' && (
                <div className="mb-8 space-y-4">
                  <div
                    className="cyber-chamfer-sm p-5 border flex flex-wrap justify-between items-center gap-4"
                    style={{ background: 'rgba(0, 255, 136, 0.06)', borderColor: 'rgba(0, 255, 136, 0.3)' }}
                  >
                    <div>
                      <h4 className="text-accent font-bold uppercase tracking-wider mb-1">Task Complete</h4>
                      <p className="text-sm text-mutedForeground">All assets generated and stored.</p>
                    </div>
                    <a
                      href={`https://supabase.com/dashboard/project/acpxzjrjhvvnwnqzgbxk/storage/buckets/pipeline_output?filter=${selectedJob.output_folder}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gradient cyber-chamfer-sm inline-block px-5 py-2.5 text-sm no-underline"
                    >
                      Browse Assets
                    </a>
                  </div>
                  {selectedJob.output_folder && (
                    <div
                      className="cyber-chamfer-sm p-4 border"
                      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                    >
                      <h4 className="text-accent font-bold uppercase tracking-wider mb-3 text-sm">Result Video</h4>
                      <div className="aspect-video bg-black/60 cyber-chamfer-sm overflow-hidden">
                        <video
                          key={selectedJob.output_folder}
                          className="w-full h-full object-contain"
                          controls
                          preload="metadata"
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/pipeline_output/${selectedJob.output_folder}/final_video.mp4`}
                          playsInline
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h3 className="form-label mb-3">Script Context</h3>
                <div
                  className="cyber-chamfer-sm p-4 text-sm leading-relaxed text-mutedForeground max-h-28 overflow-y-auto border border-border"
                  style={{ background: 'var(--input)' }}
                >
                  {selectedJob.script}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
