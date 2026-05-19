// pages/TicketsPage.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import type { ElementType, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, FileText, ChevronRight, ChevronLeft, Loader2,
  Clock, AlertTriangle, CheckCircle2, Calendar, XCircle, Hash,
  Building2, FolderOpen, User, X, SlidersHorizontal, ChevronDown, Check,
  Sparkles, Flame,
} from 'lucide-react';
import { ticketsApi, counterpartiesApi, projectsApi, usersApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type {
  TicketListItem, TicketStatus, TicketPriority,
  Counterparty, Project, CounterpartyCustomer, SimpleUser,
} from '../types';

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const STATUSES: { value: TicketStatus; label: string; color: string }[] = [
  { value: 'Новый', label: 'Новый', color: 'status-new' },
  { value: 'На согласовании', label: 'На согласовании', color: 'status-agreement' },
  { value: 'Открыт', label: 'Открыт', color: 'status-open' },
  { value: 'В работе', label: 'В работе', color: 'status-progress' },
  { value: 'Ожидает ответа', label: 'Ожидает ответа', color: 'status-waiting' },
  { value: 'Решён', label: 'Решён', color: 'status-resolved' },
  { value: 'Закрыт', label: 'Закрыт', color: 'status-closed' },
  { value: 'Переоткрыт', label: 'Переоткрыт', color: 'status-reopened' },
];

const PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'Низкий', label: 'Низкий', color: 'priority-low' },
  { value: 'Средний', label: 'Средний', color: 'priority-medium' },
  { value: 'Высокий', label: 'Высокий', color: 'priority-high' },
  { value: 'Критический', label: 'Критический', color: 'priority-critical' },
];

const STATUS_ICON: Record<string, ReactNode> = {
  'Новый': <Sparkles size={11} />,
  'На согласовании': <Clock size={11} />,
  'Открыт': <CheckCircle2 size={11} />,
  'В работе': <Loader2 size={11} />,
  'Ожидает ответа': <Clock size={11} />,
  'Решён': <CheckCircle2 size={11} />,
  'Закрыт': <XCircle size={11} />,
  'Переоткрыт': <AlertTriangle size={11} />,
};

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER DROPDOWN
   ═══════════════════════════════════════════════════════════════════════════ */

interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  color?: string;
}

interface FilterDropdownProps {
  label: string;
  icon?: ReactNode;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
}

