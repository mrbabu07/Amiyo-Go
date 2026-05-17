import { PageHeader as SharedPageHeader } from "./ui";

export default function PageHeader({
  title,
  subtitle,
  showBack = true,
  children,
  className = "",
}) {
  return (
    <SharedPageHeader
      title={title}
      subtitle={subtitle}
      showBack={showBack}
      actions={children}
      className={className}
    />
  );
}
