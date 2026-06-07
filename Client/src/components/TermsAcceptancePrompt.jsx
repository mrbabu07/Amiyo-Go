import { useState } from "react";
import useAuth from "../hooks/useAuth";
import { recordTermsAcceptance } from "../services/api";

const getRequiredCopy = (type, version) => {
  if (type === "privacy") {
    return {
      title: "Privacy Policy update",
      body: `Amiyo-Go updated the Privacy Policy${version ? ` to version ${version}` : ""}. Please accept it to continue using your account.`,
      primaryLink: "/privacy",
      primaryLabel: "Read Privacy Policy",
    };
  }

  return {
    title: "Terms and Conditions update",
    body: `Amiyo-Go updated the Terms and Conditions${version ? ` to version ${version}` : ""}. Please accept the latest rules to continue using your account.`,
    primaryLink: "/terms",
    primaryLabel: "Read Terms",
  };
};

export default function TermsAcceptancePrompt() {
  const { dbUser, loading, refreshUserData } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [acceptedLocally, setAcceptedLocally] = useState(false);
  const [error, setError] = useState("");

  const required = Boolean(dbUser?.termsAcceptanceRequired);
  if (loading || !dbUser || !required || acceptedLocally) return null;

  const requiredType = dbUser.requiredTermsType || "terms";
  const requiredVersion = dbUser.requiredTermsVersion || "2026.06";
  const copy = getRequiredCopy(requiredType, requiredVersion);
  const termsVersion =
    requiredType === "privacy"
      ? dbUser.legalAcceptance?.terms?.version || requiredVersion
      : requiredVersion;
  const privacyVersion =
    requiredType === "privacy"
      ? requiredVersion
      : dbUser.legalAcceptance?.privacy?.version || requiredVersion;

  const handleAccept = async () => {
    setSubmitting(true);
    setError("");

    try {
      await recordTermsAcceptance({
        termsVersion,
        privacyVersion,
        source: "required_reacceptance",
      });
      setAcceptedLocally(true);
      await refreshUserData?.();
    } catch (acceptError) {
      setError(acceptError.response?.data?.error || "Failed to record acceptance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/70 px-4 py-6">
      <div
        className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-acceptance-title"
      >
        <p className="text-sm font-semibold uppercase text-primary-600">Action required</p>
        <h2 id="terms-acceptance-title" className="mt-2 text-2xl font-bold text-slate-950">
          {copy.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{copy.body}</p>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Continued use of Amiyo-Go means you agree to the current marketplace,
          order, payment, vendor, return, privacy, and safety rules.
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <a href={copy.primaryLink} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700">
              {copy.primaryLabel}
            </a>
            <a
              href={requiredType === "privacy" ? "/terms" : "/privacy"}
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 hover:text-primary-700"
            >
              {requiredType === "privacy" ? "Terms and Conditions" : "Privacy Policy"}
            </a>
          </div>

          <button
            type="button"
            onClick={handleAccept}
            disabled={submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submitting ? "Saving..." : "Accept and Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
