import { forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, Search, X } from "lucide-react";
import { cn, isOptionSelected, normalizeSelectOptions } from "./utils";

export function FormField({
  id,
  label,
  helperText,
  error,
  required = false,
  children,
  className = "",
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="block text-sm font-bold text-slate-800 dark:text-slate-100">
          {label}
          {required ? <span className="ml-1 text-red-600">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-sm font-medium text-red-600 dark:text-red-300">{error}</p>
      ) : helperText ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}

const controlClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-primary-900/40";

export const Input = forwardRef(
  (
    {
      id,
      label,
      helperText,
      error,
      prefix,
      suffix,
      clearable = false,
      required = false,
      type = "text",
      value,
      onChange,
      onClear,
      className = "",
      containerClassName = "",
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const hasValue = value !== undefined && String(value).length > 0;

    const handleClear = () => {
      onClear?.();
      onChange?.({ target: { value: "", name: props.name } });
    };

    return (
      <FormField
        id={inputId}
        label={label}
        helperText={helperText}
        error={error}
        required={required}
        className={containerClassName}
      >
        <div className="relative">
          {prefix ? (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              {prefix}
            </div>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            type={isPassword ? (showPassword ? "text" : "password") : type}
            value={value}
            onChange={onChange}
            aria-invalid={Boolean(error)}
            className={cn(
              controlClass,
              prefix && "pl-10",
              (suffix || clearable || isPassword) && "pr-10",
              error && "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-800",
              className,
            )}
            {...props}
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            {clearable && hasValue ? (
              <button
                type="button"
                aria-label="Clear input"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            {isPassword ? (
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            ) : suffix ? (
              <span className="px-1 text-slate-400">{suffix}</span>
            ) : null}
          </div>
        </div>
      </FormField>
    );
  },
);

Input.displayName = "Input";

export const Textarea = forwardRef(
  (
    {
      id,
      label,
      helperText,
      error,
      required = false,
      value = "",
      maxLength,
      resizable = true,
      rows = 4,
      className = "",
      containerClassName = "",
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const count = String(value || "").length;

    return (
      <FormField
        id={textareaId}
        label={label}
        helperText={helperText}
        error={error}
        required={required}
        className={containerClassName}
      >
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          value={value}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          className={cn(
            controlClass,
            "min-h-28 py-3",
            resizable ? "resize-y" : "resize-none",
            error && "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-800",
            className,
          )}
          {...props}
        />
        {maxLength ? (
          <div className="text-right text-xs font-medium text-slate-500 dark:text-slate-400">
            {count}/{maxLength}
          </div>
        ) : null}
      </FormField>
    );
  },
);

Textarea.displayName = "Textarea";

export const Checkbox = forwardRef(
  (
    {
      label,
      helperText,
      error,
      indeterminate = false,
      className = "",
      inputClassName = "",
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef(null);

    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const setRefs = (node) => {
      internalRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    return (
      <label className={cn("flex items-start gap-3 text-sm", className)}>
        <input
          ref={setRefs}
          type="checkbox"
          aria-invalid={Boolean(error)}
          className={cn(
            "mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-950",
            inputClassName,
          )}
          {...props}
        />
        <span className="min-w-0">
          {label ? <span className="block font-semibold text-slate-800 dark:text-slate-100">{label}</span> : null}
          {error ? (
            <span className="block text-sm font-medium text-red-600 dark:text-red-300">{error}</span>
          ) : helperText ? (
            <span className="block text-sm text-slate-500 dark:text-slate-400">{helperText}</span>
          ) : null}
        </span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";

export function CheckboxGroup({ legend, options = [], value = [], onChange, className = "" }) {
  const toggleValue = (optionValue) => {
    const nextValue = value.includes(optionValue)
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue];
    onChange?.(nextValue);
  };

  return (
    <fieldset className={cn("space-y-3", className)}>
      {legend ? <legend className="text-sm font-bold text-slate-800 dark:text-slate-100">{legend}</legend> : null}
      {options.map((option) => (
        <Checkbox
          key={option.value}
          label={option.label}
          helperText={option.description}
          checked={value.includes(option.value)}
          onChange={() => toggleValue(option.value)}
          disabled={option.disabled}
        />
      ))}
    </fieldset>
  );
}

export function RadioGroup({
  legend,
  options = [],
  value,
  onChange,
  orientation = "vertical",
  variant = "default",
  className = "",
}) {
  return (
    <fieldset className={cn("space-y-3", className)}>
      {legend ? <legend className="text-sm font-bold text-slate-800 dark:text-slate-100">{legend}</legend> : null}
      <div className={cn(orientation === "horizontal" ? "flex flex-wrap gap-3" : "space-y-2")}>
        {options.map((option) => {
          const checked = option.value === value;
          const content = (
            <>
              <input
                type="radio"
                className="h-4 w-4 border-slate-300 text-primary-600 focus:ring-primary-500"
                checked={checked}
                onChange={() => onChange?.(option.value, option)}
                disabled={option.disabled}
              />
              <span className="min-w-0">
                <span className="block font-bold text-slate-800 dark:text-slate-100">{option.label}</span>
                {option.description ? (
                  <span className="block text-sm text-slate-500 dark:text-slate-400">{option.description}</span>
                ) : null}
              </span>
            </>
          );

          if (variant === "card") {
            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 shadow-sm transition dark:bg-slate-950",
                  checked
                    ? "border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/40"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800",
                  option.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {content}
              </label>
            );
          }

          return (
            <label key={option.value} className={cn("flex cursor-pointer items-start gap-3", option.disabled && "cursor-not-allowed opacity-50")}>
              {content}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export const Switch = forwardRef(
  ({ label, helperText, checked = false, onChange, className = "", ...props }, ref) => (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", className)}>
      <span className="min-w-0">
        {label ? <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{label}</span> : null}
        {helperText ? <span className="block text-sm text-slate-500 dark:text-slate-400">{helperText}</span> : null}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange?.(event.target.checked, event)}
          className="peer sr-only"
          {...props}
        />
        <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 dark:bg-slate-700" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  ),
);

Switch.displayName = "Switch";

export function Select({
  id,
  label,
  helperText,
  error,
  required = false,
  options = [],
  value,
  defaultValue,
  onChange,
  placeholder = "Select option",
  multiple = false,
  searchable = false,
  renderOption,
  className = "",
  containerClassName = "",
  disabled = false,
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const rootRef = useRef(null);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? (multiple ? [] : ""));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedValue = isControlled ? value : internalValue;
  const flatOptions = useMemo(() => normalizeSelectOptions(options), [options]);

  const filteredOptions = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    if (!loweredQuery) return flatOptions;

    return flatOptions.filter((option) =>
      `${option.label} ${option.value} ${option.group || ""}`.toLowerCase().includes(loweredQuery),
    );
  }, [flatOptions, query]);

  const selectedOptions = flatOptions.filter((option) =>
    isOptionSelected(option.value, selectedValue, multiple),
  );

  const groupedOptions = filteredOptions.reduce((groups, option) => {
    const groupName = option.group || "";
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(option);
    return groups;
  }, {});

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const updateValue = (nextValue, option) => {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue, option);
  };

  const selectOption = (option) => {
    if (option.disabled) return;

    if (multiple) {
      const current = Array.isArray(selectedValue) ? selectedValue : [];
      const nextValue = current.includes(option.value)
        ? current.filter((item) => item !== option.value)
        : [...current, option.value];
      updateValue(nextValue, option);
      return;
    }

    updateValue(option.value, option);
    setOpen(false);
  };

  const displayValue = selectedOptions.length
    ? selectedOptions.map((option) => option.label).join(", ")
    : placeholder;

  return (
    <FormField
      id={selectId}
      label={label}
      helperText={helperText}
      error={error}
      required={required}
      className={containerClassName}
    >
      <div ref={rootRef} className="relative">
        <button
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={Boolean(error)}
          className={cn(
            controlClass,
            "flex items-center justify-between gap-2 text-left",
            !selectedOptions.length && "text-slate-400",
            error && "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-800",
            className,
          )}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition", open && "rotate-180")} />
        </button>

        {open ? (
          <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
            {searchable ? (
              <div className="border-b border-slate-200 p-2 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search..."
                    className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            ) : null}
            <div role="listbox" aria-multiselectable={multiple} className="max-h-72 overflow-y-auto p-1">
              {filteredOptions.length ? (
                Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                  <div key={groupName || "default"}>
                    {groupName ? (
                      <div className="px-3 py-2 text-xs font-extrabold uppercase text-slate-400">
                        {groupName}
                      </div>
                    ) : null}
                    {groupOptions.map((option) => {
                      const selected = isOptionSelected(option.value, selectedValue, multiple);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          disabled={option.disabled}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition",
                            selected
                              ? "bg-primary-50 font-bold text-primary-700 dark:bg-primary-950/40 dark:text-primary-200"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900",
                            option.disabled && "cursor-not-allowed opacity-50",
                          )}
                          onClick={() => selectOption(option)}
                        >
                          <span className="min-w-0">
                            {renderOption ? renderOption(option, { selected }) : option.label}
                            {option.description ? (
                              <span className="block text-xs font-normal text-slate-500">{option.description}</span>
                            ) : null}
                          </span>
                          {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-sm text-slate-500">No options found</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </FormField>
  );
}

export function FormSection({ title, description, children, action, className = "" }) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
