// DevHub dashboard: plain JavaScript, no framework.
// All data is inserted with textContent (never innerHTML), so text from the database cannot run as code (XSS safe).

const today = new Date().toLocaleDateString("en-CA");

async function getJson(path) {
  const response = await fetch(path);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Request failed: ${path}`);
  return body;
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

function pretty(value) {
  return String(value).replaceAll("_", " ");
}

function row(cells) {
  const tr = document.createElement("tr");
  for (const cell of cells) tr.append(cell instanceof Node ? cell : el("td", cell));
  return tr;
}

function emptyRow(columns, message) {
  const td = el("td", message, "empty");
  td.colSpan = columns;
  return row([td]);
}

function renderSummary(summary) {
  const tiles = [
    ["Active projects", summary.activeProjects],
    ["Pending tasks", summary.pendingTasks],
    ["Active applications", summary.activeApplications],
    ["Follow-ups due", summary.followUpsDue],
  ];
  const container = document.getElementById("summary");
  container.replaceChildren(
    ...tiles.map(([label, value]) => {
      const tile = el("div", undefined, "tile");
      tile.append(el("div", value, "value"), el("div", label, "label"));
      return tile;
    })
  );
}

function renderTasks(tasks) {
  const body = document.getElementById("tasks");
  if (tasks.length === 0) {
    body.replaceChildren(emptyRow(6, "No pending tasks. Nice!"));
    return;
  }
  body.replaceChildren(
    ...tasks.map((task) => {
      const overdue = task.dueDate && task.dueDate < today;
      return row([
        task.id,
        task.title,
        task.projectName,
        el("td", task.priority, `priority-${task.priority}`),
        el("td", pretty(task.status), "status"),
        el("td", task.dueDate ? (overdue ? `${task.dueDate} (overdue)` : task.dueDate) : "—", overdue ? "overdue" : ""),
      ]);
    })
  );
}

function renderProjects(projects) {
  const container = document.getElementById("projects");
  if (projects.length === 0) {
    container.replaceChildren(el("p", "No projects yet. Ask Claude to add one.", "muted"));
    return;
  }
  container.replaceChildren(
    ...projects.map((project) => {
      const card = el("article", undefined, "card");
      card.append(el("h3", project.name), el("p", pretty(project.status), "muted"));
      if (project.description) card.append(el("p", project.description));
      if (project.githubUrl && project.githubUrl.startsWith("https://")) {
        const link = el("a", "GitHub");
        link.href = project.githubUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(link);
      }
      const chips = el("div", undefined, "chips");
      chips.append(...project.techStack.map((tech) => el("span", tech, "chip")));
      card.append(chips);
      return card;
    })
  );
}

function renderApplications(applications) {
  const body = document.getElementById("applications");
  if (applications.length === 0) {
    body.replaceChildren(emptyRow(6, "No job applications yet."));
    return;
  }
  body.replaceChildren(
    ...applications.map((application) => {
      const due = application.followUpDate && application.followUpDate <= today;
      return row([
        application.id,
        application.company,
        application.role,
        el("td", pretty(application.status), `status status-${application.status}`),
        application.appliedDate ?? "—",
        el("td", application.followUpDate ?? "—", due ? "overdue" : ""),
      ]);
    })
  );
}

async function load() {
  const error = document.getElementById("error");
  error.hidden = true;
  try {
    const [health, summary, tasks, projects, applications] = await Promise.all([
      getJson("/api/health"),
      getJson("/api/summary"),
      getJson("/api/tasks"),
      getJson("/api/projects"),
      getJson("/api/applications"),
    ]);
    document.getElementById("version").textContent = `v${health.version}`;
    renderSummary(summary);
    renderTasks(tasks);
    renderProjects(projects);
    renderApplications(applications);
  } catch (err) {
    error.textContent = `Could not load DevHub data: ${err.message}`;
    error.hidden = false;
  }
}

document.getElementById("today").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
document.getElementById("refresh").addEventListener("click", load);
load();
