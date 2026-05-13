import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, FolderOpen, Search, Loader2, Building2, Users,
  X, Check, ChevronDown, Filter,
} from 'lucide-react';
import { projectsApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { Project } from '../types';

// ─── Role Dropdown ────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'all', label: 'Все мои проекты' },
  { value: 'owner', label: 'Где я владелец' },
  { value: 'member', label: 'Где я участник' },
] as const;

type ProjectRole = typeof ROLE_OPTIONS[number]['value'];

function RoleDropdown({
  value, onChange,
}: {
  value: ProjectRole;
  onChange: (v: ProjectRole) => void;
}) {
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
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-2 px-3.5 py-3 rounded-xl border text-base
          transition-all whitespace-nowrap cursor-pointer
          ${open
            ? 'bg-red-500/10 border-red-500/40 text-[var(--text-primary)]'
            : isFiltered
              ? 'bg-red-500/5 border-red-500/30 text-[var(--text-primary)]'
              : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-primary)]/70 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
          }
        `}
      >
        <Filter size={15} className={isFiltered ? 'text-red-400' : 'text-[var(--text-primary)]/40'} />
        <span>{selected?.label}</span>
        {isFiltered ? (
          <span
            onClick={e => { e.stopPropagation(); onChange('all'); setOpen(false); }}
            className="ml-1 p-0.5 rounded-md hover:bg-[var(--hover-1)] text-[var(--text-primary)]/30 hover:text-[var(--text-primary)]/60 cursor-pointer transition-colors"
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown size={15} className={`text-[var(--text-primary)]/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div
          className={`
            absolute z-[100] min-w-[220px] bg-[var(--bg-card)] border border-[var(--border-color)]
            rounded-xl overflow-hidden
            ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'}
            ${alignRight ? 'right-0' : 'left-0'}
          `}
          style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.25)' }}
        >
          <div className="py-1.5">
            {ROLE_OPTIONS.map(opt => {
              const active = opt.value === value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-base transition-colors ${active ? 'bg-red-500/10 text-[var(--text-primary)]' : 'text-[var(--text-primary)]/70 hover:bg-[var(--hover-1)]'
                    }`}
                >
                  {active
                    ? <Check size={15} className="text-red-400 flex-shrink-0" />
                    : <span className="w-[15px] flex-shrink-0" />
                  }
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

// ─── Main ─────────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    loadProjects();
  }, [page, projectRole]);

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
    } finally {
      setLoading(false);
    }
  };

  // Локальный поиск
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
        <Loader2 className="w-8 h-8 animate-spin text-[var(--text-primary)]/30" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
            {isCustomer ? 'Мои проекты' : 'Проекты'}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 text-base">
            {isCustomer ? 'Проекты, в которых вы участвуете' : 'Управление проектами'}
            {totalItems > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--hover-1)] text-[var(--text-secondary)] text-sm">
                {totalItems}
              </span>
            )}
          </p>
        </div>
        {canCreateProject && (
          <Link to="/projects/new" className="btn-primary flex items-center gap-2 py-4 px-8 text-base font-semibold">
            <Plus className="w-5 h-5" />
            Создать проект
          </Link>
        )}
      </div>

      {/* ── Поиск + фильтр роли ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Поиск */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-primary)]/30 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или ключу..."
            className="w-full pl-12 pr-10 py-3 bg-[var(--bg-card)] border border-[var(--border-color)]
                       rounded-xl text-[var(--text-primary)] text-base placeholder-[var(--text-primary)]/30
                       focus:outline-none focus:border-red-500/40 focus:ring-2 focus:ring-red-500/10
                       transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-md
                         text-[var(--text-primary)]/30 hover:text-[var(--text-primary)]/60 hover:bg-[var(--hover-1)] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Фильтр по роли — только для customer */}
        {isCustomer && (
          <RoleDropdown value={projectRole} onChange={v => { setProjectRole(v); setPage(1); }} />
        )}
      </div>

      {/* Активные фильтры-теги */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[var(--text-primary)]/40">Активно:</span>
          {search && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm bg-[var(--hover-1)] text-[var(--text-secondary)] border border-[var(--border-color)]">
              <Search size={12} /> «{search}»
              <X size={12} className="cursor-pointer text-[var(--text-primary)]/30 hover:text-[var(--text-primary)]/60" onClick={() => setSearch('')} />
            </span>
          )}
          {isCustomer && projectRole !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
              {ROLE_OPTIONS.find(o => o.value === projectRole)?.label}
              <X size={12} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => { setProjectRole('all'); setPage(1); }} />
            </span>
          )}
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setProjectRole('all'); setPage(1); }}
              className="text-sm text-[var(--text-primary)]/45 hover:text-[var(--text-primary)]/65 transition-colors ml-1"
            >
              Сбросить всё
            </button>
          )}
        </div>
      )}

      {/* ── Статистика ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: FolderOpen, value: totalItems, label: 'Всего проектов', color: 'text-[var(--text-secondary)]' },
          { icon: Building2, value: getActiveCount(), label: 'Активных', color: 'text-emerald-600 dark:text-emerald-400' },
          { icon: Users, value: getTotalParticipants(), label: 'Участников', color: 'text-blue-600 dark:text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center gap-4 hover:border-[var(--border-hover)] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[var(--hover-1)] flex items-center justify-center flex-shrink-0">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-[var(--text-secondary)] text-base">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Список ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-primary)]/20" />
        </div>
      )}

      {filteredProjects.length === 0 && !loading ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-16 text-center">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-[var(--text-primary)]/20" />
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Нет проектов</h3>
          <p className="text-[var(--text-secondary)] text-base">
            {search
              ? 'На текущей странице ничего не найдено'
              : isCustomer
                ? 'Вы пока не участвуете ни в одном проекте'
                : 'Создайте первый проект'}
          </p>
          {canCreateProject && !hasFilters && (
            <Link to="/projects/new" className="btn-primary inline-flex items-center gap-2 mt-6 py-3 px-6">
              <Plus className="w-5 h-5" />
              Создать проект
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => {
              const userRole = getUserRoleInProject(project);
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6
                             hover:border-red-500/30 hover:shadow-md dark:hover:shadow-red-900/10
                             transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[var(--hover-1)] flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-6 h-6 text-[var(--text-primary)]/40" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                          {project.name || 'Без названия'}
                        </h3>
                        <p className="text-sm text-[var(--text-primary)]/50 font-mono">{project.key || '—'}</p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-sm font-medium border ${project.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-[var(--hover-1)] text-[var(--text-secondary)] border-[var(--border-color)]'
                      }`}>
                      {project.status === 'active' ? 'Активен' : 'Архивирован'}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-[var(--text-secondary)] text-base mb-4 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {userRole && (
                    <div className="mb-3">
                      <span className={`text-sm px-2.5 py-1 rounded-lg border font-medium ${userRole === 'owner'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                        }`}>
                        {userRole === 'owner' ? 'Владелец' : 'Участник'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-[var(--text-primary)]/45 pt-4 border-t border-[var(--border-color)]">
                    <span>Создан: {formatDate(project.created_at)}</span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {getParticipantsCount(project)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Пагинация ────────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]
                           hover:bg-[var(--hover-1)] disabled:opacity-40 disabled:cursor-not-allowed
                           text-[var(--text-primary)] text-base transition-colors"
              >
                Назад
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-base font-medium transition-colors ${pageNum === page
                          ? 'bg-red-600 text-white'
                          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--hover-1)]'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]
                           hover:bg-[var(--hover-1)] disabled:opacity-40 disabled:cursor-not-allowed
                           text-[var(--text-primary)] text-base transition-colors"
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
