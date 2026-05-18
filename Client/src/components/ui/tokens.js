export const uiTokens = {
  cssVar: {
    primary: "var(--ag-color-primary-600)",
    success: "var(--ag-color-success-600)",
    warning: "var(--ag-color-warning-600)",
    danger: "var(--ag-color-danger-600)",
    neutral: "var(--ag-color-neutral-700)",
  },
  color: {
    brand: "primary",
    success: "emerald",
    warning: "amber",
    danger: "red",
    info: "blue",
    neutral: "slate",
  },
  radius: {
    control: "rounded-lg",
    card: "rounded-lg",
    overlay: "rounded-xl",
    pill: "rounded-full",
  },
  shadow: {
    card: "shadow-sm",
    overlay: "shadow-2xl",
    focus: "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
  },
  spacing: {
    fieldGap: "space-y-1.5",
    sectionGap: "space-y-4",
    pageGap: "space-y-6",
  },
  zIndex: {
    dropdown: 40,
    sticky: 45,
    overlay: 50,
    toast: 60,
  },
  breakpoint: {
    mobile: "0px",
    tablet: "var(--ag-breakpoint-sm)",
    desktop: "var(--ag-breakpoint-lg)",
    wide: "var(--ag-breakpoint-xl)",
  },
  iconSize: {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
  },
};

export const roleNavigationOrder = {
  vendor: ["Products", "Orders", "Returns", "Finance", "Reports", "Shop", "Marketing", "Support"],
  admin: ["Dashboard", "Queues", "Vendors", "Products", "Orders", "Finance", "Settings", "Ops"],
};
