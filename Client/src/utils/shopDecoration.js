export const shopThemeOptions = [
  {
    label: "Amiyo Blue",
    value: "blue",
    gradient: "from-primary-800 via-primary-600 to-sky-500",
    chip: "bg-primary-500",
    soft: "border-primary-100 bg-primary-50 text-primary-800",
    button: "bg-primary-600 text-white hover:bg-primary-700",
    text: "text-primary-700",
  },
  {
    label: "Fresh Green",
    value: "green",
    gradient: "from-emerald-700 via-teal-600 to-primary-500",
    chip: "bg-emerald-500",
    soft: "border-emerald-100 bg-emerald-50 text-emerald-800",
    button: "bg-emerald-600 text-white hover:bg-emerald-700",
    text: "text-emerald-700",
  },
  {
    label: "Trust Indigo",
    value: "indigo",
    gradient: "from-indigo-800 via-primary-700 to-sky-500",
    chip: "bg-indigo-500",
    soft: "border-indigo-100 bg-indigo-50 text-indigo-800",
    button: "bg-indigo-600 text-white hover:bg-indigo-700",
    text: "text-indigo-700",
  },
  {
    label: "Festival Rose",
    value: "rose",
    gradient: "from-rose-700 via-fuchsia-600 to-primary-500",
    chip: "bg-rose-500",
    soft: "border-rose-100 bg-rose-50 text-rose-800",
    button: "bg-rose-600 text-white hover:bg-rose-700",
    text: "text-rose-700",
  },
  {
    label: "Premium Slate",
    value: "slate",
    gradient: "from-slate-950 via-slate-800 to-primary-700",
    chip: "bg-slate-700",
    soft: "border-slate-200 bg-slate-50 text-slate-800",
    button: "bg-slate-900 text-white hover:bg-slate-800",
    text: "text-slate-700",
  },
  {
    label: "Legacy Warmth",
    value: "orange",
    gradient: "from-primary-700 via-cyan-600 to-emerald-500",
    chip: "bg-primary-500",
    soft: "border-primary-100 bg-primary-50 text-primary-800",
    button: "bg-primary-600 text-white hover:bg-primary-700",
    text: "text-primary-700",
  },
];

export const defaultShopTheme = "blue";

export const themeFor = (value) =>
  shopThemeOptions.find((theme) => theme.value === value) ||
  shopThemeOptions.find((theme) => theme.value === defaultShopTheme) ||
  shopThemeOptions[0];

export const isCampaignDecorationActive = (campaign, now = new Date()) => {
  if (!campaign?.enabled) return false;
  const startsAt = campaign.startDate ? new Date(campaign.startDate) : null;
  const endsAt = campaign.endDate ? new Date(campaign.endDate) : null;
  if (startsAt && !Number.isNaN(startsAt.getTime()) && now < startsAt) return false;
  if (endsAt && !Number.isNaN(endsAt.getTime()) && now > endsAt) return false;
  return true;
};
