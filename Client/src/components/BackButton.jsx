import { useNavigate } from "react-router-dom";

export default function BackButton({ className = "", label = "Back" }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group ${className}`}
      aria-label="Go back"
    >
      <svg
        className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      <span className="font-medium">{label}</span>
    </button>
  );
}
