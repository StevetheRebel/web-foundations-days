let notes = [
  {
    id: 1,
    text: "Buy milk and bread",
    category: "personal",
  },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// searchNotes
function searchNotes(word) {
  return notes.filter((note) =>
    note.text.toLowerCase().includes(word.toLowerCase()),
  );
}

// longestNote()
function longestNote() {
  if (notes.length === 0) return null;

  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) longest = note;
  }

  return longest;
}

// count by category output:  personal: 2, work: 1, study: 2
function countByCategory() {
  let counts = {};

  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }

  return counts;
}

// gets the summary of notes output: 5 notes: 2 personal, 1 work, 2 study.
function getSummary() {
  let counts = countByCategory();
  const label = notes.length === 1 ? "note" : "notes";

  return `${notes.length} ${label}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study `;
}

// check if text entered is already present
function isDuplicate(text) {
  const normalText = text.trim().toLowerCase().replace(/\s+/g, " ");

  return notes.some(
    (note) =>
      note.text.trim().toLowerCase().replace(/\s+/g, " ") === normalText,
  );
}

function addNote(text, category) {
  if (typeof text !== "string") {
    console.log("Not added: text must be a string.");
    return false;
  }

  const cleanText = text.trim();
  if (cleanText.length < 1 || cleanText.length > 200) {
    console.log("Not added: text must contain 1–200 characters.");
    return false;
  }
  if (!["personal", "work", "study"].includes(category)) {
    console.log("Not added: category must be personal, work or study.");
    return false;
  }
  if (isDuplicate(cleanText)) {
    console.log("Not added: duplicate text.");
    return false;
  }

  let id = 1;
  for (const note of notes) {
    if (note.id >= id) id = note.id + 1;
  }
  notes.push({ id, text: cleanText, category });
  console.log("Added: note passed all checks.");
  return true;
}

// Main tests
console.log(searchNotes("MILK")); // Expected: [{ id: 1, text: "Buy milk and bread", category: "personal" }]
console.log(searchNotes("holiday")); // Expected: []

console.log(longestNote()); // Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

console.log(countByCategory()); // Expected: { personal: 2, study: 2, work: 1 }

console.log(getSummary()); // Expected: "5 notes: 2 personal, 1 work, 2 study."

console.log(isDuplicate("  BUY   milk and bread  ")); // Expected: true
console.log(isDuplicate("Water the plants")); // Expected: false

// trying the functions with an empty array
const copiedNotes = notes;
notes = [];

console.log(longestNote()); // Expected: null

console.log(countByCategory()); // Expected: {}

console.log(getSummary()); // Expected: "0 notes: 0 personal, 0 work, 0 study."

notes = [copiedNotes[0]];
console.log(getSummary()); // Expected: "1 note: 1 personal, 0 work, 0 study."

notes = copiedNotes;

console.log(addNote("Water the plants", "personal")); // Expected: "Added: note passed all checks.", then true
console.log(addNote("  WATER   THE PLANTS  ", "personal")); // Expected: "Not added: duplicate text.", then false
console.log(addNote("   ", "study")); // Expected: "Not added: text must contain 1–200 characters.", then false
console.log(addNote('a'.repeat(201), "study")); // Expected: "Not added: text must contain 1–200 characters.", then false
console.log(addNote("Book tickets", "movies")); // Expected: "Not added: category must be personal, work or study.", then false
console.log(addNote("a".repeat(200), "study")); // Expected: "Added: note passed all checks.", then true
console.log(addNote("X", "work")); // Expected: "Added: note passed all checks.", then true
console.log(addNote(null, "work")); // Expected: "Not added: text must be a string.", then false

