const GROUPS = [
  ["Forside", ["brand", "hero.kicker", "hero.lede", "hero.work", "hero.book", "statement"]],
  ["Fakta", ["fact.base", "fact.workLabel", "fact.work", "fact.archive", "fact.views"]],
  ["Menu", ["nav.work", "nav.services", "nav.about", "nav.contact", "nav.book", "menu", "work.title", "filter.all", "filter.portrait", "filter.family", "filter.nature", "filter.nuuk"]],
  ["Ydelser", ["services.kicker", "services.title", "svc.portrait", "svc.portraitBody", "svc.family", "svc.familyBody", "svc.nature", "svc.natureBody", "svc.business", "svc.businessBody"]],
  ["Forløb", ["step.1", "step.1b", "step.2", "step.2b", "step.3", "step.3b", "step.4", "step.4b"]],
  ["Om", ["about.kicker", "about.title", "about.1", "about.2"]],
  ["Kontakt", ["place", "contact.kicker", "contact.title", "contact.lead", "contact.place", "cap.break", "footer", "footer.archive"]],
  ["Formular", ["form.name", "form.email", "form.phone", "form.service", "form.when", "form.message", "form.send", "opt.choose", "opt.portrait", "opt.family", "opt.nature", "opt.business", "opt.event", "opt.other", "ph.when", "ph.message", "err.required", "err.email", "sent", "mail.subject", "lb.prev", "lb.next", "lb.close"]]
];

const LABELS = {
  brand: "Navn",
  place: "Sted",
  "hero.kicker": "Linje over navnet",
  "hero.lede": "Intro",
  "hero.work": "Knap: se arbejdet",
  "hero.book": "Knap: book",
  statement: "Stor tekst",
  "fact.base": "Fakta: base",
  "fact.workLabel": "Fakta: arbejde, overskrift",
  "fact.work": "Fakta: arbejde",
  "fact.archive": "Fakta: arkiv, overskrift",
  "fact.views": "Fakta: arkiv",
  "work.title": "Galleriets overskrift",
  "cap.break": "Tekst på det brede billede",
  "services.kicker": "Ydelser, lille overskrift",
  "services.title": "Ydelser, overskrift",
  "svc.portrait": "Portræt, titel",
  "svc.portraitBody": "Portræt, tekst",
  "svc.family": "Familie, titel",
  "svc.familyBody": "Familie, tekst",
  "svc.nature": "Landskab, titel",
  "svc.natureBody": "Landskab, tekst",
  "svc.business": "Erhverv, titel",
  "svc.businessBody": "Erhverv, tekst",
  "about.1": "Om, første afsnit",
  "about.2": "Om, andet afsnit",
  "contact.lead": "Kontakttekst",
  "contact.title": "Kontakt, overskrift",
  "mail.subject": "Emne i mailen"
};

const CATS = [
  ["portraet", "Portræt"],
  ["familie", "Familie"],
  ["natur", "Natur"],
  ["nuuk", "Nuuk"]
];

let content = null;

const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const loginNote = document.querySelector("#login-note");
const saveNote = document.querySelector("#save-note");

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Noget gik galt");
  return data;
}

function field(label, value, onInput, multiline) {
  const wrap = document.createElement("label");
  wrap.textContent = label;
  const input = document.createElement(multiline ? "textarea" : "input");
  input.value = value || "";
  input.addEventListener("input", () => onInput(input.value));
  wrap.append(input);
  return wrap;
}

function pairFields(title, value, onChange) {
  const box = document.createElement("div");
  box.className = "pair";
  const make = (label, text) => {
    const wrap = document.createElement("label");
    wrap.append(label);
    const input = document.createElement(String(text).length > 90 ? "textarea" : "input");
    input.value = text || "";
    wrap.append(input);
    return { wrap, input };
  };
  const da = make(`${title} · dansk`, value?.da);
  const en = make(`${title} · engelsk`, value?.en);
  const emit = () => onChange({ da: da.input.value, en: en.input.value });
  da.input.addEventListener("input", emit);
  en.input.addEventListener("input", emit);
  box.append(da.wrap, en.wrap);
  return box;
}

function renderText() {
  const panel = document.querySelector("#panel-text");
  panel.replaceChildren();
  const email = field("E-mail til booking", content.email, (value) => { content.email = value; });
  const pexels = field("Link til Pexels", content.pexels, (value) => { content.pexels = value; });
  const top = document.createElement("div");
  top.className = "group fields";
  top.append(email, pexels);
  panel.append(top);
  for (const [title, keys] of GROUPS) {
    const group = document.createElement("section");
    group.className = "group";
    const heading = document.createElement("h2");
    heading.textContent = title;
    const fields = document.createElement("div");
    fields.className = "fields";
    for (const key of keys) {
      if (!content.text[key]) content.text[key] = { da: "", en: "" };
      fields.append(pairFields(LABELS[key] || key, content.text[key], (value) => { content.text[key] = value; }));
    }
    group.append(heading, fields);
    panel.append(group);
  }
}

