/**
 * script.js — Task List App
 *
 * Fitur:
 *  - CRUD: Tambah, Baca, Edit, Hapus task
 *  - Toggle status: Active ↔ Completed
 *  - Filter: All | Active | Completed
 *  - Persisten: data disimpan di localStorage
 *  - Animasi masuk/keluar pada task item
 *
 * Struktur Data Task:
 *  { id: string, text: string, completed: boolean, createdAt: number }
 */


/* ================================================================
   STATE
   ================================================================ */

/** @type {{ id: string, text: string, completed: boolean, createdAt: number }[]} */
let tasks = [];

/** Filter aktif saat ini: 'all' | 'active' | 'completed' */
let currentFilter = 'all';

/** ID task yang sedang di-edit (digunakan oleh modal) */
let editingTaskId = null;


/* ================================================================
   DOM REFERENCES
   ================================================================ */

const taskForm      = document.getElementById('taskForm');
const taskInput     = document.getElementById('taskInput');
const inputError    = document.getElementById('inputError');
const taskList      = document.getElementById('taskList');
const emptyState    = document.getElementById('emptyState');
const taskCounter   = document.getElementById('taskCounter');
const clearCompleted = document.getElementById('clearCompleted');
const filterBtns    = document.querySelectorAll('.filter-btn');

// Modal
const editModal  = document.getElementById('editModal');
const editInput  = document.getElementById('editInput');
const editError  = document.getElementById('editError');
const saveEdit   = document.getElementById('saveEdit');
const cancelEdit = document.getElementById('cancelEdit');


/* ================================================================
   LOCALSTORAGE HELPERS
   ================================================================ */

const STORAGE_KEY = 'taskListApp_tasks';

/** Muat tasks dari localStorage. Kembalikan array kosong jika tidak ada. */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Simpan tasks ke localStorage. */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}


/* ================================================================
   UTILITIES
   ================================================================ */

/** Generate ID unik sederhana berbasis timestamp + random. */
function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Sanitasi teks: hilangkan spasi berlebih. */
function sanitize(text) {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Tampilkan pesan error pada elemen tertentu.
 * @param {HTMLElement} el - Elemen error paragraph
 * @param {string} msg     - Pesan yang ditampilkan
 */
function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

/** Sembunyikan pesan error. */
function clearError(el) {
  el.textContent = '';
  el.classList.add('hidden');
}


/* ================================================================
   FILTER LOGIC
   ================================================================ */

/**
 * Kembalikan array tasks sesuai filter aktif.
 * @returns {typeof tasks}
 */
function getFilteredTasks() {
  switch (currentFilter) {
    case 'active':    return tasks.filter(t => !t.completed);
    case 'completed': return tasks.filter(t => t.completed);
    default:          return [...tasks];
  }
}


/* ================================================================
   RENDER
   ================================================================ */

/**
 * Render ulang seluruh daftar task sesuai filter aktif.
 * Dipanggil setiap kali state berubah.
 */
function render() {
  const filtered = getFilteredTasks();

  // Hapus semua item lama (tanpa animasi keluar — render penuh)
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
  } else {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    filtered.forEach(task => {
      taskList.appendChild(createTaskElement(task));
    });
  }

  updateFooter();
}

/**
 * Buat elemen <li> untuk satu task.
 * @param {{ id: string, text: string, completed: boolean }} task
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  const li = document.createElement('li');
  li.dataset.id = task.id;
  li.className = [
    'task-enter',
    'flex items-center gap-3',
    'bg-white border border-slate-100 rounded-xl px-4 py-3',
    'shadow-sm hover:shadow-md',
    'transition-shadow duration-200',
    'group',
  ].join(' ');

  // ── Checkbox ──────────────────────────────────────────────
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox flex-shrink-0';
  checkbox.checked = task.completed;
  checkbox.setAttribute('aria-label', `Tandai "${task.text}" sebagai ${task.completed ? 'aktif' : 'selesai'}`);
  checkbox.addEventListener('change', () => toggleTask(task.id));

  // ── Teks Task ─────────────────────────────────────────────
  const span = document.createElement('span');
  span.className = [
    'flex-1 text-sm leading-snug break-words min-w-0',
    task.completed ? 'task-text-completed' : 'text-slate-700',
  ].join(' ');
  span.textContent = task.text;

  // ── Tombol Aksi (Edit & Hapus) ────────────────────────────
  const actions = document.createElement('div');
  actions.className = [
    'flex items-center gap-1',
    'opacity-0 group-hover:opacity-100',
    'transition-opacity duration-200',
    'flex-shrink-0',
  ].join(' ');

  // Tombol Edit
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = [
    'p-1.5 rounded-lg text-slate-400',
    'hover:text-primary-600 hover:bg-primary-50',
    'transition duration-150',
    'focus:outline-none focus:ring-2 focus:ring-primary-400',
  ].join(' ');
  editBtn.setAttribute('aria-label', `Edit task "${task.text}"`);
  editBtn.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"
      viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M15.232 5.232l3.536 3.536
           M9 13l6.5-6.5a2 2 0 112.828 2.828L11.828 15.828
           a2 2 0 01-.707.465l-3.536.707.707-3.536
           a2 2 0 01.465-.707z" />
    </svg>`;
  editBtn.addEventListener('click', () => openEditModal(task.id));

  // Tombol Hapus
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = [
    'p-1.5 rounded-lg text-slate-400',
    'hover:text-red-500 hover:bg-red-50',
    'transition duration-150',
    'focus:outline-none focus:ring-2 focus:ring-red-300',
  ].join(' ');
  deleteBtn.setAttribute('aria-label', `Hapus task "${task.text}"`);
  deleteBtn.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"
      viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862
           a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6
           M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
    </svg>`;
  deleteBtn.addEventListener('click', () => deleteTask(task.id));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(actions);

  return li;
}

/** Perbarui counter task aktif dan tombol "Hapus Selesai". */
function updateFooter() {
  const activeCount     = tasks.filter(t => !t.completed).length;
  const completedCount  = tasks.filter(t => t.completed).length;

  taskCounter.textContent = `${activeCount} task tersisa`;

  if (completedCount > 0) {
    clearCompleted.classList.remove('hidden');
  } else {
    clearCompleted.classList.add('hidden');
  }
}


