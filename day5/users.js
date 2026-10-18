const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const status = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let users = [];

function renderUsers(list) {
  usersList.replaceChildren();

  list.forEach((user) => {
    const item = document.createElement("li");
    const name = document.createElement("h2");
    const email = document.createElement("p");
    const city = document.createElement("p");
    const company = document.createElement("p");

    name.textContent = user.name;
    email.textContent = `Email: ${user.email}`;
    city.textContent = `City: ${user.address.city}`;
    company.textContent = `Company: ${user.company.name}`;

    item.append(name, email, city, company);
    usersList.append(item);
  });
}

function filterUsers() {
  const query = filterInput.value.trim().toLowerCase();
  const matches = users.filter((user) =>
    user.name.toLowerCase().includes(query)
  );

  renderUsers(matches);
  status.textContent = matches.length === 0
    ? "No users match your filter."
    : `Loaded ${users.length} users. Showing ${matches.length}.`;
}

async function loadUsers() {
  loadButton.disabled = true;
  filterInput.disabled = true;
  status.textContent = "Loading users...";
  users = [];
  renderUsers(users);

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    users = await response.json();
    filterInput.disabled = false;
    filterUsers();
  } catch (error) {
    status.textContent = `Error loading users: ${error.message} Please try again.`;
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadUsers);
filterInput.addEventListener("input", filterUsers);
