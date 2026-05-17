import { cx, uiTokens } from "./designTokens";

export const formInputClass = uiTokens.input;
export const formTextareaClass = uiTokens.textarea;

export default function FormField({
  label,
  helper,
  error,
  children,
  className = "",
}) {
  return (
    <label className={cx("block", className)}>
      {label && <span className={uiTokens.label}>{label}</span>}
      {children}
      {error ? (
        <p className={uiTokens.error}>{error}</p>
      ) : helper ? (
        <p className={uiTokens.helper}>{helper}</p>
      ) : null}
    </label>
  );
}
