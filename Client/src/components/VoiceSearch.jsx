import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function VoiceSearch({ onSearch }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("");
      };

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        if (finalTranscript) {
          handleSearch(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        if (event.error === "not-allowed") {
          alert(
            "Microphone access denied. Please enable microphone permissions.",
          );
        } else if (event.error === "no-speech") {
          alert("No speech detected. Please try again.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleSearch = (searchTerm) => {
    if (searchTerm.trim()) {
      if (onSearch) {
        onSearch(searchTerm);
      } else {
        navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      }
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  return (
    <div className="relative">
      <button
        onClick={isListening ? stopListening : startListening}
        className={`p-2 rounded-full transition-all duration-200 ${
          isListening
            ? "bg-red-500 text-white animate-pulse"
            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
        title={isListening ? "Stop listening" : "Voice search"}
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
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </button>

      {/* Listening Indicator */}
      {isListening && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-48 z-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Listening...
            </span>
          </div>

          {transcript && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              "{transcript}"
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Speak clearly or click to stop
          </div>
        </div>
      )}

      {/* Voice Search Tips Modal */}
      {isListening && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400 animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Voice Search Active
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Say something like:
              </p>

              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <div>"Search for laptops"</div>
                <div>"Find red shoes"</div>
                <div>"Show me phones under 500"</div>
              </div>

              {transcript && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    You said:
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    "{transcript}"
                  </div>
                </div>
              )}

              <button
                onClick={stopListening}
                className="mt-4 btn-secondary w-full"
              >
                Stop Listening
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
