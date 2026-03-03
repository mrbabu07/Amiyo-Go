import BackButton from "./BackButton";

export default function PageHeader({
  title,
  subtitle,
  showBack = true,
  children,
  className = "",
}) {
  return (
    <div className={`mb-8 ${className}`}>
      {showBack && (
        <div className="mb-4">
          <BackButton />
        </div>
      )}

      <div className="text-center">
        {title && (
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