function FilterDropdown({
  label,
  icon,
  options,
  value,
  onChange,
  placeholder = 'Все',
  searchable = false,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable) setTimeout(() => inputRef.current?.focus(), 50);
    if (!open) setQuery('');
  }, [open, searchable]);

  const selected = options.find(o => o.value === value);

  const filtered = query
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel?.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-base
          transition-all whitespace-nowrap cursor-pointer
          ${open
            ? 'bg-[var(--hover-2)] border-red-500/40 text-[var(--text-primary)]'
            : value
              ? 'bg-[var(--hover-2)] border-[var(--border-color)] text-[var(--text-primary)]/90'
              : 'bg-[var(--hover-1)] border-[var(--border-color)] text-[var(--text-primary)]/50 hover:border-[var(--border-color)] hover:text-[var(--text-primary)]/70'
          }
        `}
      >
        <span className="flex items-center gap-2 truncate">
          {icon && (
            <span className={value ? 'text-red-400' : 'text-[var(--text-primary)]/40'}>
              {icon}
            </span>
          )}

          {selected ? (
            <span className="flex items-center gap-2 truncate">
              {selected.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `var(--${selected.color}-text)` }}
                />
              )}
              <span className="truncate">{selected.label}</span>
            </span>
          ) : (
            <span className="truncate">{label}</span>
          )}
        </span>

        {value ? (
          <span
            role="button"
            tabIndex={0}
            onClick={e => {
              e.stopPropagation();
              onChange('');
              setOpen(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onChange('');
                setOpen(false);
              }
            }}
            className="ml-1 p-0.5 rounded-md hover:bg-[var(--hover-1)] text-[var(--text-primary)]/30 hover:text-[var(--text-primary)]/60 cursor-pointer transition-colors"
          >
            <X size={14} />
          </span>
        ) : (
          <ChevronDown
            size={16}
            className={`text-[var(--text-primary)]/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute z-[100] min-w-[220px] w-max top-full mt-2 left-0 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          {searchable && (
            <div className="p-2 border-b border-[var(--border-color)]">
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]
                             text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]
                             focus:outline-none focus:border-[var(--border-hover)]"
                />
              </div>
            </div>
          )}

          <div className="py-1.5 max-h-[300px] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
                setQuery('');
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-left text-base transition-colors
                ${!value
                  ? 'bg-red-500/10 text-[var(--text-primary)]'
                  : 'text-[var(--text-primary)]/60 hover:bg-[var(--hover-1)]'
                }
              `}
            >
              {!value ? (
                <Check size={16} className="text-red-400 flex-shrink-0" />
              ) : (
                <span className="w-4 flex-shrink-0" />
              )}
              <span>{placeholder}</span>
            </button>

            <div className="h-px bg-[var(--hover-2)] mx-3 my-1" />

            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                Ничего не найдено
              </div>
            ) : (
              filtered.map(option => {
                const isSelected = option.value === value;

                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left text-base transition-colors
                      ${isSelected
                        ? 'bg-red-500/10 text-[var(--text-primary)]'
                        : 'text-[var(--text-primary)]/70 hover:bg-[var(--hover-1)]'
                      }
                    `}
                  >
                    {isSelected ? (
                      <Check size={16} className="text-red-400 flex-shrink-0" />
                    ) : (
                      <span className="w-4 flex-shrink-0" />
                    )}

                    {option.color ? (
                      <span className={`px-2.5 py-1 rounded-lg text-sm font-medium border ${option.color}`}>
                        {option.label}
                      </span>
                    ) : (
                      <div className="min-w-0">
                        <span className="block truncate">{option.label}</span>
                        {option.sublabel && (
                          <span className="block text-xs text-[var(--text-muted)] truncate">
                            {option.sublabel}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="glass-card rounded-xl border border-[var(--border-color)] p-4 flex items-center gap-3
                 hover:border-[var(--border-hover)] hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)] leading-none mb-0.5">
          {value}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER TAG
   ═══════════════════════════════════════════════════════════════════════════ */

function FilterTag({
  label,
  icon,
  colorClass,
  onRemove,
}: {
  label: string;
  icon?: ReactNode;
  colorClass?: string;
  onRemove: () => void;
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-base border transition-all hover:opacity-80
        ${colorClass || 'bg-[var(--hover-2)] text-[var(--text-primary)]/80 border-[var(--border-color)]'}
      `}
    >
      {icon}
      <span className="truncate max-w-[180px]">{label}</span>
      <X
        size={12}
        className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
      />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TICKET ROW — PRODUCTS-LIKE LIST ROW
   ═══════════════════════════════════════════════════════════════════════════ */

function TicketRow({
  ticket,
  formatDate,
  getStatusColor,
  getPriorityColor,
  isTicketClosed,
}: {
  ticket: TicketListItem;
  formatDate: (d: string) => string;
  getStatusColor: (s: string) => string;
  getPriorityColor: (p: string) => string;
  isTicketClosed: (s: string) => boolean;
}) {
  const closed = isTicketClosed(ticket.status);
  const isCritical = ticket.priority === 'Критический';

  return (
    <Link
      to={`/tickets/${ticket.number}`}
      className="w-full flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 text-left rounded-xl
                 hover:bg-[var(--hover-1)] active:bg-[var(--hover-2)]
                 transition-colors duration-100 group"
    >
      {/* Контент — растягивается */}
      <div className="flex-1 min-w-0">
        <span
          className="text-base text-[var(--text-primary)] font-semibold block
                     group-hover:text-[var(--accent-light)] transition-colors
                     break-words hyphens-auto"
          style={{
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'normal',
            maxWidth: '100%',
          }}
        >
          {ticket.title}
        </span>

        <div className="flex items-center gap-2 mt-0.5 text-sm min-w-0 flex-wrap">
          <span className="font-mono text-[var(--text-primary)]/55 whitespace-nowrap">
            #{ticket.number}
          </span>

          <span className="text-[var(--text-primary)]/20 hidden sm:inline">•</span>

          {closed ? (
            <span className="flex items-center gap-1.5 text-[var(--text-primary)]/35 whitespace-nowrap">
              <XCircle size={12} />
              <span className="sm:hidden">Закрыта</span>
              <span className="hidden sm:inline">Закрыта</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-green-400 whitespace-nowrap">
              <span className="sm:hidden">Активна</span>
              <span className="hidden sm:inline">Активна</span>
            </span>
          )}
        </div>
      </div>

      {/* Статус — фикс ширина */}
      <div className="sm:w-[165px] flex-shrink-0">
        <span
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
            border whitespace-nowrap ${getStatusColor(ticket.status)}
          `}
        >
          {STATUS_ICON[ticket.status]}
          {ticket.status}
        </span>
      </div>

      {/* Приоритет — фикс ширина */}
      <div className="sm:w-[135px] flex-shrink-0">
        <span
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
            border whitespace-nowrap ${getPriorityColor(ticket.priority)}
          `}
        >
          {ticket.priority === 'Критический' && <Flame size={11} />}
          {ticket.priority}
        </span>
      </div>

      {/* Дата — фикс ширина */}
      <div className="sm:w-[155px] flex-shrink-0">
        <span className="text-base text-[var(--text-primary)]/50 whitespace-nowrap">
          {formatDate(ticket.created_at)}
        </span>

        {closed && ticket.closed_at && (
          <span className="block text-xs text-[var(--text-primary)]/30 mt-0.5 whitespace-nowrap">
            Закр. {formatDate(ticket.closed_at)}
          </span>
        )}
      </div>

      {/* Стрелка */}
      <ChevronRight
        size={16}
        className="hidden sm:block text-[var(--text-primary)]/25 group-hover:text-[var(--accent-light)]
                   group-hover:translate-x-0.5 transition-all flex-shrink-0"
      />
    </Link>
  );
}
/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════════════════ */

function EmptyState({
  hasFilters,
  hasSearch,
  onCreateClick,
}: {
  hasFilters: boolean;
  hasSearch: boolean;
  onCreateClick: () => void;
}) {
  return (
    <div className="glass-card rounded-2xl border border-[var(--border-color)] p-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-[var(--hover-1)] flex items-center justify-center mx-auto mb-6">
        <FileText className="w-10 h-10 text-[var(--text-primary)]/20" />
      </div>

      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
        Нет заявок
      </h3>

      <p className="text-base text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
        {hasSearch
          ? 'По вашему запросу ничего не найдено'
          : hasFilters
            ? 'Попробуйте изменить параметры фильтрации'
            : 'Создайте первую заявку, чтобы начать работу'}
      </p>

      {!hasFilters && !hasSearch && (
        <button onClick={onCreateClick} className="btn-primary py-4 px-8 text-base">
          <Plus size={18} />
          Создать заявку
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function TicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [counterpartyFilter, setCounterpartyFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [reporterFilter, setReporterFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<SimpleUser[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CounterpartyCustomer[]>([]);

  const isCustomer = user?.role === 'customer';
  const isCustomerAdmin = user?.role === 'customer_admin';
  const isSupport = user?.role === 'support_agent' || user?.role === 'support_manager';
  const isAdmin = user?.role === 'admin';

  /* ── Load filter data ───────────────────────────────────────────────── */

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    if (isAdmin || isSupport) loadAllUsers();
    else if (isCustomerAdmin && user?.counterparty_id) loadCompanyUsers();
  }, [isAdmin, isSupport, isCustomerAdmin, user?.counterparty_id]);

  const loadAllUsers = async () => {
    try {
      const r = await usersApi.getAllUsers(1, 100);
      setAllUsers(r.items);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCompanyUsers = async () => {
    if (!user?.counterparty_id) return;

    try {
      const u = await ticketsApi.getCompanyUsers(user.counterparty_id);
      setCompanyUsers(u);
    } catch (e) {
      console.error(e);
    }
  };

  const loadFilters = async () => {
    try {
      if (isAdmin || isSupport) {
        const res = await counterpartiesApi.getAll(1, 100);
        setCounterparties(res.items);
      }

      if (isCustomer || isCustomerAdmin) {
        const res = await projectsApi.getMyProjects('all', 1, 100);
        setProjects(res.items);
      } else {
        const res = await projectsApi.getAll(1, 100);
        setProjects(res.items);
      }
    } catch (e) {
      console.error(e);
    }
  };

  /* ── Load tickets ───────────────────────────────────────────────────── */

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, counterpartyFilter, projectFilter, reporterFilter]);

  useEffect(() => {
    loadTickets();
  }, [page, statusFilter, priorityFilter, counterpartyFilter, projectFilter, reporterFilter]);

  const loadTickets = async () => {
    setLoading(true);

    try {
      const filters = {
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        project_id: projectFilter || undefined,
        reporter_id: reporterFilter || undefined,
      };

      let response;

      if (isCustomer && user?.counterparty_id) {
        response = await ticketsApi.getAllWithFilters(page, 10, {
          ...filters,
          counterparty_id: user.counterparty_id,
        });
      } else if (isCustomerAdmin && user?.counterparty_id) {
        response = await ticketsApi.getAllWithFilters(page, 10, {
          ...filters,
          counterparty_id: user.counterparty_id,
        });
      } else if (isSupport || isAdmin) {
        response = await ticketsApi.getAllWithFilters(page, 10, {
          ...filters,
          counterparty_id: counterpartyFilter || undefined,
        });
      } else {
        response = await ticketsApi.getAll(page, 10);
      }

      setTickets(response.items);
      setTotalPages(response.total_pages);
      setTotalItems(response.total_items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* ── Local search ───────────────────────────────────────────────────── */

  const normalizedSearch = search.trim().toLowerCase();

  const filteredTickets = useMemo(() => {
    if (!normalizedSearch) return tickets;

    return tickets.filter(t =>
      (t.title || '').toLowerCase().includes(normalizedSearch) ||
      (t.number || '').toLowerCase().includes(normalizedSearch) ||
      (t.status || '').toLowerCase().includes(normalizedSearch) ||
      (t.priority || '').toLowerCase().includes(normalizedSearch)
    );
  }, [tickets, normalizedSearch]);

  /* ── Helpers ────────────────────────────────────────────────────────── */

  const resetFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setCounterpartyFilter('');
    setProjectFilter('');
    setReporterFilter('');
    setSearch('');
    setPage(1);
  };

  const hasServerFilters = !!(
    statusFilter ||
    priorityFilter ||
    counterpartyFilter ||
    projectFilter ||
    reporterFilter
  );

  const hasActiveFilters = !!(hasServerFilters || search);

  const activeFiltersCount = [
    statusFilter,
    priorityFilter,
    counterpartyFilter,
    projectFilter,
    reporterFilter,
  ].filter(Boolean).length;

  const getStatusColor = (s: string) =>
    STATUSES.find(x => x.value === s)?.color || 'status-closed';

  const getPriorityColor = (p: string) =>
    PRIORITIES.find(x => x.value === p)?.color || 'priority-medium';

  const formatDate = (d: string) => {
    if (!d) return '—';

    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diff === 0) {
      return `Сегодня, ${date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    if (diff === 1) {
      return `Вчера, ${date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    if (diff < 7) return `${diff} дн. назад`;

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  const isTicketClosed = (s: string) => s === 'Закрыт' || s === 'Решён';

  const getUserDisplayName = (uid: string) => {
    if (isAdmin || isSupport) {
      const u = allUsers.find(x => x.id === uid);
      return u?.full_name || u?.username || u?.email || uid;
    }

    if (isCustomerAdmin) {
      const u = companyUsers.find(x => x.id === uid);
      return u?.full_name || u?.username || u?.email || uid;
    }

    return uid;
  };

  /* ── Dropdown options ───────────────────────────────────────────────── */

  const statusOptions: DropdownOption[] = STATUSES.map(s => ({
    value: s.value,
    label: s.label,
    color: s.color,
  }));

  const priorityOptions: DropdownOption[] = PRIORITIES.map(p => ({
    value: p.value,
    label: p.label,
    color: p.color,
  }));

  const counterpartyOptions: DropdownOption[] = counterparties.map(c => ({
    value: c.id,
    label: c.name || c.legal_name || 'Без названия',
    sublabel: c.inn ? `ИНН: ${c.inn}` : undefined,
  }));

  const projectOptions: DropdownOption[] = projects.map(p => ({
    value: p.id,
    label: p.name,
  }));

  const userOptions: DropdownOption[] = (isAdmin || isSupport)
    ? allUsers.map(u => ({
        value: u.id,
        label: u.full_name || u.username || u.email,
        sublabel: u.email && u.full_name ? u.email : undefined,
      }))
    : companyUsers.map(u => ({
        value: u.id,
        label: u.full_name || u.username || u.email,
        sublabel: u.email && (u.full_name || u.username) ? u.email : undefined,
      }));

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[var(--text-primary)] text-3xl md:text-4xl font-bold tracking-tight">
            {isCustomer ? 'Мои заявки' : 'Заявки'}
          </h1>

          <p className="text-base text-[var(--text-primary)]/40 mt-1">
            Управление обращениями
            {totalItems > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--hover-1)] text-[var(--text-secondary)] text-sm">
                {totalItems}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => navigate('/tickets/new')}
          className="btn-primary py-4 px-8 text-base font-semibold"
        >
          <Plus size={18} />
          Создать заявку
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Всего"
          value={totalItems}
          icon={FileText}
          color="text-[var(--text-secondary)]"
          bg="bg-[var(--hover-1)]"
        />

        <StatCard
          label="Новых"
          value={tickets.filter(t => t.status === 'Новый').length}
          icon={Clock}
          color="text-[var(--status-new-text)]"
          bg="bg-[var(--status-new-bg)]"
        />

        <StatCard
          label="В работе"
          value={tickets.filter(t => t.status === 'В работе' || t.status === 'Открыт').length}
          icon={CheckCircle2}
          color="text-[var(--status-progress-text)]"
          bg="bg-[var(--status-progress-bg)]"
        />

        <StatCard
          label="Критических"
          value={tickets.filter(t => t.priority === 'Критический').length}
          icon={AlertTriangle}
          color="text-[var(--priority-critical-text)]"
          bg="bg-[var(--priority-critical-bg)]"
        />
      </div>

      {/* ── Search + filters button ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-primary)]/30 pointer-events-none"
          />

          <input
            type="text"
            placeholder="Поиск по теме, номеру..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 glass-card border border-[var(--border-color)]
                       rounded-xl text-[var(--text-primary)] text-base placeholder-[var(--text-muted)]
                       focus:outline-none focus:border-red-500/40 focus:ring-2 focus:ring-red-500/10
                       transition-all"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-md
                         text-[var(--text-primary)]/30 hover:text-[var(--text-primary)]/60
                         hover:bg-[var(--hover-2)] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-base
            transition-all whitespace-nowrap cursor-pointer
            ${showFilters || activeFiltersCount > 0
              ? 'bg-red-500/10 border-red-500/40 text-[var(--text-primary)]'
              : 'bg-[var(--hover-1)] border-[var(--border-color)] text-[var(--text-primary)]/50 hover:border-[var(--border-color)] hover:text-[var(--text-primary)]/70'
            }
          `}
        >
          <SlidersHorizontal
            size={16}
            className={showFilters || activeFiltersCount > 0 ? 'text-red-400' : 'text-[var(--text-primary)]/40'}
          />
          <span>Фильтры</span>

          {activeFiltersCount > 0 ? (
            <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          ) : (
            <ChevronDown
              size={16}
              className={`text-[var(--text-primary)]/30 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
            />
          )}
        </button>
      </div>

      {/* ── Filters panel ──────────────────────────────────────────────── */}
      {showFilters && (
        <div className="glass-card rounded-xl border border-[var(--border-color)] p-3.5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)]/30 uppercase tracking-widest">
              Фильтрация
            </span>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <X size={10} />
                Сбросить
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <FilterDropdown
              label="Статус"
              options={statusOptions}
              value={statusFilter}
              onChange={v => {
                setStatusFilter(v as TicketStatus | '');
                setPage(1);
              }}
              placeholder="Все статусы"
            />

            <FilterDropdown
              label="Приоритет"
              options={priorityOptions}
              value={priorityFilter}
              onChange={v => {
                setPriorityFilter(v as TicketPriority | '');
                setPage(1);
              }}
              placeholder="Все приоритеты"
            />

            {(isAdmin || isSupport) && (
              <FilterDropdown
                label="Контрагент"
                icon={<Building2 size={16} />}
                options={counterpartyOptions}
                value={counterpartyFilter}
                onChange={v => {
                  setCounterpartyFilter(v);
                  setPage(1);
                }}
                placeholder="Все контрагенты"
                searchable
              />
            )}

            <FilterDropdown
              label="Проект"
              icon={<FolderOpen size={16} />}
              options={projectOptions}
              value={projectFilter}
              onChange={v => {
                setProjectFilter(v);
                setPage(1);
              }}
              placeholder="Все проекты"
              searchable
            />

            {(isAdmin || isSupport || isCustomerAdmin) && (
              <FilterDropdown
                label="Инициатор"
                icon={<User size={16} />}
                options={userOptions}
                value={reporterFilter}
                onChange={v => {
                  setReporterFilter(v);
                  setPage(1);
                }}
                placeholder="Все инициаторы"
                searchable
              />
            )}
          </div>
        </div>
      )}

      {/* ── Active filters ─────────────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-base text-[var(--text-primary)]/40 flex items-center gap-1.5">
            <SlidersHorizontal size={14} />
            Фильтры:
          </span>

          {search && (
            <FilterTag
              label={`«${search}»`}
              icon={<Search size={12} />}
              onRemove={() => setSearch('')}
            />
          )}

          {statusFilter && (
            <FilterTag
              label={statusFilter}
              colorClass={`${getStatusColor(statusFilter)} border`}
              onRemove={() => {
                setStatusFilter('');
                setPage(1);
              }}
            />
          )}

          {priorityFilter && (
            <FilterTag
              label={priorityFilter}
              colorClass={`${getPriorityColor(priorityFilter)} border`}
              onRemove={() => {
                setPriorityFilter('');
                setPage(1);
              }}
            />
          )}

          {counterpartyFilter && (isAdmin || isSupport) && (
            <FilterTag
              label={counterparties.find(c => c.id === counterpartyFilter)?.name || ''}
              icon={<Building2 size={12} />}
              colorClass="bg-purple-500/15 text-purple-400 border border-purple-500/20"
              onRemove={() => {
                setCounterpartyFilter('');
                setPage(1);
              }}
            />
          )}

          {projectFilter && (
            <FilterTag
              label={projects.find(p => p.id === projectFilter)?.name || ''}
              icon={<FolderOpen size={12} />}
              colorClass="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              onRemove={() => {
                setProjectFilter('');
                setPage(1);
              }}
            />
          )}

          {reporterFilter && (
            <FilterTag
              label={getUserDisplayName(reporterFilter)}
              icon={<User size={12} />}
              colorClass="bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
              onRemove={() => {
                setReporterFilter('');
                setPage(1);
              }}
            />
          )}

          <button
            onClick={resetFilters}
            className="text-base text-red-400/60 hover:text-red-400 transition-colors ml-1"
          >
            Сбросить
          </button>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────── */}
      {filteredTickets.length === 0 ? (
        <EmptyState
          hasFilters={hasServerFilters}
          hasSearch={!!search}
          onCreateClick={() => navigate('/tickets/new')}
        />
      ) : (
        <>
          {loading && tickets.length > 0 && (
            <div className="flex justify-center py-3">
              <Loader2 className="w-5 h-5 text-red-500/50 animate-spin" />
            </div>
          )}

          {/* ── Desktop products-like list header ──────────────────────── */}
          <div
            className="hidden lg:flex items-center gap-4 px-5 py-2.5 text-xs uppercase
                       tracking-wider text-[var(--text-primary)]/30 border-b border-[var(--border-color)] font-semibold"
          >
            <div className="w-10" />

            <div className="flex-1">
              Заявка
            </div>

            <div className="w-[165px]">
              Статус
            </div>

            <div className="w-[135px]">
              Приоритет
            </div>

            <div className="w-[155px]">
              <span className="flex items-center gap-1.5">
                <Calendar size={11} />
                Создана
              </span>
            </div>

            <div className="w-4" />
          </div>

          {/* ── Desktop products-like list ─────────────────────────────── */}
          <div className="hidden lg:block divide-y divide-[var(--border-color)]">
            {filteredTickets.map(ticket => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                formatDate={formatDate}
                getStatusColor={getStatusColor}
                getPriorityColor={getPriorityColor}
                isTicketClosed={isTicketClosed}
              />
            ))}
          </div>

          {/* ── Mobile Cards ───────────────────────────────────────────── */}
          <div className="lg:hidden space-y-2">
            {filteredTickets.map(ticket => {
              const closed = isTicketClosed(ticket.status);

              return (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.number}`}
                  className="glass-card rounded-xl border border-[var(--border-color)] p-4 block
                             hover:bg-[var(--hover-1)] hover:border-[var(--border-hover)]
                             transition-all group"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="text-xs font-mono text-[var(--accent-light)] bg-[var(--accent-soft)]/50
                                   px-1.5 py-0.5 rounded-md border border-[var(--accent)]/10 whitespace-nowrap"
                      >
                        #{ticket.number}
                      </span>

                      {!closed ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Активна
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                          <XCircle size={10} />
                          Закрыта
                        </span>
                      )}
                    </div>

                    <ChevronRight
                      size={14}
                      className="text-[var(--text-muted)] group-hover:text-[var(--accent-light)]
                                 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                    />
                  </div>

                  <h3
                    className="text-[15px] font-semibold text-[var(--text-primary)] mb-3 leading-snug
                               group-hover:text-[var(--accent-light)] transition-colors line-clamp-2"
                  >
                    {ticket.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border ${getStatusColor(ticket.status)}`}
                    >
                      {STATUS_ICON[ticket.status]}
                      {ticket.status}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border ${getPriorityColor(ticket.priority)}`}
                    >
                      {ticket.priority === 'Критический' && <Flame size={10} />}
                      {ticket.priority}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Calendar size={11} />
                    {formatDate(ticket.created_at)}

                    {closed && ticket.closed_at && (
                      <>
                        <span className="mx-1 text-[var(--text-muted)]/40">•</span>
                        <XCircle size={11} />
                        {formatDate(ticket.closed_at)}
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Pagination ─────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card border border-[var(--border-color)]
                           hover:bg-[var(--hover-2)] disabled:opacity-40 disabled:cursor-not-allowed
                           text-[var(--text-primary)] text-base transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
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
                      className={`
                        w-10 h-10 rounded-xl text-base font-medium transition-colors
                        ${pageNum === page
                          ? 'bg-red-700 text-white'
                          : 'glass-card text-[var(--text-primary)]/60 border border-[var(--border-color)] hover:bg-[var(--hover-2)]'
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card border border-[var(--border-color)]
                           hover:bg-[var(--hover-2)] disabled:opacity-40 disabled:cursor-not-allowed
                           text-[var(--text-primary)] text-base transition-colors"
              >
                Вперёд
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}