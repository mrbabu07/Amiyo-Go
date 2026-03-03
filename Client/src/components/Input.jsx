import { forwardRef, useState } from "react";
import { motion } from "framer-motion";

const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      type = "text",
      className = "",
      containerClassName = "",
      required = false,
      ...props
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const inputClasses = `
    w-full px-4 py-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none
    ${leftIcon ? "pl-12" : ""}
    ${rightIcon || type === "password" ? "pr-12" : ""}
    ${
      error
        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
        : focused
          ? "border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
          : "border-gray-200 hover:border-gray-300"
    }
    ${className}
  `.trim();

    const EyeIcon = ({ show }) => (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {show ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
          />
        )}
      </svg>
    );

    return (
      <div className={containerClassName}>
        {label && (
          <motion.label
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </motion.label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={
              type === "password" ? (showPassword ? "text" : "password") : type
            }
            className={inputClasses}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />

          {(rightIcon || type === "password") && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              {type === "password" ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <EyeIcon show={!showPassword} />
                </button>
              ) : (
                <div className="text-gray-400">{rightIcon}</div>
              )}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2"
          >
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </p>
            )}
            {helperText && !error && (
              <p className="text-sm text-gray-500">{helperText}</p>
            )}
          </motion.div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

// Textarea Component
export const Textarea = forwardRef(
  (
    {
      label,
      error,
      helperText,
      className = "",
      containerClassName = "",
      required = false,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);

    const textareaClasses = `
    w-full px-4 py-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none resize-none
    ${
      error
        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
        : focused
          ? "border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
          : "border-gray-200 hover:border-gray-300"
    }
    ${className}
  `.trim();

    return (
      <div className={containerClassName}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          rows={rows}
          className={textareaClasses}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />

        {(error || helperText) && (
          <div className="mt-2">
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </p>
            )}
            {helperText && !error && (
              <p className="text-sm text-gray-500">{helperText}</p>
            )}
          </div>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

// Select Component
export const Select = forwardRef(
  (
    {
      label,
      error,
      helperText,
      options = [],
      placeholder = "Select an option",
      className = "",
      containerClassName = "",
      required = false,
      ...props
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);

    const selectClasses = `
    w-full px-4 py-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none appearance-none bg-white
    ${
      error
        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
        : focused
          ? "border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
          : "border-gray-200 hover:border-gray-300"
    }
    ${className}
  `.trim();

    return (
      <div className={containerClassName}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={selectClasses}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {(error || helperText) && (
          <div className="mt-2">
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </p>
            )}
            {helperText && !error && (
              <p className="text-sm text-gray-500">{helperText}</p>
            )}
          </div>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

// Search Input Component
export const SearchInput = forwardRef(
  ({ onSearch, placeholder = "Search...", className = "", ...props }, ref) => {
    const [query, setQuery] = useState("");

    const handleSubmit = (e) => {
      e.preventDefault();
      onSearch?.(query);
    };

    return (
      <form onSubmit={handleSubmit} className="relative">
        <Input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
          rightIcon={
            query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )
          }
          className={className}
          {...props}
        />
      </form>
    );
  },
);

SearchInput.displayName = "SearchInput";

export default Input;