/* ================================================================
   CRUD OPERATIONS
   ================================================================ */

/**
 * Tambah task baru ke dalam array tasks.
 * @param {string} text - Teks task dari input form
 */
function addTask(text) {
  const clean = sanitize(text);

  if (!clean) {
    showError(inputError, 'Task tidak boleh kosong.');
    return false;
  }
  if (clean.length > 120) {
    showError(inputError, 'Task maksimal 120 karakter.');
    return false;
  }

  const newTask = {
    id: generateId(),
    text: clean,
    completed: false,
    createdAt: Date.now(),
  };

  // Sisipkan di awal agar task terbaru muncul di atas
  tasks.unshift(newTask);
  saveTasks();
  render();
  return true;
}

/**
 * Toggle status completed/active sebuah task berdasarkan ID.
 * @param {string} id
 */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  render();
}

/**
 * Hapus task berdasarkan ID dengan animasi keluar.
 * @param {string} id
 */
function deleteTask(id) {
  // Cari elemen li di DOM
  const li = taskList.querySelector(`li[data-id="${id}"]`);

  if (li) {
    // Terapkan animasi keluar, lalu hapus dari state
    li.classList.add('task-exit');
    li.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    }, { once: true });
  } else {
    // Fallback jika li tidak ditemukan di DOM (edge case)
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }
}

/**
 * Update teks task berdasarkan ID.
 * @param {string} id
 * @param {string} newText
 */
function updateTask(id, newText) {
  const clean = sanitize(newText);

  if (!clean) {
    showError(editError, 'Task tidak boleh kosong.');
    return false;
  }
  if (clean.length > 120) {
    showError(editError, 'Task maksimal 120 karakter.');
    return false;
  }

  const task = tasks.find(t => t.id === id);
  if (!task) return false;

  task.text = clean;
  saveTasks();
  render();
  return true;
}

/** Hapus semua task yang sudah completed. */
function clearCompletedTasks() {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  render();
}


/* ================================================================
   MODAL (EDIT)
   ================================================================ */

/**
 * Buka modal edit dan isi dengan teks task yang dipilih.
 * @param {string} id
 */
function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingTaskId    = id;
  editInput.value  = task.text;
  clearError(editError);

  editModal.classList.add('modal-open');
  // Fokus ke input setelah transisi selesai
  setTimeout(() => editInput.focus(), 150);
}

/** Tutup modal edit dan reset state. */
function closeEditModal() {
  editModal.classList.remove('modal-open');
  editingTaskId = null;
  editInput.value = '';
  clearError(editError);
}


/* ================================================================
   EVENT LISTENERS
   ================================================================ */

// ── Form: Tambah Task ─────────────────────────────────────────
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearError(inputError);

  const success = addTask(taskInput.value);
  if (success) {
    taskInput.value = '';
    taskInput.focus();
  }
});

// Hapus error saat user mulai mengetik
taskInput.addEventListener('input', () => clearError(inputError));


// ── Filter Buttons ────────────────────────────────────────────
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;

    // Update visual state tombol filter
    filterBtns.forEach(b => b.classList.remove('active-filter'));
    btn.classList.add('active-filter');

    render();
  });
});


// ── Clear Completed ───────────────────────────────────────────
clearCompleted.addEventListener('click', clearCompletedTasks);


// ── Modal: Simpan Edit ────────────────────────────────────────
saveEdit.addEventListener('click', () => {
  if (!editingTaskId) return;
  clearError(editError);

  const success = updateTask(editingTaskId, editInput.value);
  if (success) closeEditModal();
});

// ── Modal: Batal ──────────────────────────────────────────────
cancelEdit.addEventListener('click', closeEditModal);

// ── Modal: Tutup saat klik backdrop ──────────────────────────
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

// ── Modal: Tutup saat tekan Escape ───────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editModal.classList.contains('modal-open')) {
    closeEditModal();
  }
});

// ── Modal: Submit dengan Enter ────────────────────────────────
editInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveEdit.click();
  }
});

// Hapus error saat user mengetik di modal
editInput.addEventListener('input', () => clearError(editError));


/* ================================================================
   INIT — Jalankan saat halaman pertama kali dimuat
   ================================================================ */

(function init() {
  tasks = loadTasks();
  render();
})();
