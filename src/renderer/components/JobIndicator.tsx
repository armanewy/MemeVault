import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Job } from '../types/api';

export function JobIndicator(): JSX.Element | null {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    void api.jobs.list().then(setJobs);
    return api.jobs.onUpdate((job) => {
      setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)].slice(0, 80));
    });
  }, []);

  const running = useMemo(() => jobs.filter((job) => job.status === 'queued' || job.status === 'running'), [jobs]);
  const failed = useMemo(() => jobs.filter((job) => job.status === 'failed').slice(0, 3), [jobs]);
  if (!running.length && !failed.length) return null;

  return (
    <div className="absolute bottom-4 right-4 z-40 w-80 rounded-md border border-border bg-panel p-3 shadow-palette">
      {running.length ? (
        <div className="mb-2 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin text-accent" size={16} aria-hidden />
          <span>{running.length} background job{running.length === 1 ? '' : 's'}</span>
        </div>
      ) : null}
      {running.slice(0, 3).map((job) => (
        <div key={job.id} className="mb-2">
          <div className="mb-1 flex justify-between text-xs text-textSecondary">
            <span>{job.type.replace(/_/g, ' ')}</span>
            <span>{Math.round(job.progress * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-panelAlt">
            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.max(4, job.progress * 100)}%` }} />
          </div>
        </div>
      ))}
      {failed.map((job) => (
        <div key={job.id} className="mt-2 flex gap-2 rounded-md border border-danger/50 bg-danger/10 p-2 text-xs text-danger">
          <AlertTriangle size={14} aria-hidden />
          <span className="line-clamp-2">{job.error || `${job.type} failed`}</span>
        </div>
      ))}
    </div>
  );
}

