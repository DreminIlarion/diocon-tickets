
// ProjectStagesPage.tsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, CheckCircle2, PlayCircle, AlertTriangle, X,
  LayoutGrid, GanttChart, Map as MapIcon, BarChart3, Info, Target,
  ArrowUpDown, ArrowUp, ArrowDown, Search, Filter,
  Table as TableIcon, Milestone, Flag, PauseCircle, SkipForward,
  PenSquare, Save, ChevronRight, Plus, Trash2, ArrowLeft, Eye,
  User, FileText, ListChecks, Settings2,
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════════
   ТИПЫ
   ════════════════════════════════════════════════════════════════ */

export type ProjectStageStatus = 'planned' | 'active' | 'completed' | 'on_hold' | 'skipped';

export interface ProjectStageResponse {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  name: string;
  order: number;
  status: ProjectStageStatus;
  planned_start: string | null;
  planned_end: string | null;
  started_at: string | null;
  completed_at: string | null;
  responsible_id: string | null;
  description: string | null;
  completion_criteria: string[];
  is_overdue: boolean;
  planned_duration_days: number | null;
}

export interface StageResponsible {
  id: string;
  full_name: string;
  role?: string;
  email?: string;
}

export interface StageUpsertPayload {
  name: string;
  order: number;
  status: ProjectStageStatus;
  planned_start: string | null;
  planned_end: string | null;
  responsible_id: string | null;
  description: string | null;
  completion_criteria: string[];
  planned_duration_days: number | null;
}

export type EffectiveStatus = ProjectStageStatus | 'overdue';

type ViewType = 'table' | 'overview' | 'roadmap' | 'timeline' | 'board' | 'analytics';
type TimelineScale = 'days' | 'weeks' | 'months';
type SortKey = 'order' | 'name' | 'status' | 'responsible' | 'dates' | 'duration';
type SortDir = 'asc' | 'desc';
// Навигация внутри секции
type SectionScreen =
  | { type: 'list' }
  | { type: 'detail'; stageId: string; editing: boolean }
  | { type: 'create' };

type StageForm = {
  name: string;
  order: string;
  status: ProjectStageStatus;
  responsible_id: string;
  planned_start: string;
  planned_end: string;
  planned_duration_days: string;
  description: string;
  completion_criteria: string;
};

/* ════════════════════════════════════════════════════════════════
   МОКИ
   ════════════════════════════════════════════════════════════════ */

const MOCK_STAGES: ProjectStageResponse[] = [
  { id:'stg-001',created_at:'2026-04-20T10:00:00Z',updated_at:'2026-05-10T18:00:00Z',project_id:'prj-001',name:'Аналитика',order:1,status:'completed',planned_start:'2026-05-01',planned_end:'2026-05-10',started_at:'2026-05-01T09:00:00Z',completed_at:'2026-05-10T17:30:00Z',responsible_id:'u2',description:'Сбор требований, интервью со стейкхолдерами, анализ конкурентов и формирование ТЗ.',completion_criteria:['Утверждено ТЗ','Подписан scope проекта','Зафиксированы KPI'],is_overdue:false,planned_duration_days:10 },
  { id:'stg-002',created_at:'2026-04-20T10:00:00Z',updated_at:'2026-05-20T18:00:00Z',project_id:'prj-001',name:'Проектирование',order:2,status:'completed',planned_start:'2026-05-11',planned_end:'2026-05-20',started_at:'2026-05-11T09:00:00Z',completed_at:'2026-05-20T17:00:00Z',responsible_id:'u3',description:'Создание UX/UI дизайна, проектирование архитектуры решения и API.',completion_criteria:['Утверждены макеты','Согласована архитектура','Готов design-system'],is_overdue:false,planned_duration_days:10 },
  { id:'stg-003',created_at:'2026-04-20T10:00:00Z',updated_at:'2026-06-08T12:00:00Z',project_id:'prj-001',name:'Разработка',order:3,status:'active',planned_start:'2026-05-21',planned_end:'2026-06-30',started_at:'2026-05-21T09:00:00Z',completed_at:null,responsible_id:'u4',description:'Реализация фронтенда и бэкенда, интеграция с внешними сервисами и CRM.',completion_criteria:['Реализован весь функционал','Покрытие тестами > 70%','Документация API'],is_overdue:false,planned_duration_days:40 },
  { id:'stg-004',created_at:'2026-04-20T10:00:00Z',updated_at:'2026-06-08T12:00:00Z',project_id:'prj-001',name:'Интеграции',order:4,status:'on_hold',planned_start:'2026-06-01',planned_end:'2026-06-10',started_at:'2026-06-01T09:00:00Z',completed_at:null,responsible_id:'u4',description:'Интеграция с внешними API и SSO.',completion_criteria:['Настроены интеграции','Проверены fallback-сценарии'],is_overdue:true,planned_duration_days:5 },
  { id:'stg-005',created_at:'2026-04-20T10:00:00Z',updated_at:'2026-04-20T10:00:00Z',project_id:'prj-001',name:'Тестирование',order:5,status:'planned',planned_start:'2026-06-16',planned_end:'2026-06-25',started_at:null,completed_at:null,responsible_id:'u5',description:'Функциональное, нагрузочное и регрессионное тестирование.',completion_criteria:['Закрыты все P0/P1 баги','Пройдены нагрузочные тесты','Подписан акт UAT'],is_overdue:false,planned_duration_days:10 },
  { id:'stg-006',created_at:'2026-04-20T10:00:00Z',updated_at:'2026-04-20T10:00:00Z',project_id:'prj-001',name:'Релиз',order:6,status:'planned',planned_start:'2026-06-26',planned_end:'2026-06-30',started_at:null,completed_at:null,responsible_id:'u6',description:'Развёртывание в production, настройка мониторинга и передача в поддержку.',completion_criteria:['Сайт доступен в production','Настроен мониторинг','Передан в поддержку'],is_overdue:false,planned_duration_days:5 },
];

const MOCK_RESPONSIBLES: Record<string, StageResponsible> = {
  u2:{ id:'u2', full_name:'Мария Сидорова', role:'Бизнес-аналитик', email:'sidorova@company.ru' },
  u3:{ id:'u3', full_name:'Анна Морозова', role:'UX-дизайнер', email:'morozova@company.ru' },
  u4:{ id:'u4', full_name:'Иван Кузнецов', role:'Тимлид', email:'kuznetsov@company.ru' },
  u5:{ id:'u5', full_name:'Ольга Новикова', role:'QA Lead', email:'novikova@company.ru' },
  u6:{ id:'u6', full_name:'Дмитрий Орлов', role:'DevOps-инженер', email:'orlov@company.ru' },
};

const TODAY = new Date('2026-06-16');

/* ════════════════════════════════════════════════════════════════
   СТАТУСЫ
   ════════════════════════════════════════════════════════════════ */

const STATUS_CFG: Record<EffectiveStatus, {
  label: string; dot: string; chip: string; bar: string; ring: string;
  border: string; icon: any; text: string;
}> = {
  planned:   { label:'Запланирован', dot:'bg-slate-400',    chip:'bg-slate-500/10 text-slate-300 border-slate-400/20',        bar:'bg-slate-500',    ring:'ring-slate-400/25',    border:'border-slate-400/25',    icon:Clock,        text:'text-slate-300' },
  active:    { label:'В работе',     dot:'bg-blue-500',     chip:'bg-blue-500/12 text-blue-300 border-blue-400/25',           bar:'bg-blue-500',     ring:'ring-blue-500/25',     border:'border-blue-400/25',     icon:PlayCircle,   text:'text-blue-300' },
  completed: { label:'Завершён',     dot:'bg-emerald-500',  chip:'bg-emerald-500/12 text-emerald-300 border-emerald-400/25',  bar:'bg-emerald-500',  ring:'ring-emerald-500/25',  border:'border-emerald-400/25',  icon:CheckCircle2, text:'text-emerald-300' },
  on_hold:   { label:'На паузе',     dot:'bg-amber-500',    chip:'bg-amber-500/12 text-amber-300 border-amber-400/25',       bar:'bg-amber-500',    ring:'ring-amber-500/25',    border:'border-amber-400/25',    icon:PauseCircle,  text:'text-amber-300' },
  skipped:   { label:'Пропущен',     dot:'bg-neutral-500',  chip:'bg-neutral-500/10 text-neutral-400 border-neutral-400/20',  bar:'bg-neutral-500',  ring:'ring-neutral-400/20',  border:'border-neutral-400/20',  icon:SkipForward,  text:'text-neutral-400' },
  overdue:   { label:'Просрочен',    dot:'bg-[var(--accent)]', chip:'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/25', bar:'bg-[var(--accent)]', ring:'ring-[var(--accent)]/25', border:'border-[var(--accent)]/25', icon:AlertTriangle, text:'text-[var(--accent)]' },
};

