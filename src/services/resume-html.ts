import type { MasterResumeData, TailoredResumeData } from "@/types";
import { getTemplateConfig, type SectionKey, type TemplateConfig } from "@/constants/templates";

type ResumeData = MasterResumeData | TailoredResumeData;

export const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const ORDER: SectionKey[] = [
  "summary",
  "skills",
  "work",
  "projects",
  "extracurriculars",
  "education",
  "certifications",
];

function heading(title: string, cfg: TemplateConfig): string {
  const base = "margin:0;font-weight:700;";
  const style =
    cfg.heading === "plain-bold"
      ? `${base}font-size:13px;`
      : cfg.heading === "caps-plain"
        ? `${base}font-size:11px;letter-spacing:.14em;text-transform:uppercase;`
        : `${base}font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding-bottom:4px;border-bottom:1px solid #111;`;
  return `<h2 style="${style}">${esc(title)}</h2>`;
}

function row(left: string, right: string): string {
  return `<div style="display:flex;justify-content:space-between;gap:12px;"><span>${left}</span><span style="text-align:right;">${right}</span></div>`;
}

function bullets(items: string[]): string {
  if (!items?.length) return "";
  return `<ul style="margin:4px 0 0 18px;padding:0;">${items
    .map((b) => `<li style="margin-bottom:2px;">${esc(b)}</li>`)
    .join("")}</ul>`;
}

function entry(opts: {
  left: string;
  leftSub?: string;
  right: string;
  role?: string;
  location?: string;
  bl: string[];
}): string {
  const leftHtml =
    `<strong>${esc(opts.left)}</strong>` +
    (opts.leftSub ? `<span style="margin-left:8px;text-decoration:underline;font-size:12px;">${esc(opts.leftSub)}</span>` : "");
  const sub =
    opts.role || opts.location
      ? row(opts.role ? `<em>${esc(opts.role)}</em>` : "", opts.location ? `<em>${esc(opts.location)}</em>` : "")
      : "";
  return `<div style="margin-bottom:10px;">${row(leftHtml, `<strong>${esc(opts.right)}</strong>`)}${sub}${bullets(opts.bl)}</div>`;
}

function section(key: SectionKey, d: ResumeData, cfg: TemplateConfig): string {
  let body = "";
  let title = "";
  switch (key) {
    case "summary":
      if (!d.summary) return "";
      title = "Summary";
      body = `<p style="margin:0;">${esc(d.summary)}</p>`;
      break;
    case "skills":
      if (!d.skills?.length) return "";
      title = "Skills";
      body = `<p style="margin:0;">${d.skills.map(esc).join(cfg.columns === 2 ? "<br>" : " · ")}</p>`;
      break;
    case "work":
      if (!d.workExperience?.length) return "";
      title = "Work Experience";
      body = d.workExperience
        .map((w) =>
          entry({
            left: w.company,
            leftSub: w.companyUrl,
            right: `${w.period.start} – ${w.period.end}`,
            role: w.role,
            location: w.location ?? w.locationType,
            bl: w.bullets,
          }),
        )
        .join("");
      break;
    case "projects":
      if (!d.projects?.length) return "";
      title = "Projects";
      body = d.projects
        .map((p) =>
          entry({
            left: p.name,
            leftSub: p.url,
            right: `${p.period.start} – ${p.period.end}`,
            role: p.role,
            location: p.location,
            bl: p.bullets,
          }),
        )
        .join("");
      break;
    case "extracurriculars":
      if (!d.extracurriculars?.length) return "";
      title = "Extracurriculars";
      body = d.extracurriculars
        .map((e) =>
          entry({
            left: e.name,
            right: `${e.period.start} – ${e.period.end}`,
            role: e.role,
            location: e.where,
            bl: e.bullets,
          }),
        )
        .join("");
      break;
    case "education":
      if (!d.education?.length) return "";
      title = "Education";
      body = d.education
        .map(
          (ed) =>
            `<div style="margin-bottom:8px;">${row(`<strong>${esc(ed.institution)}</strong>`, `<strong>${esc(`${ed.period.start} – ${ed.period.end}`)}</strong>`)}${row(`<em>${esc(ed.course)}</em>`, ed.gpa ? `<em>GPA ${esc(ed.gpa)}</em>` : "")}</div>`,
        )
        .join("");
      break;
    case "certifications":
      if (!d.certifications?.length) return "";
      title = "Certifications";
      body = d.certifications
        .map(
          (c) =>
            `<div style="margin-bottom:8px;">${row(`<strong>${esc(c.name)}</strong>`, c.awardedDate ? `<strong>${esc(c.awardedDate)}</strong>` : "")}<p style="margin:2px 0 0;">${esc(c.details)}</p></div>`,
        )
        .join("");
      break;
  }
  const gap = cfg.density === "compact" ? 12 : cfg.density === "airy" ? 24 : 18;
  return `<section style="margin-top:${gap}px;">${heading(title, cfg)}<div style="margin-top:8px;">${body}</div></section>`;
}

