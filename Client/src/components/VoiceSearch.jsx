import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AlertCircle, AudioLines, Mic, MicOff, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export default function VoiceSearch({ onSearch, onPanelChange }) {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const shouldAutoSearchRef = useRef(false);
  const onPanelChangeRef = useRef(onPanelChange);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const speechLanguage = useMemo(
    () => (i18n.language?.startsWith("bn") ? "bn-BD" : "en-US"),
    [i18n.language],
  );

  const examples = useMemo(
    () => [
      t("voiceSearch.exampleOne"),
      t("voiceSearch.exampleTwo"),
      t("voiceSearch.exampleThree"),
    ],
    [t],
  );

  useEffect(() => {
    onPanelChangeRef.current = onPanelChange;
  }, [onPanelChange]);

  const notifyPanelChange = (open) => {
    onPanelChangeRef.current?.(open);
  };

  const runSearch = (searchTerm) => {
    const clean = String(searchTerm || "").trim();
    if (!clean) return;
    shouldAutoSearchRef.current = false;
    if (recognitionRef.current && isListening) recognitionRef.current.abort();
    setIsListening(false);
    setIsPanelOpen(false);
    notifyPanelChange(false);
    setTranscript("");
    setErrorMessage("");
    if (onSearch) {
      onSearch(clean);
    } else {
      navigate(`/search?q=${encodeURIComponent(clean)}`);
    }
  };

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    setIsSupported(Boolean(SpeechRecognition));
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = speechLanguage;

    recognition.onstart = () => {
      finalTranscriptRef.current = "";
      shouldAutoSearchRef.current = true;
      setTranscript("");
      setErrorMessage("");
      setIsListening(true);
      setIsPanelOpen(true);
      notifyPanelChange(true);
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      const spokenText = (finalText || interimText).trim();
      setTranscript(spokenText);

      if (finalText.trim()) {
        finalTranscriptRef.current = finalText.trim();
      }
    };

    recognition.onerror = (event) => {
      const errors = {
        "not-allowed": t("voiceSearch.permissionDenied"),
        "service-not-allowed": t("voiceSearch.permissionDenied"),
        "no-speech": t("voiceSearch.noSpeech"),
        "audio-capture": t("voiceSearch.noMicrophone"),
        network: t("voiceSearch.networkError"),
      };
      setErrorMessage(errors[event.error] || t("voiceSearch.tryAgain"));
      shouldAutoSearchRef.current = false;
      setIsListening(false);
      setIsPanelOpen(true);
      notifyPanelChange(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (shouldAutoSearchRef.current && finalTranscriptRef.current) {
        runSearch(finalTranscriptRef.current);
      }
      shouldAutoSearchRef.current = false;
    };

    return () => {
      shouldAutoSearchRef.current = false;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [speechLanguage, t]);

  const startListening = () => {
    if (!isSupported) {
      setErrorMessage(t("voiceSearch.unsupported"));
      setIsPanelOpen(true);
      notifyPanelChange(true);
      return;
    }

    if (!recognitionRef.current || isListening) return;

    try {
      setIsPanelOpen(true);
      notifyPanelChange(true);
      setErrorMessage("");
      recognitionRef.current.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setErrorMessage(t("voiceSearch.tryAgain"));
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      shouldAutoSearchRef.current = true;
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const closePanel = () => {
    shouldAutoSearchRef.current = false;
    if (recognitionRef.current && isListening) recognitionRef.current.abort();
    setIsListening(false);
    setIsPanelOpen(false);
    notifyPanelChange(false);
    setTranscript("");
    setErrorMessage("");
  };

  return (
    <>
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        className={`relative flex h-10 w-10 items-center justify-center rounded-md transition focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
          isListening
            ? "bg-red-600 text-white shadow-sm"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-primary-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        }`}
        aria-label={isListening ? t("voiceSearch.stop") : t("voiceSearch.open")}
        title={isListening ? t("voiceSearch.stop") : t("voiceSearch.open")}
      >
        {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        {isListening ? (
          <span className="absolute inset-0 -z-10 rounded-md bg-red-500/40 animate-ping" />
        ) : null}
      </button>

      <AnimatePresence>
        {isPanelOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-[490] bg-gray-950/10 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
            />
            <motion.div
              className="fixed left-1/2 top-20 z-[500] w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-gray-950 sm:top-24 sm:max-w-md"
              style={{ x: "-50%" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="voice-search-title"
              initial={{ y: -10, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -10, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                    {t("voiceSearch.label")}
                  </p>
                  <h2 id="voice-search-title" className="mt-1 text-lg font-extrabold text-gray-950 dark:text-white">
                    {isListening ? t("voiceSearch.listeningTitle") : t("voiceSearch.title")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white"
                  aria-label={t("common.close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-center gap-3">
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${
                      isListening
                        ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-200"
                        : "bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-200"
                    }`}
                  >
                    <AudioLines className={`h-7 w-7 ${isListening ? "animate-pulse" : ""}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {isListening ? t("voiceSearch.speakNow") : t("voiceSearch.tapToStart")}
                    </p>
                    <div className="mt-2 flex h-2 items-center gap-1">
                      {[0, 1, 2, 3, 4].map((bar) => (
                        <span
                          key={bar}
                          className={`h-full flex-1 rounded-full ${
                            isListening
                              ? "animate-pulse bg-primary-500"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 min-h-11 rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-gray-700 dark:bg-gray-950 dark:text-gray-200">
                  {transcript ? (
                    <span>{transcript}</span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">
                      {isListening ? t("voiceSearch.speakNow") : t("voiceSearch.tapToStart")}
                    </span>
                  )}
                </div>

                {errorMessage ? (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t("voiceSearch.examplesTitle")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {examples.map((example) => (
                    <button
                      type="button"
                      key={example}
                      onClick={() => runSearch(example)}
                      className="min-h-9 rounded-full border border-gray-200 px-3 text-xs font-bold text-gray-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-primary-950/30"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95 ${
                    isListening
                      ? "border border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-gray-950 dark:hover:bg-red-950/30"
                      : "bg-primary-500 text-white hover:bg-primary-600"
                  }`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isListening ? t("voiceSearch.stop") : t("voiceSearch.start")}
                </button>
                <button
                  type="button"
                  onClick={() => runSearch(transcript)}
                  disabled={!transcript.trim()}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  <Search className="h-4 w-4" />
                  {t("common.search")}
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