/* ════════════════════════════════════════════════════════════════
   УТИЛИТЫ
   ════════════════════════════════════════════════════════════════ */

const parseDate = (s: string | null): Date | null => s ? new Date(s + (s.length===10?'T00:00:00':'')) : null;
const fmtDate = (s: string | null) => { if(!s) return '—'; const d=parseDate(s); return d ? d.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}) : '—'; };
const fmtShort = (s: string | null) => { if(!s) return '—'; const d=parseDate(s); return d ? d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'}) : '—'; };
const fmtDT = (s: string | null) => { if(!s) return '—'; return new Date(s).toLocaleString('ru-RU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
const daysB = (a: Date, b: Date) => Math.round((b.getTime()-a.getTime())/86400000);
const effStatus = (s: ProjectStageResponse): EffectiveStatus => s.is_overdue && s.status!=='completed' && s.status!=='skipped' ? 'overdue' : s.status;
const sortOrd = (l: ProjectStageResponse[]) => [...l].sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,'ru'));
const normOrd = (l: ProjectStageResponse[]) => sortOrd(l).map((s,i)=>({...s,order:i+1}));

function getInitials(name?: string) { return !name ? '?' : name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }

function resolveDates(prev: ProjectStageResponse, status: ProjectStageStatus) {
  const now = new Date().toISOString();
  let sa = prev.started_at, ca = prev.completed_at;
  if(status==='planned'){sa=null;ca=null;}
  if(status==='active'){sa=sa??now;ca=null;}
  if(status==='completed'){sa=sa??now;ca=ca??now;}
  if(status==='on_hold'){ca=null;}
  if(status==='skipped'){ca=null;}
  return {started_at:sa,completed_at:ca};
}

const emptyForm = (order: number): StageForm => ({name:'',order:String(order),status:'planned',responsible_id:'',planned_start:'',planned_end:'',planned_duration_days:'',description:'',completion_criteria:''});
const stageToForm = (s: ProjectStageResponse): StageForm => ({name:s.name,order:String(s.order),status:s.status,responsible_id:s.responsible_id??'',planned_start:s.planned_start??'',planned_end:s.planned_end??'',planned_duration_days:s.planned_duration_days!=null?String(s.planned_duration_days):'',description:s.description??'',completion_criteria:s.completion_criteria.join('\n')});
const formToPayload = (f: StageForm): StageUpsertPayload => ({name:f.name.trim(),order:Math.max(1,Number(f.order)||1),status:f.status,planned_start:f.planned_start||null,planned_end:f.planned_end||null,responsible_id:f.responsible_id||null,description:f.description.trim()||null,completion_criteria:f.completion_criteria.split('\n').map(v=>v.trim()).filter(Boolean),planned_duration_days:f.planned_duration_days?Math.max(1,Number(f.planned_duration_days)):null});

function applyPayload(stage: ProjectStageResponse, p: StageUpsertPayload): ProjectStageResponse {
  const d = resolveDates(stage, p.status);
  return {...stage,...p,...d,updated_at:new Date().toISOString()};
}
function localCreate(pid: string, p: StageUpsertPayload): ProjectStageResponse {
  const now = new Date().toISOString();
  const d = resolveDates({started_at:null,completed_at:null} as any, p.status);
  return {id:`tmp-${Date.now()}`,created_at:now,updated_at:now,project_id:pid,...p,...d,is_overdue:false};
}

/* ════════════════════════════════════════════════════════════════
   МАЛЕНЬКИЕ КОМПОНЕНТЫ
   ════════════════════════════════════════════════════════════════ */

function Ava({name,size='md'}:{name?:string;size?:'sm'|'md'}) {
  const c={sm:'w-9 h-9 text-[13px]',md:'w-11 h-11 text-[14px]'}[size];
  return <div className={`${c} rounded-full bg-[var(--accent)] flex items-center justify-center font-semibold text-white flex-shrink-0 select-none`}>{getInitials(name)}</div>;
}

function Badge({order}:{order:number}) {
  return <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--text-primary)] font-semibold px-2.5 py-1 text-[13px]"><Milestone className="w-3.5 h-3.5"/>#{String(order).padStart(2,'0')}</span>;
}

function Chip({status}:{status:EffectiveStatus}) {
  const c=STATUS_CFG[status]; const I=c.icon;
  return <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-medium ${c.chip}`}><I className="w-3.5 h-3.5"/>{c.label}</span>;
}

const Skeleton=({className=''}:{className?:string})=><div className={`bg-[var(--hover-2)] animate-pulse rounded-2xl ${className}`}/>;
function PageSkeleton(){return <div className="space-y-6"><Skeleton className="h-12 w-80"/><Skeleton className="h-[600px] w-full"/></div>;}

interface Toast{id:number;title:string;type?:'success'|'error'|'info'}
function Toasts({toasts,onClose}:{toasts:Toast[];onClose:(id:number)=>void}){
  return createPortal(<div className="fixed top-6 right-6 z-[200] flex flex-col gap-3"><AnimatePresence>{toasts.map(t=>(
    <motion.div key={t.id} initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:30}}
      className={`min-w-[320px] rounded-2xl border bg-[var(--bg-card)] px-5 py-4 flex items-center gap-3 ${t.type==='error'?'border-[var(--accent)]/25':t.type==='success'?'border-emerald-400/25':'border-[var(--border-color)]'}`}
      style={{boxShadow:'var(--shadow-lg)'}}>
      {t.type==='success'&&<CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0"/>}
      {t.type==='error'&&<AlertTriangle className="w-5 h-5 text-[var(--accent)] flex-shrink-0"/>}
      {(!t.type||t.type==='info')&&<Info className="w-5 h-5 text-blue-400 flex-shrink-0"/>}
      <span className="text-[14px] text-[var(--text-primary)] flex-1">{t.title}</span>
      <button onClick={()=>onClose(t.id)} className="text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]"><X className="w-4 h-4"/></button>
    </motion.div>
  ))}</AnimatePresence></div>,document.body);
}

/* ════════════════════════════════════════════════════════════════
   VIEW TABS
   ════════════════════════════════════════════════════════════════ */

const VIEWS:{id:ViewType;label:string;icon:any}[]=[
  {id:'table',label:'Таблица',icon:TableIcon},
  {id:'overview',label:'Обзор',icon:Info},
  {id:'roadmap',label:'Карта',icon:MapIcon},
  {id:'timeline',label:'Хронология',icon:GanttChart},
  {id:'board',label:'Доска',icon:LayoutGrid},
  {id:'analytics',label:'Аналитика',icon:BarChart3},
];

function ViewTabs({view,onChange}:{view:ViewType;onChange:(v:ViewType)=>void}){
  return(
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-2)] p-1.5 inline-flex gap-1 overflow-x-auto">
      {VIEWS.map(t=>{const a=view===t.id;return(
        <button key={t.id} onClick={()=>onChange(t.id)}
          className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium whitespace-nowrap transition-colors ${a?'text-white':'text-[var(--text-primary)]/50 hover:text-[var(--text-primary)]/80'}`}>
          {a&&<motion.div layoutId="stab" className="absolute inset-0 rounded-xl bg-[var(--accent)]" transition={{type:'spring',stiffness:350,damping:30}}/>}
          <t.icon className="w-4 h-4 relative"/><span className="relative">{t.label}</span>
        </button>
      );})}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TABLE
   ════════════════════════════════════════════════════════════════ */