/** Full, print-ready HTML document for a resume in the chosen template. */
export function resumeHtml(data: ResumeData, templateId: string): string {
  const cfg = getTemplateConfig(templateId);
  const fontFamily =
    cfg.font === "serif"
      ? 'Georgia, "Times New Roman", serif'
      : "Helvetica, Arial, sans-serif";
  const base = cfg.density === "compact" ? 12 : cfg.density === "airy" ? 13.5 : 13;
  const lh = cfg.density === "compact" ? 1.32 : cfg.density === "airy" ? 1.6 : 1.45;
  const h = data.header;
  const contact = [h.email, h.phone, h.github, h.linkedin, h.website].filter(Boolean) as string[];

  const header = `<header style="text-align:${cfg.nameAlign};margin-bottom:${cfg.density === "airy" ? 24 : 16}px;">
    <h1 style="margin:0;font-size:${cfg.nameSize}px;font-weight:700;letter-spacing:${cfg.nameUppercase ? ".08em" : "-.01em"};text-transform:${cfg.nameUppercase ? "uppercase" : "none"};">${esc(h.name)}</h1>
    ${h.location ? `<div style="margin-top:4px;font-size:12px;">${esc(h.location)}</div>` : ""}
    <div style="margin-top:4px;font-size:12px;">${contact.map((c) => `<span style="text-decoration:underline;">${esc(c)}</span>`).join('<span style="margin:0 6px;">|</span>')}</div>
  </header>`;

  let bodyHtml: string;
  if (cfg.columns === 2 && cfg.sidebar) {
    const side = cfg.sidebar;
    const main = ORDER.filter((k) => !side.includes(k));
    bodyHtml = `<div style="display:flex;gap:28px;">
      <aside style="width:33%;flex-shrink:0;">${side.map((k) => section(k, data, cfg)).join("")}</aside>
      <div style="flex:1;min-width:0;">${main.map((k) => section(k, data, cfg)).join("")}</div>
    </div>`;
  } else {
    bodyHtml = ORDER.map((k) => section(k, data, cfg)).join("");
  }

  const pad = cfg.density === "compact" ? "40px 48px" : cfg.density === "airy" ? "60px 64px" : "48px 56px";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;} body{margin:0;}
    @page{size:A4;margin:0;}
    .doc{background:#fff;color:#111;font-family:${fontFamily};padding:${pad};line-height:${lh};font-size:${base}px;}
    ul{list-style:disc;} li{margin:0;}
  </style></head><body><div class="doc">${header}${bodyHtml}</div></body></html>`;
}

/** Minimal cover-letter HTML (matches the resume's professional serif). */
export function coverHtml(cl: { greeting: string; body: string; closing: string; signature: string }): string {
  const paras = cl.body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px;">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:0;} body{margin:0;}
    .doc{background:#fff;color:#111;font-family:Georgia,"Times New Roman",serif;padding:56px 64px;line-height:1.55;font-size:14px;}
  </style></head><body><div class="doc">
    <p style="margin:0 0 16px;">${esc(cl.greeting)}</p>${paras}
    <p style="margin:12px 0 4px;">${esc(cl.closing)}</p><p style="margin:0;">${esc(cl.signature)}</p>
  </div></body></html>`;
}

/** Tiny Markdown → HTML for the interview brief (headings, lists, bold, paragraphs). */
export function markdownHtml(md: string): string {
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  for (const line of lines) {
    const l = line.trim();
    if (/^#\s/.test(l)) {
      closeList();
      html += `<h1 style="font-size:22px;margin:0 0 8px;">${inline(l.slice(2))}</h1>`;
    } else if (/^##\s/.test(l)) {
      closeList();
      html += `<h2 style="font-size:17px;margin:20px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px;">${inline(l.slice(3))}</h2>`;
    } else if (/^###\s/.test(l)) {
      closeList();
      html += `<h3 style="font-size:14px;margin:14px 0 6px;">${inline(l.slice(4))}</h3>`;
    } else if (/^[-*]\s/.test(l)) {
      if (!inList) {
        html += '<ul style="margin:0 0 10px;padding-left:22px;">';
        inList = true;
      }
      html += `<li style="margin-bottom:4px;">${inline(l.slice(2))}</li>`;
    } else if (l === "") {
      closeList();
    } else {
      closeList();
      html += `<p style="margin:0 0 10px;">${inline(l)}</p>`;
    }
  }
  closeList();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:0;} body{margin:0;}
    .doc{background:#fff;color:#111;font-family:Georgia,"Times New Roman",serif;padding:48px 56px;line-height:1.6;font-size:13px;}
  </style></head><body><div class="doc">${html}</div></body></html>`;
}
