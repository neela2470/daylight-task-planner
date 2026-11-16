const STORAGE_KEY = 'daylight-planner-v1';
const DEFAULT_PROJECTS = [
  { id: 'personal', name: 'Personal', color: 'green' },
  { id: 'work', name: 'Work', color: 'purple' },
  { id: 'ideas', name: 'Ideas', color: 'blue' },
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const today = new Date();
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const id = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const demoTasks = [
  { id: id(), title: 'Plan the week ahead', description: 'Make space for the things that matter.', project: 'personal', due: dateKey(today), priority: 'high', completed: false, created: Date.now() - 5000 },
  { id: id(), title: 'Send the project update', description: 'Share a quick note with the team.', project: 'work', due: dateKey(today), priority: 'medium', completed: false, created: Date.now() - 4000 },
  { id: id(), title: 'Take a proper lunch break', description: '', project: 'personal', due: dateKey(today), priority: 'low', completed: true, created: Date.now() - 3000 },
  { id: id(), title: 'Collect ideas for the side project', description: 'Keep it light; capture anything interesting.', project: 'ideas', due: '', priority: 'low', completed: false, created: Date.now() - 2000 },
];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.tasks) && Array.isArray(saved.projects)) return saved;
  } catch (error) { console.warn('Could not load saved tasks:', error); }
  return { tasks: demoTasks, projects: DEFAULT_PROJECTS };
}

const state = loadState();
let currentFilter = 'all';
let editingId = null;
let toastTimer;

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) { showToast('Could not save changes on this device.'); console.error(error); }
}

function readableDate(value, compact = false) {
  if (!value) return 'No date';
  const parsed = new Date(`${value}T12:00:00`);
  if (value === dateKey(today)) return 'Today';
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === dateKey(tomorrow)) return 'Tomorrow';
  const options = compact ? { month: 'short', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat(undefined, options).format(parsed);
}

function projectFor(task) { return state.projects.find((project) => project.id === task.project) || { name: 'Personal', color: 'green' }; }
function tasksForView() {
  const query = $('#search-input').value.trim().toLowerCase();
  let result = state.tasks.filter((task) => {
    if (currentFilter === 'today' && (task.due !== dateKey(today) || task.completed)) return false;
    if (currentFilter === 'upcoming' && (!task.due || task.due <= dateKey(today) || task.completed)) return false;
    if (currentFilter === 'completed' && !task.completed) return false;
    if (currentFilter.startsWith('project:') && task.project !== currentFilter.slice(8)) return false;
    const projectName = projectFor(task).name.toLowerCase();
    return !query || `${task.title} ${task.description} ${projectName}`.toLowerCase().includes(query);
  });
  const sort = $('#sort-select').value;
  result.sort((a, b) => {
    if (sort === 'created') return b.created - a.created;
    if (sort === 'priority') return ['high', 'medium', 'low'].indexOf(a.priority) - ['high', 'medium', 'low'].indexOf(b.priority);
    return (a.due || '9999').localeCompare(b.due || '9999') || b.created - a.created;
  });
  return result;
}

function taskMarkup(task) {
  const project = projectFor(task);
  const dueClass = task.due && task.due < dateKey(today) && !task.completed ? 'overdue' : task.due === dateKey(today) ? 'today' : '';
  const dueText = task.due && task.due < dateKey(today) && !task.completed ? `Overdue · ${readableDate(task.due, true)}` : readableDate(task.due, true);
  return `<article class="task-row ${task.completed ? 'completed' : ''}" data-id="${task.id}">
    <input class="task-check" type="checkbox" aria-label="Mark ${escapeHtml(task.title)} complete" ${task.completed ? 'checked' : ''} />
    <div class="task-main"><p class="task-title">${escapeHtml(task.title)}</p>${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}</div>
    <span class="project-tag"><i class="project-dot ${project.color}"></i>${escapeHtml(project.name)}</span>
    <span class="task-due ${dueClass}">${task.due ? escapeHtml(dueText) : ''}</span>
    <button class="task-more" aria-label="Task options" title="Edit task">···</button>
  </article>`;
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }

function render() {
  const visible = tasksForView();
  $('#task-list').innerHTML = visible.map(taskMarkup).join('');
  $('#task-list').classList.toggle('hidden', visible.length === 0);
  $('#empty-state').classList.toggle('hidden', visible.length > 0);
  $('#all-count').textContent = state.tasks.filter((task) => !task.completed).length;
  $('#today-count').textContent = state.tasks.filter((task) => task.due === dateKey(today) && !task.completed).length;
  $('#open-stat').textContent = state.tasks.filter((task) => !task.completed).length;
  $('#done-stat').textContent = state.tasks.filter((task) => task.completed).length;
  $('#focus-stat').textContent = state.tasks.filter((task) => !task.completed).length ? 'One thing at a time' : 'Ready when you are';
  $('#task-count-label').textContent = `${visible.length} ${visible.length === 1 ? 'task' : 'tasks'}`;
  $('#breadcrumb-view').textContent = viewName();
  $('#page-title').innerHTML = `${escapeHtml(viewName())}<span class="title-period">.</span>`;
  $('#list-heading').textContent = currentFilter === 'today' ? 'Due today' : currentFilter === 'completed' ? 'A look at your progress' : 'Your tasks';
  $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.filter === currentFilter));
  renderProjects();
  $('#empty-title').textContent = currentFilter === 'completed' ? 'Your next little win is waiting.' : 'A clear desk, a clear mind.';
  $('#empty-copy').textContent = currentFilter === 'completed' ? 'Finish a task and it will show up here.' : 'Add your first task and make a little room to focus.';
}