function TableView({stages,responsibles,onSelect,onCreate}:{stages:ProjectStageResponse[];responsibles:Record<string,StageResponsible>;onSelect:(s:ProjectStageResponse)=>void;onCreate:()=>void}){
  const [sortKey,setSortKey]=useState<SortKey>('order');
  const [sortDir,setSortDir]=useState<SortDir>('asc');
  const [search,setSearch]=useState('');
  const [statusF,setStatusF]=useState<EffectiveStatus|'all'>('all');

  const filtered=useMemo(()=>{
    let l=[...stages];
    const q=search.toLowerCase().replace('#','').trim();
    if(q) l=l.filter(s=>{const rn=s.responsible_id?responsibles[s.responsible_id]?.full_name??'':'';return s.name.toLowerCase().includes(q)||rn.toLowerCase().includes(q)||String(s.order).includes(q)||(s.description??'').toLowerCase().includes(q);});
    if(statusF!=='all') l=l.filter(s=>effStatus(s)===statusF);
    l.sort((a,b)=>{let av:string|number='',bv:string|number='';switch(sortKey){case'order':av=a.order;bv=b.order;break;case'name':av=a.name;bv=b.name;break;case'status':av=effStatus(a);bv=effStatus(b);break;case'responsible':av=a.responsible_id?responsibles[a.responsible_id]?.full_name??'':'';bv=b.responsible_id?responsibles[b.responsible_id]?.full_name??'':'';break;case'dates':av=a.planned_start??'';bv=b.planned_start??'';break;case'duration':av=a.planned_duration_days??0;bv=b.planned_duration_days??0;break;}if(av<bv)return sortDir==='asc'?-1:1;if(av>bv)return sortDir==='asc'?1:-1;return 0;});
    return l;
  },[stages,responsibles,search,statusF,sortKey,sortDir]);

  const toggle=(k:SortKey)=>{if(sortKey===k)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortKey(k);setSortDir('asc');}};
  const SI=({k}:{k:SortKey})=>sortKey!==k?<ArrowUpDown className="w-4 h-4 text-[var(--text-primary)]/20"/>:sortDir==='asc'?<ArrowUp className="w-4 h-4"/>:<ArrowDown className="w-4 h-4"/>;

  if(!stages.length) return(
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <Milestone className="w-14 h-14 mx-auto text-[var(--text-primary)]/15 mb-4"/>
      <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-2">Этапов пока нет</h3>
      <p className="text-[15px] text-[var(--text-primary)]/50 mb-6 max-w-md mx-auto">Создайте первый этап проекта, чтобы начать управление.</p>
      <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3 text-[14px] font-semibold text-white"><Plus className="w-4 h-4"/>Создать этап</button>
    </div>
  );

  return(
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
      <div className="border-b border-[var(--border-color)] bg-[var(--hover-1)] px-5 py-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-primary)]/30"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по номеру, названию, описанию, ответственному…"
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--hover-2)] pl-11 pr-4 py-3 text-[14px] text-[var(--text-primary)] placeholder-white/20 outline-none focus:border-[var(--accent)]/30 focus:ring-2 focus:ring-[var(--accent-ring)] transition-all"/>
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-primary)]/30 pointer-events-none"/>
          <select value={statusF} onChange={e=>setStatusF(e.target.value as any)}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-2)] pl-11 pr-10 py-3 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/30 transition-all">
            <option value="all">Все статусы</option>
            <option value="planned">Запланирован</option><option value="active">В работе</option>
            <option value="on_hold">На паузе</option><option value="completed">Завершён</option>
            <option value="skipped">Пропущен</option><option value="overdue">Просрочен</option>
          </select>
        </div>
        <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-white"><Plus className="w-4 h-4"/>Создать</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--hover-1)]">
              {([['order','Этап'],['name','Название'],['status','Статус'],['dates','Сроки'],['responsible','Ответственный'],['duration','Дни']] as [SortKey,string][]).map(([k,l])=>(
                <th key={k} className="px-5 py-4 text-left">
                  <button onClick={()=>toggle(k)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]/45 hover:text-[var(--text-primary)] transition-colors">{l}<SI k={k}/></button>
                </th>
              ))}
              <th className="w-12"/>
            </tr>
          </thead>
          <tbody>
            {!filtered.length?(
              <tr><td colSpan={7} className="px-6 py-16 text-center"><Search className="w-10 h-10 mx-auto text-[var(--text-primary)]/15 mb-3"/><p className="text-[15px] text-[var(--text-primary)]/40">Ничего не найдено</p></td></tr>
            ):filtered.map(stage=>{
              const eff=effStatus(stage);const meta=STATUS_CFG[stage.status];const resp=stage.responsible_id?responsibles[stage.responsible_id]:null;
              return(
                <tr key={stage.id} onClick={()=>onSelect(stage)} className={`group cursor-pointer border-b border-[var(--border-color)] hover:bg-[var(--hover-1)] transition-colors ${eff==='overdue'?'bg-[var(--accent-soft)]/20':''}`}>
                  <td className="px-5 py-5"><Badge order={stage.order}/></td>
                  <td className="px-5 py-5 min-w-[260px]">
                    <p className="text-[15px] font-semibold text-[var(--text-primary)]">{stage.name}</p>
                    <p className="mt-1 text-[14px] text-[var(--text-primary)]/50 line-clamp-1">{stage.description||'Без описания'}</p>
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex flex-wrap gap-2"><Chip status={stage.status}/>{eff==='overdue'&&<Chip status="overdue"/>}</div>
                  </td>
                  <td className="px-5 py-5 whitespace-nowrap text-[14px] text-[var(--text-primary)]/65">{fmtShort(stage.planned_start)} — {fmtShort(stage.planned_end)}</td>
                  <td className="px-5 py-5">{resp?<div className="inline-flex items-center gap-2.5"><Ava name={resp.full_name} size="sm"/><div className="min-w-0"><p className="text-[14px] text-[var(--text-primary)]/80 truncate">{resp.full_name}</p>{resp.role&&<p className="text-[13px] text-[var(--text-primary)]/45 truncate">{resp.role}</p>}</div></div>:<span className="text-[14px] text-[var(--text-primary)]/30">—</span>}</td>
                  <td className="px-5 py-5 text-[14px] font-medium text-[var(--text-primary)]/65">{stage.planned_duration_days!=null?`${stage.planned_duration_days} дн.`:'—'}</td>
                  <td className="px-4 py-5"><ChevronRight className="w-5 h-5 text-[var(--text-primary)]/20 group-hover:text-[var(--text-primary)]/50 transition-colors"/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   OVERVIEW / ROADMAP / TIMELINE / BOARD / ANALYTICS (компактные)
   ════════════════════════════════════════════════════════════════ */

function OverviewView({stages,responsibles,onSelect}:{stages:ProjectStageResponse[];responsibles:Record<string,StageResponsible>;onSelect:(s:ProjectStageResponse)=>void}){
  const cur=stages.find(s=>s.status==='active');const total=stages.length;const done=stages.filter(s=>s.status==='completed').length;const pct=total?Math.round(done/total*100):0;
  return(<motion.div initial={{opacity:0}} animate={{opacity:1}} className="grid lg:grid-cols-3 gap-5">
    <div className="lg:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
      <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Текущий этап</h3>
      {cur?<button onClick={()=>onSelect(cur)} className="w-full text-left rounded-2xl border border-[var(--border-color)] bg-[var(--hover-2)] p-5 hover:bg-[var(--hover-1)] transition-colors">
        <div className="flex items-center gap-3 mb-3"><Badge order={cur.order}/><Chip status={cur.status}/></div>
        <h2 className="text-[22px] font-bold text-[var(--text-primary)]">{cur.name}</h2>
        <p className="mt-2 text-[14px] text-[var(--text-primary)]/55 line-clamp-2">{cur.description||'Без описания'}</p>
      </button>:<p className="text-[15px] text-[var(--text-primary)]/45">Нет активных этапов</p>}
    </div>
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
      <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-5">Прогресс</h3>
      <div className="flex justify-center mb-5"><div className="relative w-32 h-32"><svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full"><circle cx="50" cy="50" r="42" stroke="var(--hover-3)" strokeWidth="10" fill="none"/><motion.circle cx="50" cy="50" r="42" stroke="var(--accent)" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={`${2*Math.PI*42}`} initial={{strokeDashoffset:2*Math.PI*42}} animate={{strokeDashoffset:2*Math.PI*42*(1-pct/100)}} transition={{duration:1}}/></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[28px] font-bold text-[var(--text-primary)]">{pct}%</span></div></div></div>
      <div className="space-y-2">{[{l:'Завершено',v:done,c:'bg-emerald-500'},{l:'В работе',v:stages.filter(s=>s.status==='active').length,c:'bg-blue-500'},{l:'Запланировано',v:stages.filter(s=>s.status==='planned').length,c:'bg-slate-400'},{l:'Просрочено',v:stages.filter(s=>s.is_overdue&&s.status!=='completed'&&s.status!=='skipped').length,c:'bg-[var(--accent)]'}].filter(r=>r.v>0).map(r=><div key={r.l} className="flex items-center justify-between text-[14px]"><span className="inline-flex items-center gap-2 text-[var(--text-primary)]/65"><span className={`w-2.5 h-2.5 rounded-full ${r.c}`}/>{r.l}</span><span className="font-semibold text-[var(--text-primary)]">{r.v}</span></div>)}</div>
    </div>
  </motion.div>);
}

function RoadmapView({stages,onSelect}:{stages:ProjectStageResponse[];onSelect:(s:ProjectStageResponse)=>void}){
  const ord=useMemo(()=>sortOrd(stages),[stages]);const n=ord.length;if(!n)return null;
  return(<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 overflow-x-auto"><div className="min-w-[900px]">
    <div className="grid items-center" style={{gridTemplateColumns:`repeat(${n},minmax(0,1fr))`}}>{ord.map((s,i)=>{const st=effStatus(s);const m=STATUS_CFG[st];const I=m.icon;const cur=s.status==='active';return(<div key={s.id} className="relative flex items-center justify-center">
      {i<n-1&&<motion.div initial={{scaleX:0}} animate={{scaleX:1}} transition={{delay:i*0.08+0.15,duration:0.4}} className={`absolute top-1/2 left-1/2 h-1.5 rounded-full origin-left -translate-y-1/2 ${s.status==='completed'?'bg-emerald-500':'bg-[var(--border-color)]'}`} style={{width:'100%'}}/>}
      {cur&&<span className="absolute w-20 h-20 rounded-full bg-blue-500/10 animate-ping"/>}
      <motion.button onClick={()=>onSelect(s)} initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} whileHover={{scale:1.05}} className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-[16px] ${m.bar} ${cur?`ring-4 ${m.ring}`:''}`} style={{boxShadow:'var(--shadow-md)'}}>
        {String(s.order).padStart(2,'0')}<span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center"><I className={`w-3.5 h-3.5 ${m.text}`}/></span>
      </motion.button>
    </div>);})}</div>
    <div className="grid mt-6" style={{gridTemplateColumns:`repeat(${n},minmax(0,1fr))`}}>{ord.map(s=>{const m=STATUS_CFG[effStatus(s)];return(<div key={`l-${s.id}`} className="px-3 text-center">
      <button onClick={()=>onSelect(s)} className="text-[14px] font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-2">{s.name}</button>
      <p className={`mt-2 text-[13px] ${m.text}`}>{m.label}</p><p className="mt-1 text-[13px] text-[var(--text-primary)]/40 whitespace-nowrap">{fmtShort(s.planned_start)} — {fmtShort(s.planned_end)}</p>
    </div>);})}</div>
  </div></motion.div>);
}

function TimelineView({stages,onSelect}:{stages:ProjectStageResponse[];onSelect:(s:ProjectStageResponse)=>void}){
  const [sc,setSc]=useState<TimelineScale>('weeks');
  const ord=useMemo(()=>sortOrd(stages.filter(s=>s.planned_start&&s.planned_end)),[stages]);
  const{minD,maxD,totalD}=useMemo(()=>{if(!ord.length)return{minD:TODAY,maxD:TODAY,totalD:30};const ds=ord.flatMap(s=>[parseDate(s.planned_start)!,parseDate(s.planned_end)!]);const mn=new Date(Math.min(...ds.map(d=>d.getTime())));const mx=new Date(Math.max(...ds.map(d=>d.getTime())));mn.setDate(mn.getDate()-2);mx.setDate(mx.getDate()+2);return{minD:mn,maxD:mx,totalD:daysB(mn,mx)+1};},[ord]);
  const dW=sc==='days'?42:sc==='weeks'?18:8;const tW=totalD*dW;
  const ticks=useMemo(()=>{const r:{date:Date;label:string;major:boolean}[]=[];const c=new Date(minD);while(c<=maxD){if(sc==='days'){r.push({date:new Date(c),label:c.getDate().toString().padStart(2,'0'),major:c.getDate()===1});c.setDate(c.getDate()+1);}else if(sc==='weeks'){if(c.getDay()===1||!r.length)r.push({date:new Date(c),label:c.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'}),major:c.getDate()<=7});c.setDate(c.getDate()+1);}else{if(c.getDate()===1||!r.length)r.push({date:new Date(c),label:c.toLocaleDateString('ru-RU',{month:'short',year:'2-digit'}),major:true});c.setDate(c.getDate()+1);}}return r;},[minD,maxD,sc]);
  const tOff=daysB(minD,TODAY)*dW;const showT=TODAY>=minD&&TODAY<=maxD;
  if(!ord.length)return<div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center"><p className="text-[15px] text-[var(--text-primary)]/45">Нет этапов с датами</p></div>;
  return(<motion.div initial={{opacity:0}} animate={{opacity:1}} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
    <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--hover-1)] flex items-center justify-between gap-3 flex-wrap"><h3 className="text-[18px] font-bold text-[var(--text-primary)]">Хронология</h3>
      <div className="inline-flex rounded-xl border border-[var(--border-color)] bg-[var(--hover-2)] p-1">{(['days','weeks','months'] as TimelineScale[]).map(s=><button key={s} onClick={()=>setSc(s)} className={`px-3 py-2 rounded-lg text-[14px] font-medium transition-colors ${sc===s?'bg-[var(--accent)] text-white':'text-[var(--text-primary)]/50 hover:text-[var(--text-primary)]'}`}>{{days:'Дни',weeks:'Недели',months:'Месяцы'}[s]}</button>)}</div>
    </div>
    <div className="flex"><div className="w-[300px] flex-shrink-0 border-r border-[var(--border-color)]"><div className="h-12 border-b border-[var(--border-color)] px-4 flex items-center bg-[var(--hover-1)]"><span className="text-[13px] font-medium text-[var(--text-primary)]/45">Этап</span></div>
      {ord.map(s=>{const st=effStatus(s);return(<button key={s.id} onClick={()=>onSelect(s)} className="w-full h-16 px-4 border-b border-[var(--border-color)] flex items-center gap-3 hover:bg-[var(--hover-1)] transition-colors text-left"><Badge order={s.order}/><span className={`w-2 h-2 rounded-full ${STATUS_CFG[st].dot}`}/><span className="text-[14px] text-[var(--text-primary)] truncate">{s.name}</span></button>);})}</div>
      <div className="flex-1 overflow-x-auto"><div style={{width:tW,minWidth:'100%'}} className="relative">
        <div className="h-12 border-b border-[var(--border-color)] bg-[var(--hover-1)] relative">{ticks.map((t,i)=><div key={i} className="absolute top-0 bottom-0 flex items-center" style={{left:daysB(minD,t.date)*dW}}><span className={`text-[13px] px-1.5 ${t.major?'text-[var(--text-primary)] font-semibold':'text-[var(--text-primary)]/40'}`}>{t.label}</span></div>)}</div>
        <div className="relative"><div className="absolute inset-0 pointer-events-none">{ticks.map((t,i)=><div key={i} className={`absolute top-0 bottom-0 w-px ${t.major?'bg-[var(--border-color)]':'bg-[var(--border-color)]/50'}`} style={{left:daysB(minD,t.date)*dW}}/>)}</div>
          {showT&&<div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{left:tOff}}><div className="w-0.5 h-full bg-[var(--accent)]"/><span className="absolute top-0 left-1 rounded bg-[var(--accent)] px-2 py-1 text-[13px] font-semibold text-white whitespace-nowrap">Сегодня</span></div>}
          {ord.map((s,idx)=>{const st=effStatus(s);const m=STATUS_CFG[st];const sO=daysB(minD,parseDate(s.planned_start)!)*dW;const wP=(daysB(parseDate(s.planned_start)!,parseDate(s.planned_end)!)+1)*dW;return(<div key={s.id} className="h-16 border-b border-[var(--border-color)] relative"><motion.button onClick={()=>onSelect(s)} initial={{width:0,opacity:0}} animate={{width:wP,opacity:1}} transition={{delay:idx*0.05,duration:0.35}} whileHover={{scale:1.01}} className={`absolute top-1/2 -translate-y-1/2 h-9 rounded-xl flex items-center px-3 text-white text-[13px] font-medium overflow-hidden ${m.bar} ${st==='overdue'?`ring-2 ${m.ring}`:''}`} style={{left:sO,boxShadow:'var(--shadow-md)'}}>{st==='overdue'&&<AlertTriangle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0"/>}<span className="truncate">#{String(s.order).padStart(2,'0')} · {s.name}</span></motion.button></div>);})}
        </div>
      </div></div>
    </div>
  </motion.div>);
}

function BoardView({stages,responsibles,onSelect,onMoveStage}:{
  stages:ProjectStageResponse[];
  responsibles:Record<string,StageResponsible>;
  onSelect:(s:ProjectStageResponse)=>void;
  onMoveStage:(stageId:string,newStatus:ProjectStageStatus)=>void;
}){
  const cols:ProjectStageStatus[]=['planned','active','on_hold','completed','skipped'];
  const [dragId,setDragId]=useState<string|null>(null);
  const [overCol,setOverCol]=useState<ProjectStageStatus|null>(null);

  const grouped=useMemo(()=>{
    const m:Record<ProjectStageStatus,ProjectStageResponse[]>={planned:[],active:[],on_hold:[],completed:[],skipped:[]};
    sortOrd(stages).forEach(s=>m[s.status].push(s));
    return m;
  },[stages]);

  if(!stages.length) return(
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center">
      <Milestone className="w-12 h-12 mx-auto text-[var(--text-primary)]/15 mb-3"/>
      <p className="text-[15px] text-[var(--text-primary)]/45">Нет этапов для доски</p>
    </div>
  );

  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="grid gap-4 xl:grid-cols-5 md:grid-cols-2 grid-cols-1">
      {cols.map(col=>{
        const m=STATUS_CFG[col];
        const I=m.icon;
        const items=grouped[col];
        const isOver=overCol===col;

        return(
          <div key={col}
            onDragOver={e=>{e.preventDefault();setOverCol(col);}}
            onDragLeave={()=>setOverCol(null)}
            onDrop={()=>{
              if(dragId){
                const stage=stages.find(s=>s.id===dragId);
                if(stage && stage.status!==col) onMoveStage(dragId,col);
              }
              setDragId(null);setOverCol(null);
            }}
            className={`rounded-2xl border-2 bg-[var(--bg-card)] flex flex-col min-h-[400px] transition-all duration-200 ${
              isOver
                ?'border-[var(--accent)] bg-[var(--accent-soft)]/30 scale-[1.01]'
                :'border-transparent'
            }`}>

            {/* Заголовок колонки */}
            <div className="px-4 py-3.5 border-b border-[var(--border-color)] bg-[var(--hover-1)] rounded-t-2xl flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <I className={`w-4 h-4 ${m.text}`}/>
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{m.label}</h3>
              </div>
              <span className="min-w-[28px] h-7 rounded-full border border-[var(--border-color)] bg-[var(--hover-2)] px-2 text-[13px] font-semibold text-[var(--text-primary)]/50 flex items-center justify-center">
                {items.length}
              </span>
            </div>

            {/* Карточки */}
            <div className="p-3 flex-1 space-y-2.5 overflow-y-auto">
              {!items.length?(
                <div className={`h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${
                  isOver
                    ?'border-[var(--accent)]/40 bg-[var(--accent-soft)]/20 text-[var(--accent)]/60'
                    :'border-[var(--border-color)] text-[var(--text-primary)]/25'
                }`}>
                  <Milestone className="w-6 h-6 mb-1.5"/>
                  <span className="text-[13px]">{isOver?'Отпустите здесь':'Пусто'}</span>
                </div>
              ):items.map(stage=>{
                const resp=stage.responsible_id?responsibles[stage.responsible_id]:null;
                const eff=effStatus(stage);
                const isDragging=dragId===stage.id;
                const cardBorder=eff==='overdue'?STATUS_CFG.overdue.border:m.border;

                return(
                  <motion.div key={stage.id}
                    layout
                    draggable
                    onDragStart={e=>{
                      setDragId(stage.id);
                      // Убираем дефолтную прозрачную картинку
                      if(e.dataTransfer){
                        e.dataTransfer.effectAllowed='move';
                      }
                    }}
                    onDragEnd={()=>{setDragId(null);setOverCol(null);}}
                    whileHover={{y:-2}}
                    className={`rounded-2xl border bg-[var(--hover-2)] p-4 cursor-grab active:cursor-grabbing transition-all select-none ${cardBorder} ${
                      isDragging?'opacity-40 scale-95 rotate-1 ring-2 ring-[var(--accent)]/30':''
                    }`}
                    style={{boxShadow:'var(--shadow-md)'}}>

                    {/* Шапка карточки */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Badge order={stage.order}/>
                      <div className="flex items-center gap-1.5">
                        {eff==='overdue'&&<AlertTriangle className="w-4 h-4 text-[var(--accent)]"/>}
                        <button onClick={(e)=>{e.stopPropagation();onSelect(stage);}}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)]/35 hover:text-[var(--text-primary)] hover:bg-[var(--hover-1)] transition-colors"
                          title="Открыть этап">
                          <Eye className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </div>

                    {/* Название */}
                    <button onClick={()=>onSelect(stage)} className="text-left w-full">
                      <h4 className="text-[15px] font-semibold text-[var(--text-primary)] leading-6 mb-2">{stage.name}</h4>
                      <p className="text-[14px] text-[var(--text-primary)]/45 line-clamp-2 leading-5 mb-3">
                        {stage.description||'Без описания'}
                      </p>
                    </button>

                    {/* Футер */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border-color)]">
                      {resp?(
                        <div className="inline-flex items-center gap-2 min-w-0">
                          <Ava name={resp.full_name} size="sm"/>
                          <span className="text-[13px] text-[var(--text-primary)]/55 truncate">{resp.full_name.split(' ')[0]}</span>
                        </div>
                      ):<span className="text-[13px] text-[var(--text-primary)]/30">Не назначен</span>}

                      <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-primary)]/40 flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5"/>
                        {fmtShort(stage.planned_end)}
                      </div>
                    </div>

                    {/* Длительность */}
                    {stage.planned_duration_days!=null&&(
                      <div className="mt-2.5 flex items-center gap-1.5 text-[13px] text-[var(--text-primary)]/35">
                        <Clock className="w-3.5 h-3.5"/>
                        {stage.planned_duration_days} дн.
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Drop-зона внизу колонки когда тянем */}
              {dragId && items.length>0 && (
                <div className={`h-16 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors ${
                  isOver
                    ?'border-[var(--accent)]/40 bg-[var(--accent-soft)]/20 text-[var(--accent)]/60'
                    :'border-[var(--border-color)]/50 text-[var(--text-primary)]/20'
                }`}>
                  <span className="text-[13px]">{isOver?'Отпустите':'Перетащите сюда'}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

function AnalyticsView({stages}:{stages:ProjectStageResponse[]}){
  const t=stages.length;const done=stages.filter(s=>s.status==='completed').length;const act=stages.filter(s=>s.status==='active').length;const over=stages.filter(s=>s.is_overdue&&s.status!=='completed'&&s.status!=='skipped').length;
  const durs=stages.map(s=>s.planned_duration_days).filter((d):d is number=>d!=null);const avg=durs.length?Math.round(durs.reduce((a,b)=>a+b,0)/durs.length):0;
  const kpi=[{l:'Всего',v:t,i:Milestone},{l:'Завершено',v:done,i:CheckCircle2,c:'text-emerald-300',b:'bg-emerald-500/10 border-emerald-400/15'},{l:'В работе',v:act,i:PlayCircle,c:'text-blue-300',b:'bg-blue-500/10 border-blue-400/15'},{l:'Просрочено',v:over,i:AlertTriangle,c:'text-[var(--accent)]',b:'bg-[var(--accent-soft)] border-[var(--accent)]/15'},{l:'Ср. длит.',v:`${avg} дн.`,i:Clock,c:'text-amber-300',b:'bg-amber-500/10 border-amber-400/15'}];
  if(!t)return<div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8"><p className="text-[15px] text-[var(--text-primary)]/45">Нет данных</p></div>;
  return(<motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">
    <div className="grid gap-3 md:grid-cols-5 grid-cols-2">{kpi.map((k,i)=><motion.div key={k.l} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className={`rounded-2xl border p-4 ${k.b??'bg-[var(--bg-card)] border-[var(--border-color)]'}`}><div className="flex items-center justify-between gap-3"><div><p className="text-[13px] text-[var(--text-primary)]/45">{k.l}</p><p className="mt-1 text-[24px] font-bold text-[var(--text-primary)]">{k.v}</p></div><div className={`w-11 h-11 rounded-2xl border border-[var(--border-color)]/40 bg-[var(--bg-card)] flex items-center justify-center ${k.c??'text-[var(--text-primary)]/60'}`}><k.i className="w-5 h-5"/></div></div></motion.div>)}</div>
  </motion.div>);
}

/* ════════════════════════════════════════════════════════════════
   STAGE DETAIL / EDIT — полноэкранный внутри секции
   ════════════════════════════════════════════════════════════════ */

function StageDetail({stage,responsible,responsibles,totalStages,onBack,onSave,onDelete,onStart,onComplete,onSkip}:{
  stage:ProjectStageResponse;responsible:StageResponsible|null;responsibles:Record<string,StageResponsible>;totalStages:number;
  onBack:()=>void;onSave:(id:string,p:StageUpsertPayload)=>Promise<void>;onDelete:(id:string)=>Promise<void>;
  onStart:(id:string)=>Promise<void>;onComplete:(id:string)=>Promise<void>;onSkip:(id:string)=>Promise<void>;
}){
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState<StageForm>(stageToForm(stage));
  const [action,setAction]=useState<null|string>(null);

  useEffect(()=>{setForm(stageToForm(stage));setEditing(false);},[stage.id,stage.updated_at]);

  const upd=<K extends keyof StageForm>(k:K,v:StageForm[K])=>setForm(p=>({...p,[k]:v}));
  const inputCls='w-full rounded-xl border border-[var(--border-color)] bg-[var(--hover-2)] px-4 py-3 text-[14px] text-[var(--text-primary)] placeholder-white/20 outline-none focus:border-[var(--accent)]/30 focus:ring-2 focus:ring-[var(--accent-ring)] transition-all';
  const labelCls='block text-[13px] font-medium text-[var(--text-primary)]/50 mb-2';
  const meta=STATUS_CFG[stage.status];const eff=effStatus(stage);const isOver=eff==='overdue';
  const canStart=stage.status==='planned'||stage.status==='on_hold';
  const canComplete=stage.status==='active';
  const canSkip=stage.status==='planned'||stage.status==='on_hold';
  const respOpts=Object.values(responsibles).sort((a,b)=>a.full_name.localeCompare(b.full_name,'ru'));

  const handleSave=async()=>{const p=formToPayload(form);if(!p.name)return;setSaving(true);try{await onSave(stage.id,p);setEditing(false);}finally{setSaving(false);}};
  const handleAction=async(type:string,fn:(id:string)=>Promise<void>)=>{setAction(type);try{await fn(stage.id);}finally{setAction(null);}};
  const handleDelete=async()=>{if(!confirm(`Удалить этап «${stage.name}»?`))return;setAction('delete');try{await onDelete(stage.id);}finally{setAction(null);}};

  return(
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.2}}>
      {/* Навигация назад */}
      <button onClick={onBack} className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] transition-colors mb-6">
        <ArrowLeft className="w-4 h-4"/>Назад к этапам
      </button>

      {/* Шапка */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 md:p-8 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <Badge order={stage.order}/>
              <Chip status={stage.status}/>
              {isOver&&<Chip status="overdue"/>}
            </div>
            <h1 className="text-[26px] md:text-[30px] font-bold text-[var(--text-primary)] leading-tight">{stage.name}</h1>
            <p className="mt-3 text-[15px] leading-7 text-[var(--text-primary)]/60 max-w-3xl whitespace-pre-wrap">{stage.description||'Описание этапа не заполнено'}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!editing&&<button onClick={()=>setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--hover-2)] px-4 py-3 text-[14px] font-medium text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] hover:bg-[var(--hover-1)] transition-colors"><PenSquare className="w-4 h-4"/>Редактировать</button>}
          </div>
        </div>
      </div>

      {editing?(
        /* ═══ Режим редактирования ═══ */
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 md:p-8 space-y-6">
          <h2 className="text-[20px] font-bold text-[var(--text-primary)]">Редактирование</h2>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2"><label className={labelCls}>Название</label><input value={form.name} onChange={e=>upd('name',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Номер этапа</label><input type="number" min={1} value={form.order} onChange={e=>upd('order',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Статус</label><select value={form.status} onChange={e=>upd('status',e.target.value as ProjectStageStatus)} className={inputCls}><option value="planned">Запланирован</option><option value="active">В работе</option><option value="on_hold">На паузе</option><option value="completed">Завершён</option><option value="skipped">Пропущен</option></select></div>
            <div><label className={labelCls}>Плановое начало</label><input type="date" value={form.planned_start} onChange={e=>upd('planned_start',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Плановое окончание</label><input type="date" value={form.planned_end} onChange={e=>upd('planned_end',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Длительность, дней</label><input type="number" min={1} value={form.planned_duration_days} onChange={e=>upd('planned_duration_days',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Ответственный</label><select value={form.responsible_id} onChange={e=>upd('responsible_id',e.target.value)} className={inputCls}><option value="">Не назначен</option>{respOpts.map(p=><option key={p.id} value={p.id}>{p.full_name}{p.role?` — ${p.role}`:''}</option>)}</select></div>
            <div className="md:col-span-2"><label className={labelCls}>Описание</label><textarea value={form.description} onChange={e=>upd('description',e.target.value)} className={`${inputCls} min-h-[140px] resize-y`}/></div>
            <div className="md:col-span-2"><label className={labelCls}>Критерии приёмки (каждый с новой строки)</label><textarea value={form.completion_criteria} onChange={e=>upd('completion_criteria',e.target.value)} className={`${inputCls} min-h-[140px] resize-y`} placeholder={'Утверждено ТЗ\nПройдены тесты'}/></div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--border-color)] flex-wrap">
            <button onClick={handleDelete} disabled={action==='delete'} className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-3 text-[14px] font-medium text-[var(--accent)] disabled:opacity-50"><Trash2 className="w-4 h-4"/>{action==='delete'?'Удаляем…':'Удалить этап'}</button>
            <div className="flex gap-3">
              <button onClick={()=>{setEditing(false);setForm(stageToForm(stage));}} className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-2)] px-4 py-3 text-[14px] font-medium text-[var(--text-primary)]/65 hover:text-[var(--text-primary)] transition-colors">Отмена</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-[14px] font-semibold text-white disabled:opacity-50"><Save className="w-4 h-4"/>{saving?'Сохраняем…':'Сохранить'}</button>
            </div>
          </div>
        </div>
      ):(
        /* ═══ Режим просмотра ═══ */
        <div className="grid md:grid-cols-2 gap-6">
          {/* Левый блок: сроки + ответственный */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-5 inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-[var(--text-primary)]/45"/>Сроки и даты</h3>
              <div className="grid grid-cols-2 gap-4">{[
                {l:'Плановое начало',v:fmtDate(stage.planned_start)},{l:'Плановое окончание',v:fmtDate(stage.planned_end)},
                {l:'Длительность',v:stage.planned_duration_days!=null?`${stage.planned_duration_days} дн.`:'—'},{l:'Порядок',v:`Этап ${stage.order} из ${totalStages}`},
                {l:'Фактический старт',v:fmtDT(stage.started_at)},{l:'Фактическое завершение',v:fmtDT(stage.completed_at)},
              ].map(c=><div key={c.l} className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-2)] p-3.5"><p className="text-[13px] text-[var(--text-primary)]/40 mb-1.5">{c.l}</p><p className="text-[14px] font-semibold text-[var(--text-primary)]">{c.v}</p></div>)}</div>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-5 inline-flex items-center gap-2"><User className="w-4 h-4 text-[var(--text-primary)]/45"/>Ответственный</h3>
              {responsible?<div className="flex items-center gap-4"><Ava name={responsible.full_name}/><div><p className="text-[15px] font-semibold text-[var(--text-primary)]">{responsible.full_name}</p>{responsible.role&&<p className="text-[14px] text-[var(--text-primary)]/50 mt-0.5">{responsible.role}</p>}{responsible.email&&<p className="text-[14px] text-[var(--text-primary)]/40 mt-0.5">{responsible.email}</p>}</div></div>:<p className="text-[14px] text-[var(--text-primary)]/40">Не назначен</p>}
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-5 inline-flex items-center gap-2"><Settings2 className="w-4 h-4 text-[var(--text-primary)]/45"/>Служебная информация</h3>
              <div className="space-y-3 text-[14px]">{[{l:'ID',v:stage.id,mono:true},{l:'Создан',v:fmtDT(stage.created_at)},{l:'Обновлён',v:fmtDT(stage.updated_at)}].map(r=><div key={r.l} className="flex justify-between gap-4"><span className="text-[var(--text-primary)]/40">{r.l}</span><span className={`text-[var(--text-primary)]/70 ${r.mono?'font-mono text-[13px]':''} text-right break-all`}>{r.v}</span></div>)}</div>
            </div>
          </div>

          {/* Правый блок: критерии + действия */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-5 inline-flex items-center gap-2"><ListChecks className="w-4 h-4 text-[var(--text-primary)]/45"/>Критерии приёмки</h3>
              {!stage.completion_criteria.length?<p className="text-[14px] text-[var(--text-primary)]/40">Критерии не указаны</p>:
              <div className="space-y-3">{stage.completion_criteria.map((c,i)=><div key={i} className="flex items-start gap-3"><Target className="w-4 h-4 text-[var(--accent)] mt-0.5 flex-shrink-0"/><span className="text-[14px] leading-6 text-[var(--text-primary)]/75">{c}</span></div>)}</div>}
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-5 inline-flex items-center gap-2"><Flag className="w-4 h-4 text-[var(--text-primary)]/45"/>Быстрые действия</h3>
              <div className="grid gap-3">
                {canStart&&<button onClick={()=>handleAction('start',onStart)} disabled={!!action} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3.5 text-[14px] font-semibold text-white disabled:opacity-50"><PlayCircle className="w-4 h-4"/>{action==='start'?'Запускаем…':'Начать этап'}</button>}
                {canComplete&&<button onClick={()=>handleAction('complete',onComplete)} disabled={!!action} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-[14px] font-semibold text-white disabled:opacity-50"><CheckCircle2 className="w-4 h-4"/>{action==='complete'?'Завершаем…':'Завершить этап'}</button>}
                {canSkip&&<button onClick={()=>handleAction('skip',onSkip)} disabled={!!action} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--hover-2)] px-4 py-3.5 text-[14px] font-medium text-[var(--text-primary)]/65 hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"><SkipForward className="w-4 h-4"/>{action==='skip'?'Пропускаем…':'Пропустить этап'}</button>}
                {!canStart&&!canComplete&&!canSkip&&<p className="text-[14px] text-[var(--text-primary)]/40 text-center py-4">Нет доступных быстрых действий для текущего статуса</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CREATE STAGE — полноэкранный внутри секции
   ════════════════════════════════════════════════════════════════ */

function CreateStage({nextOrder,responsibles,onBack,onSubmit}:{nextOrder:number;responsibles:Record<string,StageResponsible>;onBack:()=>void;onSubmit:(p:StageUpsertPayload)=>Promise<void>}){
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState<StageForm>(emptyForm(nextOrder));
  const upd=<K extends keyof StageForm>(k:K,v:StageForm[K])=>setForm(p=>({...p,[k]:v}));

  const iCls='w-full rounded-lg border border-[var(--border-color)] bg-[var(--hover-2)] px-3 py-2 text-[14px] text-[var(--text-primary)] placeholder-white/20 outline-none focus:border-[var(--accent)]/30 focus:ring-2 focus:ring-[var(--accent-ring)] transition-all';
  const lCls='block text-[13px] font-medium text-[var(--text-primary)]/45 mb-1';
  const respOpts=Object.values(responsibles).sort((a,b)=>a.full_name.localeCompare(b.full_name,'ru'));

  const handleSubmit=async()=>{const p=formToPayload(form);if(!p.name)return;setSaving(true);try{await onSubmit(p);}finally{setSaving(false);}};

  return(
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.2}}>
      <button onClick={onBack} className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--text-primary)]/55 hover:text-[var(--text-primary)] transition-colors mb-5">
        <ArrowLeft className="w-4 h-4"/>Назад к этапам
      </button>

      {/* Шапка */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)]"><Plus className="w-5 h-5"/></div>
          <div><h1 className="text-[20px] font-bold text-[var(--text-primary)]">Новый этап</h1><p className="text-[14px] text-[var(--text-primary)]/45">Заполните поля ниже</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="rounded-lg border border-[var(--border-color)] bg-[var(--hover-2)] px-3 py-2 text-[14px] text-[var(--text-primary)]/55 hover:text-[var(--text-primary)] transition-colors">Отмена</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[14px] font-semibold text-white disabled:opacity-50"><Plus className="w-3.5 h-3.5"/>{saving?'Создаём…':'Создать'}</button>
        </div>
      </div>

      {/* Форма — 3 колонки как в детальном просмотре */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Кол. 1 */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Milestone className="w-4 h-4 text-[var(--text-primary)]/35"/>Основное
            </h3>
            <div className="space-y-3">
              <div><label className={lCls}>Название</label><input value={form.name} onChange={e=>upd('name',e.target.value)} className={iCls} placeholder="Например: Тестирование"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lCls}>Номер</label><input type="number" min={1} value={form.order} onChange={e=>upd('order',e.target.value)} className={iCls}/></div>
                <div><label className={lCls}>Статус</label><select value={form.status} onChange={e=>upd('status',e.target.value as ProjectStageStatus)} className={iCls}>
                  <option value="planned">Запланирован</option><option value="active">В работе</option>
                  <option value="on_hold">На паузе</option><option value="completed">Завершён</option>
                  <option value="skipped">Пропущен</option></select></div>
              </div>
              <div><label className={lCls}>Ответственный</label><select value={form.responsible_id} onChange={e=>upd('responsible_id',e.target.value)} className={iCls}>
                <option value="">Не назначен</option>{respOpts.map(p=><option key={p.id} value={p.id}>{p.full_name}{p.role?` — ${p.role}`:''}</option>)}</select></div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--text-primary)]/35"/>Сроки
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lCls}>Начало</label><input type="date" value={form.planned_start} onChange={e=>upd('planned_start',e.target.value)} className={iCls}/></div>
                <div><label className={lCls}>Окончание</label><input type="date" value={form.planned_end} onChange={e=>upd('planned_end',e.target.value)} className={iCls}/></div>
              </div>
              <div><label className={lCls}>Длительность, дней</label><input type="number" min={1} value={form.planned_duration_days} onChange={e=>upd('planned_duration_days',e.target.value)} className={iCls} placeholder="—"/></div>
            </div>
          </div>
        </div>

        {/* Кол. 2 */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
          <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--text-primary)]/35"/>Описание
          </h3>
          <textarea value={form.description} onChange={e=>upd('description',e.target.value)}
            className={`${iCls} min-h-[280px] resize-y`} placeholder="Задачи и содержание этапа"/>
        </div>

        {/* Кол. 3 */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
          <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-[var(--text-primary)]/35"/>Критерии приёмки
          </h3>
          <p className="text-[13px] text-[var(--text-primary)]/40 mb-2">Каждый критерий с новой строки</p>
          <textarea value={form.completion_criteria} onChange={e=>upd('completion_criteria',e.target.value)}
            className={`${iCls} min-h-[250px] resize-y`} placeholder={'Утверждено ТЗ\nПройдены тесты\nПодписан акт'}/>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION
   ════════════════════════════════════════════════════════════════ */

interface SectionProps {
  projectId: string;
  stages?: ProjectStageResponse[];
  responsibles?: Record<string, StageResponsible>;
  loading?: boolean;
  onStagesChange?: (s: ProjectStageResponse[]) => void;
  onCreateStage?: (pid: string, p: StageUpsertPayload) => Promise<ProjectStageResponse | void>;
  onUpdateStage?: (pid: string, sid: string, p: StageUpsertPayload) => Promise<ProjectStageResponse | void>;
  onDeleteStage?: (pid: string, sid: string) => Promise<void>;
  onStartStage?: (pid: string, sid: string) => Promise<void>;
  onCompleteStage?: (pid: string, sid: string) => Promise<void>;
  onSkipStage?: (pid: string, sid: string) => Promise<void>;
}

export function ProjectStagesSection({projectId,stages:ext,responsibles:extR,loading:extL,onStagesChange,onCreateStage,onUpdateStage,onDeleteStage,onStartStage,onCompleteStage,onSkipStage}:SectionProps){
  const [stages,setStages]=useState<ProjectStageResponse[]>(ext??[]);
  const [responsibles,setResponsibles]=useState<Record<string,StageResponsible>>(extR??{});
  const [loading,setLoading]=useState(extL??true);
  const [view,setView]=useState<ViewType>('table');
  const [screen,setScreen]=useState<SectionScreen>({type:'list'});
  const [toasts,setToasts]=useState<Toast[]>([]);

  useEffect(()=>{if(ext){setStages(normOrd(ext));setResponsibles(extR??{});setLoading(false);return;}const t=setTimeout(()=>{setStages(normOrd(MOCK_STAGES));setResponsibles(MOCK_RESPONSIBLES);setLoading(false);},350);return()=>clearTimeout(t);},[ext,extR,projectId]);

  const push=useCallback((title:string,type:Toast['type']='info')=>{const id=Date.now()+Math.random();setToasts(p=>[...p,{id,title,type}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);},[]);
  const commit=useCallback((next:ProjectStageResponse[])=>{setStages(next);onStagesChange?.(next);},[onStagesChange]);

  const selectedStage=useMemo(()=>screen.type==='detail'?stages.find(s=>s.id===screen.stageId)??null:null,[stages,screen]);

  const goList=useCallback(()=>setScreen({type:'list'}),[]);
  const goDetail=useCallback((s:ProjectStageResponse)=>setScreen({type:'detail',stageId:s.id,editing:false}),[]);
  const goCreate=useCallback(()=>setScreen({type:'create'}),[]);

  const handleCreate=useCallback(async(p:StageUpsertPayload)=>{
    const prev=stages;const loc=localCreate(projectId,p);const next=normOrd([...stages,loc]);commit(next);
    try{const created=await onCreateStage?.(projectId,p);let fin=next;if(created){fin=normOrd(next.map(s=>s.id===loc.id?created:s));commit(fin);}setScreen({type:'detail',stageId:created?.id??loc.id,editing:false});push(`Этап «${p.name}» создан`,'success');}
    catch{commit(prev);push('Не удалось создать этап','error');}
  },[stages,commit,projectId,onCreateStage,push]);

  const handleUpdate=useCallback(async(sid:string,p:StageUpsertPayload)=>{
    const cur=stages.find(s=>s.id===sid);if(!cur)return;const prev=stages;const loc=applyPayload(cur,p);const next=normOrd(stages.map(s=>s.id===sid?loc:s));commit(next);
    try{const upd=await onUpdateStage?.(projectId,sid,p);if(upd){commit(normOrd(next.map(s=>s.id===sid?upd:s)));}push(`Этап «${p.name}» сохранён`,'success');}
    catch{commit(prev);push('Не удалось сохранить','error');}
  },[stages,commit,projectId,onUpdateStage,push]);

  const handleDelete=useCallback(async(sid:string)=>{
    const cur=stages.find(s=>s.id===sid);if(!cur)return;const prev=stages;const next=normOrd(stages.filter(s=>s.id!==sid));commit(next);goList();
    try{await onDeleteStage?.(projectId,sid);push(`Этап «${cur.name}» удалён`,'success');}
    catch{commit(prev);setScreen({type:'detail',stageId:sid,editing:false});push('Не удалось удалить','error');}
  },[stages,commit,projectId,onDeleteStage,push,goList]);

  const quickAction=useCallback(async(sid:string,type:'start'|'complete'|'skip')=>{
    const cur=stages.find(s=>s.id===sid);if(!cur)return;const prev=stages;
    const newSt:ProjectStageStatus=type==='start'?'active':type==='complete'?'completed':'skipped';
    const loc=applyPayload(cur,{...formToPayload(stageToForm(cur)),status:newSt});const next=normOrd(stages.map(s=>s.id===sid?loc:s));commit(next);
    try{if(type==='start')await onStartStage?.(projectId,sid);if(type==='complete')await onCompleteStage?.(projectId,sid);if(type==='skip')await onSkipStage?.(projectId,sid);push(`Этап «${cur.name}» — ${STATUS_CFG[newSt].label.toLowerCase()}`,'success');}
    catch{commit(prev);push('Ошибка действия','error');}
  },[stages,commit,projectId,onStartStage,onCompleteStage,onSkipStage,push]);

  const handleMoveStage=useCallback(async(stageId:string,newStatus:ProjectStageStatus)=>{
    const cur=stages.find(s=>s.id===stageId);
    if(!cur||cur.status===newStatus)return;
    const prev=stages;
    const loc=applyPayload(cur,{...formToPayload(stageToForm(cur)),status:newStatus});
    const next=normOrd(stages.map(s=>s.id===stageId?loc:s));
    commit(next);
    try{
      // Маппинг статуса → нужная ручка API
      if(newStatus==='active') await onStartStage?.(projectId,stageId);
      else if(newStatus==='completed') await onCompleteStage?.(projectId,stageId);
      else if(newStatus==='skipped') await onSkipStage?.(projectId,stageId);
      else {
        // planned, on_hold — через общий update
        const payload=formToPayload(stageToForm(loc));
        await onUpdateStage?.(projectId,stageId,payload);
      }
      push(`«${cur.name}» → ${STATUS_CFG[newStatus].label}`,'success');
    }catch{
      commit(prev);
      push('Не удалось изменить статус','error');
    }
  },[stages,commit,projectId,onStartStage,onCompleteStage,onSkipStage,onUpdateStage,push]);

  if(loading) return <PageSkeleton/>;

  return(
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {screen.type==='list'&&(
          <motion.div key="list" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}>
            <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
              <ViewTabs view={view} onChange={setView}/>
              {stages.length>0&&view!=='table'&&<button onClick={goCreate} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[14px] font-semibold text-white"><Plus className="w-4 h-4"/>Создать</button>}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={view} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.15}}>
                {view==='table'&&<TableView stages={stages} responsibles={responsibles} onSelect={goDetail} onCreate={goCreate}/>}
                {view==='overview'&&<OverviewView stages={stages} responsibles={responsibles} onSelect={goDetail}/>}
                {view==='roadmap'&&<RoadmapView stages={stages} onSelect={goDetail}/>}
                {view==='timeline'&&<TimelineView stages={stages} onSelect={goDetail}/>}
                {view==='board'&&<BoardView stages={stages} responsibles={responsibles} onSelect={goDetail} onMoveStage={handleMoveStage}/>}
                {view==='analytics'&&<AnalyticsView stages={stages}/>}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {screen.type==='detail'&&selectedStage&&(
          <StageDetail
            key={selectedStage.id}
            stage={selectedStage}
            responsible={selectedStage.responsible_id?responsibles[selectedStage.responsible_id]??null:null}
            responsibles={responsibles}
            totalStages={stages.length}
            onBack={goList}
            onSave={handleUpdate}
            onDelete={handleDelete}
            onStart={sid=>quickAction(sid,'start')}
            onComplete={sid=>quickAction(sid,'complete')}
            onSkip={sid=>quickAction(sid,'skip')}
          />
        )}

        {screen.type==='create'&&(
          <CreateStage key="create" nextOrder={stages.length+1} responsibles={responsibles} onBack={goList} onSubmit={handleCreate}/>
        )}
      </AnimatePresence>

      <Toasts toasts={toasts} onClose={id=>setToasts(p=>p.filter(t=>t.id!==id))}/>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════════ */

export default function ProjectStagesPage(){
  return(
    <div className="space-y-6 animate-in fade-in duration-500">
      <ProjectStagesSection projectId="demo"/>
    </div>
  );
}
