const en = {
  "nav.work": "Work",
  "nav.services": "Services",
  "nav.about": "About",
  "nav.contact": "Contact",
  "nav.book": "Book",
  "menu": "Menu",
  "hero.kicker": "Photographer in Nuuk",
  "hero.lede": "Landscape, portrait and family. I work in Greenland, based in Nuuk.",
  "hero.work": "See the work",
  "hero.book": "Book a session",
  "statement": "I photograph people and places in Greenland. Sessions are unhurried, the agreement is clear, and you leave with pictures that are ready to use.",
  "fact.base": "Base",
  "fact.workLabel": "Work",
  "fact.work": "Portrait to landscape",
  "fact.archive": "Archive",
  "fact.views": "Seen over 7 million times",
  "work.title": "Selected work",
  "filter.all": "All",
  "filter.portrait": "Portrait",
  "filter.family": "Family",
  "filter.nature": "Nature",
  "filter.nuuk": "Nuuk",
  "cap.winter": "Winter portrait",
  "cap.eagles": "Two white-tailed eagles",
  "cap.scarf": "Portrait",
  "cap.coast": "The coast",
  "cap.father": "Father and child",
  "cap.sea": "Over the sea",
  "cap.evening": "Evening light",
  "cap.street": "Winter street",
  "cap.mother": "Mother and child",
  "cap.close": "Close study",
  "cap.home": "At home",
  "cap.run": "In motion",
  "cap.bw": "Black and white",
  "cap.bird": "Snow bunting",
  "cap.cafe": "In the café",
  "cap.ice": "On the ice",
  "cap.face": "Portrait",
  "cap.raven": "Raven",
  "cap.summer": "Summer light",
  "cap.blue": "Blue hour",
  "cap.break": "White-tailed eagle over the water. Nuuk.",
  "services.kicker": "For clients",
  "services.title": "What I photograph",
  "svc.portrait": "Portrait",
  "svc.portraitBody": "Individuals, couples and pictures for work. We find a quiet place in Nuuk, and you get photographs that look like you.",
  "svc.family": "Family",
  "svc.familyBody": "At home, outside, or with a newborn. I work quietly, so the moment can stay as it is.",
  "svc.nature": "Landscape and nature",
  "svc.natureBody": "Coast, mountains, birds and the light of the season. For print, for yourself, or for a commission.",
  "svc.business": "Business",
  "svc.businessBody": "Portraits, workplaces and small events for companies in Nuuk. A clear brief, and files ready to publish.",
  "step.1": "Write",
  "step.1b": "Tell me what you need, and roughly when.",
  "step.2": "Plan",
  "step.2b": "We choose place, light and how long we need.",
  "step.3": "Session",
  "step.3b": "A calm pace. No more direction than the picture needs.",
  "step.4": "Delivery",
  "step.4b": "An edited set, ready for print and sharing.",
  "about.kicker": "The photographer",
  "about.title": "Based in Nuuk",
  "about.1": "My name is Peter Platou. I live in Nuuk and photograph what is close: people, families, white-tailed eagles and the coast.",
  "about.2": "The pictures on this page are a selection. The same eye is what I bring to a commission. Price follows the time, the place and what the pictures are for.",
  "contact.kicker": "Booking",
  "contact.title": "Write to me",
  "contact.lead": "For a session, a print, or a picture you want to license. The form opens in your email, so the message comes straight from you.",
  "contact.place": "Sessions by arrangement",
  "form.name": "Name",
  "form.email": "Email",
  "form.phone": "Phone, optional",
  "form.service": "What do you need?",
  "form.when": "When, optional",
  "form.message": "Message",
  "form.send": "Send inquiry",
  "opt.choose": "Choose",
  "opt.portrait": "Portrait",
  "opt.family": "Family",
  "opt.nature": "Landscape / nature",
  "opt.business": "Business",
  "opt.event": "Event",
  "opt.other": "Something else",
  "ph.when": "A period or a date",
  "ph.message": "Place, how many people, and what the pictures should be used for.",
  "err.required": "Please add your name, email and a short message.",
  "err.email": "The email address looks incomplete.",
  "sent": "Your email app should open with the message. Send it, and I will reply.",
  "lb.close": "Close",
  "lb.prev": "Previous",
  "lb.next": "Next",
  "footer": "Photographer in Nuuk, Greenland",
  "footer.archive": "Archive on Pexels"
};

const daMail = {
  subject: "Forespørgsel til Peter Platou",
  sent: "Din mail åbner med beskeden. Send den, så vender jeg tilbage."
};

const enMail = {
  subject: "Inquiry for Peter Platou"
};

