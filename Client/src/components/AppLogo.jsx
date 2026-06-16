const sizeClasses = {
  sm: {
    mark: "h-8 w-8 rounded-lg",
    text: "text-lg",
  },
  md: {
    mark: "h-10 w-10 rounded-xl",
    text: "text-2xl",
  },
  lg: {
    mark: "h-12 w-12 rounded-2xl",
    text: "text-3xl",
  },
};

export default function AppLogo({
  size = "md",
  showText = true,
  inverse = false,
  className = "",
  textClassName = "",
}) {
  const classes = sizeClasses[size] || sizeClasses.md;

  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      <span
        className={`grid shrink-0 place-items-center overflow-hidden bg-white shadow-sm ring-1 ring-black/5 ${classes.mark}`}
      >
        <img
          src="/icons/amiyo-go-icon.svg"
          alt=""
          className="h-full w-full object-cover"
          draggable="false"
        />
      </span>
      {showText ? (
        <span
          className={`truncate font-black tracking-normal ${
            inverse ? "text-white" : "text-gray-950 dark:text-white"
          } ${classes.text} ${textClassName}`}
        >
          Amiyo-Go
        </span>
      ) : null}
    </span>
  );
}
