import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  GraduationCap,
  Languages,
  ShieldCheck,
  Store,
  UserRound,
  UsersRound,
} from "lucide-react";
import { universityQuickGuides, universityRoles } from "../data/amiyoUniversity";

const roleIcons = {
  customer: UserRound,
  vendor: Store,
  admin: ShieldCheck,
};

const modeLabels = [
  { id: "both", label: "EN + বাংলা" },
  { id: "en", label: "English" },
  { id: "bn", label: "বাংলা" },
];

function textOf(value, mode) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[mode] || value.en || value.bn || "";
}

function BilingualText({ value, mode, as: Component = "p", className = "", bnClassName = "" }) {
  if (mode === "both" && value?.en && value?.bn) {
    return (
      <div className={className}>
        <Component>{value.en}</Component>
        <Component className={bnClassName || "mt-1 text-slate-600 dark:text-slate-300"}>{value.bn}</Component>
      </div>
    );
  }

  return <Component className={className}>{textOf(value, mode)}</Component>;
}

function RoleTab({ role, active, mode, onClick }) {
  const Icon = roleIcons[role.id] || GraduationCap;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
        active
          ? "border-[#1e7098] bg-[#eef8fb] text-[#12516f] shadow-sm dark:border-primary-500 dark:bg-primary-950/40 dark:text-primary-100"
          : "border-slate-200 bg-white text-slate-700 hover:border-[#1e7098]/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-primary-700"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          active ? "bg-[#1e7098] text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black">{textOf(role.label, mode === "both" ? "en" : mode)}</span>
        {mode === "both" ? (
          <span className="mt-0.5 block text-xs font-bold text-slate-500 dark:text-slate-400">{role.label.bn}</span>
        ) : null}
      </span>
    </button>
  );
}

function LessonCard({ module, mode, index }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e7098] text-sm font-black text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <BilingualText
            value={module.title}
            mode={mode}
            as="h2"
            className="text-lg font-black text-slate-950 dark:text-white"
            bnClassName="mt-1 text-base font-black text-slate-700 dark:text-slate-200"
          />
          <BilingualText
            value={module.summary}
            mode={mode}
            className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300"
            bnClassName="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
          />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {module.steps.map((step, stepIndex) => (
          <div key={`${module.id}-${stepIndex}`} className="flex gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-950/60">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <BilingualText
              value={step}
              mode={mode}
              className="text-sm leading-6 text-slate-700 dark:text-slate-200"
              bnClassName="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
            />
          </div>
        ))}
      </div>

      {module.links?.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {module.links.map((link) => (
            <Link
              key={`${module.id}-${link.path}`}
              to={link.path}
              className="inline-flex items-center gap-2 rounded-lg border border-[#1e7098]/20 bg-[#eef8fb] px-3 py-2 text-sm font-bold text-[#12516f] transition hover:border-[#1e7098] hover:bg-[#dff3f8] dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-100"
            >
              {textOf(link.label, mode === "both" ? "en" : mode)}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function University() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get("role");
  const [activeRoleId, setActiveRoleId] = useState(
    universityRoles.some((role) => role.id === initialRole) ? initialRole : "customer",
  );
  const [mode, setMode] = useState("both");

  useEffect(() => {
    if (searchParams.get("role") !== activeRoleId) {
      setSearchParams({ role: activeRoleId }, { replace: true });
    }
  }, [activeRoleId, searchParams, setSearchParams]);

  const activeRole = useMemo(
    () => universityRoles.find((role) => role.id === activeRoleId) || universityRoles[0],
    [activeRoleId],
  );

  const ActiveIcon = roleIcons[activeRole.id] || GraduationCap;

  return (
    <div className="bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1e7098]/20 bg-[#eef8fb] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#12516f] dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-100">
              <GraduationCap className="h-4 w-4" />
              Amiyo-Go University
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
              Marketplace learning center for every role
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Customer, seller, and admin workflows explained in English and Bangla, with direct links to the exact pages where each action happens.
            </p>
            <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              কাস্টমার, সেলার ও অ্যাডমিন ওয়ার্কফ্লো ইংরেজি ও বাংলায় শেখার জায়গা, যেখানে প্রতিটি কাজের জন্য সরাসরি পেজ লিংক আছে।
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={activeRole.cta.path}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1e7098] px-5 py-3 text-sm font-black text-white transition hover:bg-[#155b7c]"
              >
                {textOf(activeRole.cta.label, mode === "bn" ? "bn" : "en")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#lessons"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-[#1e7098]/40 hover:text-[#12516f] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                View lessons
              </a>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1e7098] text-white">
                <UsersRound className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">Choose learning mode</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">আপনার পছন্দের ভাষা বেছে নিন</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg bg-white p-1 dark:bg-slate-900">
              {modeLabels.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`rounded-md px-3 py-2 text-xs font-black transition ${
                    mode === item.id
                      ? "bg-[#1e7098] text-white"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {universityQuickGuides.map((guide) => (
                <div key={guide.title.en} className="rounded-lg bg-white p-4 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                    <BookOpenCheck className="h-4 w-4 text-[#1e7098]" />
                    {textOf(guide.title, mode === "both" ? "en" : mode)}
                  </div>
                  <BilingualText
                    value={guide.body}
                    mode={mode}
                    className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300"
                    bnClassName="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-3 md:grid-cols-3">
            {universityRoles.map((role) => (
              <RoleTab
                key={role.id}
                role={role}
                active={role.id === activeRole.id}
                mode={mode}
                onClick={() => setActiveRoleId(role.id)}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="lessons" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1e7098] text-white">
              <ActiveIcon className="h-6 w-6" />
            </span>
            <div>
              <BilingualText
                value={activeRole.title}
                mode={mode}
                as="h2"
                className="text-2xl font-black text-slate-950 dark:text-white"
                bnClassName="mt-1 text-xl font-black text-slate-700 dark:text-slate-200"
              />
              <BilingualText
                value={activeRole.description}
                mode={mode}
                className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300"
                bnClassName="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300"
              />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Languages className="h-4 w-4" />
            {modeLabels.find((item) => item.id === mode)?.label}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {activeRole.modules.map((module, index) => (
            <LessonCard key={module.id} module={module} mode={mode} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}