const header = document.querySelector(".site-header");
const menuBtn = document.querySelector(".menu-btn");
const nav = document.querySelector(".nav");
const filters = document.querySelector(".filters");
const figures = [...document.querySelectorAll(".gallery figure")];
const dialog = document.querySelector("#lightbox");
const lbImg = dialog.querySelector("img");
const lbCap = dialog.querySelector(".lb-cap");
const form = document.querySelector("#book");
const note = document.querySelector(".form-note");
let lang = localStorage.getItem("pp-lang") === "en" ? "en" : "da";
let active = [];
let index = 0;

function applyLang(next) {
  lang = next;
  localStorage.setItem("pp-lang", lang);
  document.documentElement.lang = lang === "en" ? "en" : "da";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    if (!el.dataset.da) el.dataset.da = el.textContent.trim();
    const key = el.dataset.i18n;
    el.textContent = lang === "en" ? en[key] || el.dataset.da : el.dataset.da;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    if (!el.dataset.daPlaceholder) el.dataset.daPlaceholder = el.placeholder;
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = lang === "en" ? en[key] || el.dataset.daPlaceholder : el.dataset.daPlaceholder;
  });
  document.querySelectorAll(".lang button").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
  });
  if (dialog.open) show(index);
}

function onScroll() {
  header.classList.toggle("is-solid", window.scrollY > window.innerHeight * 0.72);
}

document.querySelectorAll(".lang button").forEach((btn) => {
  btn.addEventListener("click", () => applyLang(btn.dataset.lang));
});

menuBtn.addEventListener("click", () => {
  const open = header.classList.toggle("is-open");
  menuBtn.setAttribute("aria-expanded", String(open));
});

nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    header.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
  }
});

filters.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  filters.querySelectorAll("button").forEach((item) => {
    item.setAttribute("aria-pressed", String(item === btn));
  });
  const cat = btn.dataset.filter;
  figures.forEach((figure) => {
    figure.hidden = cat !== "alle" && figure.dataset.cat !== cat;
  });
});

function current() {
  return figures.filter((figure) => !figure.hidden);
}

function show(nextIndex) {
  active = current();
  if (!active.length) return;
  index = (nextIndex + active.length) % active.length;
  const img = active[index].querySelector("img");
  const cap = active[index].querySelector("figcaption");
  lbImg.src = img.src;
  lbImg.alt = img.alt;
  lbCap.textContent = cap.innerText.replace(/\s+/g, " ").trim();
  document.body.classList.add("is-lightbox");
  if (!dialog.open) dialog.showModal();
}

dialog.addEventListener("close", () => {
  document.body.classList.remove("is-lightbox");
});

document.querySelector(".gallery").addEventListener("click", (event) => {
  const shot = event.target.closest(".shot");
  if (!shot) return;
  active = current();
  const figure = shot.closest("figure");
  show(active.indexOf(figure));
});

dialog.querySelector(".lb-close").addEventListener("click", () => dialog.close());
dialog.querySelector("[data-dir='-1']").addEventListener("click", () => show(index - 1));
dialog.querySelector("[data-dir='1']").addEventListener("click", () => show(index + 1));

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  dialog.close();
});

document.addEventListener("keydown", (event) => {
  if (!dialog.open) return;
  if (event.key === "ArrowRight") show(index + 1);
  if (event.key === "ArrowLeft") show(index - 1);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const email = String(data.get("email") || "").trim();
  const phone = String(data.get("phone") || "").trim();
  const service = String(data.get("service") || "").trim();
  const when = String(data.get("when") || "").trim();
  const message = String(data.get("message") || "").trim();
  note.classList.remove("is-error");

  if (!name || !email || !message) {
    note.textContent = lang === "en" ? en["err.required"] : "Skriv navn, e-mail og en kort besked.";
    note.classList.add("is-error");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    note.textContent = lang === "en" ? en["err.email"] : "E-mailadressen ser ufuldstændig ud.";
    note.classList.add("is-error");
    return;
  }

  const to = document.querySelector("#contact-email").href.replace("mailto:", "");
  const subject = lang === "en" ? enMail.subject : daMail.subject;
  const body = [
    lang === "en" ? `Name: ${name}` : `Navn: ${name}`,
    `Email: ${email}`,
    lang === "en" ? `Phone: ${phone || "—"}` : `Telefon: ${phone || "—"}`,
    lang === "en" ? `Service: ${service || "—"}` : `Ydelse: ${service || "—"}`,
    lang === "en" ? `When: ${when || "—"}` : `Hvornår: ${when || "—"}`,
    "",
    message
  ].join("\n");

  note.textContent = lang === "en" ? en.sent : daMail.sent;
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
applyLang(lang);