function fileButton(label, onFile) {
  const labelEl = document.createElement("label");
  labelEl.className = "file";
  const text = document.createElement("span");
  text.textContent = label;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp";
  input.addEventListener("change", async () => {
    const file = input.files[0];
    input.value = "";
    if (!file) return;
    const data = await fileToBase64(file);
    saveNote.textContent = "Billedet lægges op…";
    try {
      const result = await api("/api/upload", { method: "POST", body: JSON.stringify({ data }) });
      onFile(result.src);
      saveNote.textContent = "Billedet er lagt op. Husk at gemme.";
      renderPhotos();
    } catch (error) {
      saveNote.textContent = error.message;
      saveNote.classList.add("is-error");
    }
  });
  labelEl.append(text, input);
  return labelEl;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Billedet kunne ikke læses"));
    reader.readAsDataURL(file);
  });
}

function slotEditor(title, key) {
  const slot = content[key];
  const box = document.createElement("article");
  box.className = "slot";
  const img = document.createElement("img");
  img.src = `../${slot.src}`;
  img.alt = "";
  const fields = document.createElement("div");
  fields.className = "slot-fields";
  const head = document.createElement("div");
  head.className = "slot-head";
  const heading = document.createElement("h2");
  heading.textContent = title;
  head.append(heading, fileButton("Skift billede", (src) => { slot.src = src; }));
  fields.append(head, pairFields("Billedtekst", slot.alt, (value) => { slot.alt = value; }));
  box.append(img, fields);
  return box;
}

function renderPhotos() {
  const slots = document.querySelector("#slots");
  slots.replaceChildren(
    slotEditor("Forsidebillede", "hero"),
    slotEditor("Bredt billede", "breakImage"),
    slotEditor("Billede ved Om", "aboutImage")
  );
  const list = document.querySelector("#gallery-editor");
  list.replaceChildren();
  content.photos.forEach((photo, index) => {
    const card = document.createElement("article");
    card.className = "card";
    const img = document.createElement("img");
    img.src = `../${photo.src}`;
    img.alt = "";
    const fields = document.createElement("div");
    fields.className = "card-fields";
    const top = document.createElement("div");
    top.className = "card-top";
    const select = document.createElement("select");
    for (const [value, label] of CATS) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = photo.cat === value;
      select.append(option);
    }
    select.addEventListener("change", () => { photo.cat = select.value; });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn ghost";
    remove.textContent = "Fjern";
    remove.addEventListener("click", () => {
      content.photos.splice(index, 1);
      renderPhotos();
    });
    top.append(select, fileButton("Skift", (src) => { photo.src = src; }), remove);
    fields.append(
      top,
      field("Sted", photo.place, (value) => { photo.place = value; }),
      pairFields("Overskrift", photo.caption, (value) => { photo.caption = value; }),
      pairFields("Beskrivelse", photo.alt, (value) => { photo.alt = value; })
    );
    card.append(img, fields);
    list.append(card);
  });
}

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
  renderText();
  renderPhotos();
}

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  loginNote.classList.remove("is-error");
  const data = new FormData(event.currentTarget);
  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username: data.get("username"), password: data.get("password") })
    });
    content = await api("/api/content");
    showApp();
  } catch (error) {
    loginNote.textContent = error.message;
    loginNote.classList.add("is-error");
  }
});

document.querySelector("#logout").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" });
  location.reload();
});

document.querySelectorAll(".tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((item) => item.setAttribute("aria-selected", String(item === button)));
    for (const name of ["text", "photos", "account"]) {
      document.querySelector(`#panel-${name}`).hidden = name !== button.dataset.tab;
    }
  });
});

async function saveContent() {
  saveNote.classList.remove("is-error");
  if (!content.photos.length) throw new Error("Galleriet skal have mindst ét billede.");
  await api("/api/content", { method: "PUT", body: JSON.stringify(content) });
}

document.querySelector("#save").addEventListener("click", async () => {
  saveNote.textContent = "Gemmer…";
  try {
    await saveContent();
    saveNote.textContent = "Gemt. Siden her ved siden af er opdateret. Udgiv, hvis den offentlige side også skal ændres.";
  } catch (error) {
    saveNote.textContent = error.message;
    saveNote.classList.add("is-error");
  }
});

document.querySelector("#publish").addEventListener("click", async () => {
  saveNote.classList.remove("is-error");
  saveNote.textContent = "Gemmer og udgiver…";
  try {
    await saveContent();
    const result = await api("/api/publish", { method: "POST", body: "{}" });
    saveNote.textContent = result.message;
  } catch (error) {
    saveNote.textContent = error.message;
    saveNote.classList.add("is-error");
  }
});

document.querySelector("#add-photo").addEventListener("click", () => {
  content.photos.push({
    src: content.hero.src,
    w: 0,
    h: 0,
    cat: "portraet",
    place: "Nuuk",
    alt: { da: "Nyt billede", en: "New picture" },
    caption: { da: "Nyt billede", en: "New picture" }
  });
  renderPhotos();
});

document.querySelector("#password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const note = document.querySelector("#password-note");
  note.classList.remove("is-error");
  const data = new FormData(event.currentTarget);
  try {
    await api("/api/password", {
      method: "POST",
      body: JSON.stringify({ current: data.get("current"), next: data.get("next") })
    });
    event.currentTarget.reset();
    note.textContent = "Adgangskoden er skiftet.";
  } catch (error) {
    note.textContent = error.message;
    note.classList.add("is-error");
  }
});

api("/api/session").then(async (session) => {
  if (!session.ok) return;
  content = await api("/api/content");
  showApp();
}).catch((error) => {
  loginNote.textContent = error.message.includes("Failed")
    ? "Admin kan kun bruges, når serveren kører. Start den med node server.js."
    : "";
});
