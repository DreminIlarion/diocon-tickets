import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, FolderOpen, Search, Loader2, Users,
  X, Check, ChevronDown, Filter, ChevronRight, ChevronLeft,
  Calendar, Sparkles, Archive, Crown, UserCheck, Zap, ArrowRight,
} from 'lucide-react';
import { projectsApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { Project } from '../types';
import GridBackground from '../components/ui/GridBackground';

/* ═══════════════════════════════════════════════════════════════════════════
   ROLE DROPDOWN
   ═══════════════════════════════════════════════════════════════════════════ */

const ROLE_OPTIONS = [
  { value: 'all', label: 'Все мои проекты' },
  { value: 'owner', label: 'Где я владелец' },
  { value: 'member', label: 'Где я участник' },
] as const;

type ProjectRole = typeof ROLE_OPTIONS[number]['value'];

function RoleDropdown({ value, onChange }: { value: ProjectRole; onChange: (v: ProjectRole) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [openUp, setOpenUp] = useState(false);
  const [alignRight, setAlignRight] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setOpenUp(window.innerHeight - rect.bottom < 200);
    setAlignRight(window.innerWidth - rect.left < 220);
  }, [open]);

  const selected = ROLE_OPTIONS.find(o => o.value === value);
  const isFiltered = value !== 'all';

  return (
    <div ref={containerRef} className="relative">
      <button ref={btnRef} type="button" onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm transition-all whitespace-nowrap cursor-pointer
          ${open ? 'bg-[var(--accent-soft)] border-[var(--accent)]/30 text-[var(--text-primary)]'
            : isFiltered ? 'bg-red-500/5 border-[var(--accent)]/15 text-[var(--text-primary)]'
            : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'}`}>
        <Filter size={14} className={isFiltered ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
        <span>{selected?.label}</span>
        {isFiltered ? (
          <span onClick={e => { e.stopPropagation(); onChange('all'); setOpen(false); }}
            className="ml-0.5 p-0.5 rounded-md hover:bg-[var(--hover-1)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors">
            <X size={12} />
          </span>
        ) : (
          <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className={`absolute z-[100] min-w-[220px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden
          ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'} ${alignRight ? 'right-0' : 'left-0'}`}
          style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="py-1.5">
            {ROLE_OPTIONS.map(opt => {
              const active = opt.value === value;
              return (
                <button type="button" key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors
                    ${active ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--hover-1)]'}`}>
                  {active ? <Check size={14} className="text-[var(--accent)] flex-shrink-0" /> : <span className="w-[14px] flex-shrink-0" />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════════════════════════ */

function StatCard({ label, value, icon: Icon, color, bg }: {
  label: string; value: number; icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="glass-card rounded-xl border border-[var(--border-color)] p-4 flex items-center gap-3
                    hover:border-[var(--border-hover)] hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)] leading-none mb-0.5">{value}</p>
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER TAG
   ═══════════════════════════════════════════════════════════════════════════ */

function FilterTag({ label, icon, colorClass, onRemove }: {
  label: string; icon?: React.ReactNode; colorClass?: string; onRemove: () => void;
}) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80
      ${colorClass || 'bg-[var(--hover-1)] text-[var(--text-primary)] border-[var(--border-color)]'}`}>
      {icon}
      <span className="truncate max-w-[120px]">{label}</span>
      <X size={10} className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(); }} />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROJECT CARD
   ═══════════════════════════════════════════════════════════════════════════ */

function ProjectCard({ project, userRole, formatDate, getParticipantsCount }: {
  project: Project;
  userRole: string | null;
  formatDate: (d: string) => string;
  getParticipantsCount: (p: Project) => number;
}) {
  const isActive = project.status === 'active';

  return (
    <Link to={`/projects/${project.id}`}
      className="glass-card rounded-xl border border-[var(--border-color)] p-5
                 hover:border-[var(--border-hover)] hover:-translate-y-0.5
                 transition-all duration-200 group block">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
            ${isActive
              ? 'bg-[var(--accent-soft)] group-hover:from-red-500/15 group-hover:to-red-600/10'
              : 'bg-[var(--hover-1)]'}`}>
            <FolderOpen className={`w-5 h-5 transition-colors
              ${isActive
                ? 'text-[var(--accent)]/70 group-hover:text-[var(--accent)]'
                : 'text-[var(--text-muted)]'}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug
                           group-hover:text-[var(--accent)] transition-colors truncate">
              {project.name || 'Без названия'}
            </h3>
            <span className="text-xs font-mono text-[var(--text-muted)]">{project.key || '—'}</span>
          </div>
        </div>
        <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent)]
          group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border
          ${isActive
            ? 'bg-emerald-500/10 text-[var(--success)] border-emerald-500/20'
            : 'bg-[var(--hover-1)] text-[var(--text-muted)] border-[var(--border-color)]'}`}>
          {isActive ? <Sparkles size={10} /> : <Archive size={10} />}
          {isActive ? 'Активен' : 'Архив'}
        </span>

        {userRole && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border
            ${userRole === 'owner'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-blue-500/10 text-[var(--info)] border-blue-500/20'}`}>
            {userRole === 'owner' ? <Crown size={10} /> : <UserCheck size={10} />}
            {userRole === 'owner' ? 'Владелец' : 'Участник'}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-color)]">
        <span className="flex items-center gap-1.5">
          <Calendar size={11} />
          {formatDate(project.created_at)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={11} />
          {getParticipantsCount(project)}
        </span>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════════════════ */

function EmptyState({ hasFilters, search, isCustomer, canCreate }: {
  hasFilters: boolean; search: string; isCustomer: boolean; canCreate: boolean;
}) {
  return (
    <div className="glass-card rounded-2xl border border-[var(--border-color)] p-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-[var(--hover-1)] flex items-center justify-center mx-auto mb-6">
        <FolderOpen className="w-10 h-10 text-[var(--text-primary)]/20" />
      </div>
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Нет проектов</h3>
      <p className="text-base text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
        {search ? 'По вашему запросу ничего не найдено'
          : isCustomer ? 'Вы пока не участвуете ни в одном проекте'
          : 'Создайте первый проект, чтобы начать работу'}
      </p>
      {canCreate && !hasFilters && (
        <Link to="/projects/new" className="btn-primary inline-flex items-center gap-2 py-3 px-6 text-sm">
          <Plus size={16} /> Создать проект
        </Link>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ProjectsPage() {
  const { user } = useAuthStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [projectRole, setProjectRole] = useState<ProjectRole>('all');

  const isCustomer = user?.role === 'customer';
  const isCustomerAdmin = user?.role === 'customer_admin';
  const isSupport = user?.role === 'support_agent' || user?.role === 'support_manager';
  const isAdmin = user?.role === 'admin';
  const canCreateProject = isSupport || isAdmin;

  useEffect(() => { loadProjects(); }, [page, projectRole]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      let response;
      if (isCustomer) {
        response = await projectsApi.getMyProjects(projectRole, page, 20);
      } else {
        response = await projectsApi.getAll(page, 20);
      }
      setProjects(response.items || []);
      setTotalPages(response.total_pages || 1);
      setTotalItems(response.total_items || 0);
    } catch (e) {
      console.error(e);
      setProjects([]);
    } finally { setLoading(false); }
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    if (!normalizedSearch) return projects;
    return projects.filter(p =>
      (p.name || '').toLowerCase().includes(normalizedSearch) ||
      (p.key || '').toLowerCase().includes(normalizedSearch) ||
      (p.description || '').toLowerCase().includes(normalizedSearch)
    );
  }, [projects, normalizedSearch]);

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getParticipantsCount = (project: Project) =>
    Array.isArray(project.memberships) ? project.memberships.length : 0;

  const getTotalParticipants = () =>
    projects.reduce((sum, p) => sum + getParticipantsCount(p), 0);

  const getActiveCount = () => projects.filter(p => p?.status === 'active').length;

  const getUserRoleInProject = (project: Project) => {
    if (!user?.user_id) return null;
    return project.memberships?.find(m => m.user_id === user.user_id)?.project_role ?? null;
  };

  const hasFilters = !!(search || (isCustomer && projectRole !== 'all'));

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-[var(--text-primary)]">
            {isCustomer ? 'Мои проекты' : 'Проекты'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {isCustomer ? 'Проекты, в которых вы участвуете' : 'Управление проектами'}
            {totalItems > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--hover-2)] text-xs font-medium">{totalItems}</span>
            )}
          </p>
        </div>
        {canCreateProject && (
          <Link to="/projects/new" className="btn-primary py-3 px-6 text-sm font-semibold flex items-center gap-2">
            <Plus size={16} /> Создать проект
          </Link>
        )}
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Всего" value={totalItems}
          icon={FolderOpen} color="text-[var(--text-secondary)]" bg="bg-[var(--hover-1)]" />
        <StatCard label="Активных" value={getActiveCount()}
          icon={Sparkles} color="text-[var(--success)]" bg="bg-emerald-500/10" />
        <StatCard label="Участников" value={getTotalParticipants()}
          icon={Users} color="text-[var(--info)]" bg="bg-blue-500/10" />
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className=" space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию или ключу..."
              className="w-full pl-12 pr-10 py-3 glass-card border border-[var(--border-color)]
                         rounded-xl text-[var(--text-primary)] text-base placeholder-white/30
                         focus:outline-none focus:border-[var(--accent)]/30 focus:ring-2 focus:ring-[var(--accent-ring)]
                         transition-all" />
            {search && (
              <button type="button" onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded
                  text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
          {isCustomer && <RoleDropdown value={projectRole} onChange={v => { setProjectRole(v); setPage(1); }} />}
        </div>

        {/* Active filter tags */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border-color)]">
            <span className="text-[11px] text-[var(--text-muted)] mr-1">Активно:</span>
            {search && (
              <FilterTag label={`«${search}»`} icon={<Search size={10} />} onRemove={() => setSearch('')} />
            )}
            {isCustomer && projectRole !== 'all' && (
              <FilterTag
                label={ROLE_OPTIONS.find(o => o.value === projectRole)?.label || ''}
                icon={<Filter size={10} />}
                colorClass="bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/15"
                onRemove={() => { setProjectRole('all'); setPage(1); }}
              />
            )}
            <button onClick={() => { setSearch(''); setProjectRole('all'); setPage(1); }}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors ml-1">
              Сбросить
            </button>
          </div>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      {loading && projects.length > 0 && (
        <div className="flex justify-center py-3">
          <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
        </div>
      )}

      {filteredProjects.length === 0 && !loading ? (
        <EmptyState hasFilters={hasFilters} search={search} isCustomer={isCustomer} canCreate={canCreateProject} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                userRole={getUserRoleInProject(project)}
                formatDate={formatDate}
                getParticipantsCount={getParticipantsCount}
              />
            ))}
          </div>

          {/* ── Pagination ─────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card border border-[var(--border-color)]
                  hover:bg-[var(--hover-1)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-primary)] text-base transition-colors">
                <ChevronLeft className="w-4 h-4" /> Назад
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-base font-medium transition-all ${
                        pageNum === page
                          ? 'bg-[var(--accent)] text-white shadow-lg shadow-red-700/20'
                          : 'glass-card text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--hover-2)]'}`}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card border border-[var(--border-color)]
                  hover:bg-[var(--hover-1)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-primary)] text-base transition-colors">
                Вперёд <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}