function viewName() {
  if (currentFilter.startsWith('project:')) return state.projects.find((p) => p.id === currentFilter.slice(8))?.name || 'Project';
  return ({ all: 'All tasks', today: 'Today', upcoming: 'Upcoming', completed: 'Completed' })[currentFilter] || 'All tasks';
}

function renderProjects() {
  const host = $('#project-list');
  host.innerHTML = state.projects.map((project) => `<button class="project-item ${currentFilter === `project:${project.id}` ? 'active' : ''}" data-project="${project.id}"><i class="project-dot ${project.color}"></i>${escapeHtml(project.name)}<span>${state.tasks.filter((task) => task.project === project.id && !task.completed).length}</span></button>`).join('');
  const select = $('#task-project');
  const selected = select.value;
  select.innerHTML = state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join('');
  if (state.projects.some((project) => project.id === selected)) select.value = selected;
}

function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function openTask(task = null) {
  editingId = task?.id ?? null;
  $('#task-form').reset();
  renderProjects();
  if (task) {
    $('#task-title').value = task.title;
    $('#task-description').value = task.description || '';
    $('#task-project').value = task.project;
    $('#task-due').value = task.due || '';
    $('#task-priority').value = task.priority;
  }
  $('#dialog-title').textContent = task ? 'A little adjustment' : 'Add a task';
  $('#save-task').textContent = task ? 'Save changes' : 'Add task';
  $('#task-dialog').showModal();
  $('#task-title').focus();
}

function addProject(name) {
  const colors = ['green', 'purple', 'blue'];
  const project = { id: id(), name: name.trim(), color: colors[state.projects.length % colors.length] };
  state.projects.push(project); saveState(); render(); showToast(`“${project.name}” is ready for your ideas.`);
}

function init() {
  const formatted = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(today);
  $('#header-date').textContent = formatted;
  $('#greeting-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(today).toUpperCase();
   const hour = new Date().getHours();

if (hour < 12) {
  $('#week-day').textContent = 'Good morning 🌅';
} else if (hour < 17) {
  $('#week-day').textContent = 'Good afternoon ☀️';
} else {
  $('#week-day').textContent = 'Good evening 🌙';
}
  render();

  $$('.nav-item').forEach((button) => button.addEventListener('click', () => { currentFilter = button.dataset.filter; render(); }));
  $('#project-list').addEventListener('click', (event) => { const button = event.target.closest('[data-project]'); if (button) { currentFilter = `project:${button.dataset.project}`; render(); } });
  $('#open-task-form').addEventListener('click', () => openTask());
  $('#empty-add').addEventListener('click', () => openTask());
  $$('.close-dialog').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  $('#task-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = { title: form.get('title').trim(), description: form.get('description').trim(), project: form.get('project'), due: form.get('due'), priority: form.get('priority') };
    if (!values.title) return;
    if (editingId) { Object.assign(state.tasks.find((task) => task.id === editingId), values); showToast('Your task has been updated.'); }
    else { state.tasks.unshift({ id: id(), ...values, completed: false, created: Date.now() }); showToast('Task added. You’ve got this.'); }
    saveState(); $('#task-dialog').close(); render();
  });
  $('#task-list').addEventListener('change', (event) => {
    const checkbox = event.target.closest('.task-check'); if (!checkbox) return;
    const task = state.tasks.find((item) => item.id === checkbox.closest('[data-id]').dataset.id);
    task.completed = checkbox.checked; saveState(); render(); showToast(task.completed ? 'One little win. Nicely done.' : 'Task moved back to your list.');
  });
  $('#task-list').addEventListener('click', (event) => {
    const button = event.target.closest('.task-more'); if (!button) return;
    const task = state.tasks.find((item) => item.id === button.closest('[data-id]').dataset.id); openTask(task);
  });
  $('#sort-select').addEventListener('change', render);
  $('#search-toggle').addEventListener('click', () => { $('#search-wrap').classList.toggle('hidden'); if (!$('#search-wrap').classList.contains('hidden')) $('#search-input').focus(); else { $('#search-input').value = ''; render(); } });
  $('#search-input').addEventListener('input', render);
  $('#add-project').addEventListener('click', () => { $('#project-form').reset(); $('#project-dialog').showModal(); $('#project-name').focus(); });
  $('#project-form').addEventListener('submit', (event) => { event.preventDefault(); const name = $('#project-name').value.trim(); if (!name) return; if (state.projects.some((project) => project.name.toLowerCase() === name.toLowerCase())) return showToast('You already have a project with that name.'); addProject(name); $('#project-dialog').close(); });
}

init();
