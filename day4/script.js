const noteText = document.querySelector('#note-text');
const charCount = document.querySelector('#char-count');
const wordCount = document.querySelector('#word-count');
const clearButton = document.querySelector('#clear-btn');
const themeToggle = document.querySelector('#theme-toggle');
const body = document.body;

const DRAFT_KEY = 'day4-draft';
const THEME_KEY = 'day4-theme';

function updateCounts() {
  const characters = noteText.value.length;
  const trimmedText = noteText.value.trim();
  const words = trimmedText === '' ? 0 : trimmedText.split(/\s+/).length;

  charCount.textContent = `${characters} / 200 characters`;
  wordCount.textContent = `${words} words`;
  charCount.classList.toggle('warning', characters > 180);
  charCount.classList.toggle('over', characters > 200);
}

function clearNote() {
  noteText.value = '';
  updateCounts();
  localStorage.removeItem(DRAFT_KEY);
  noteText.focus();
}

function updateThemeButton() {
  const isDark = body.classList.contains('dark');
  themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
  themeToggle.setAttribute('aria-pressed', String(isDark));
}

noteText.addEventListener('input', () => {
  updateCounts();
  localStorage.setItem(DRAFT_KEY, noteText.value);
});

clearButton.addEventListener('click', clearNote);
noteText.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    clearNote();
  }
});

themeToggle.addEventListener('click', () => {
  body.classList.toggle('dark');
  updateThemeButton();
  localStorage.setItem(THEME_KEY, body.classList.contains('dark') ? 'dark' : 'light');
});

noteText.value = localStorage.getItem(DRAFT_KEY) ?? '';
body.classList.toggle('dark', localStorage.getItem(THEME_KEY) === 'dark');
updateThemeButton();
updateCounts();
