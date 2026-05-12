import { useEffect, useState } from "react";
import SpinWheel from "./SpinWheel";
import useAuth from "../hooks/useAuth";
import { getSpinRewardStatus } from "../services/api";

export default function SpinWheelFAB() {
  const [showWheel, setShowWheel] = useState(false);
  const [status, setStatus] = useState({
    loading: true,
    canSpin: false,
    segments: [],
  });
  const { user } = useAuth();

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      if (!user) {
        setStatus({ loading: false, canSpin: false, segments: [] });
        return;
      }

      try {
        const response = await getSpinRewardStatus();
        if (!active) return;
        setStatus({
          loading: false,
          canSpin: response.data.data.canSpin,
          segments: response.data.data.segments || [],
          disabledReason: response.data.data.disabledReason,
        });
      } catch (error) {
        if (!active) return;
        setStatus({
          loading: false,
          canSpin: false,
          segments: [],
          disabledReason: error.response?.data?.error || "Reward wheel unavailable",
        });
      }
    };

    loadStatus();
    return () => {
      active = false;
    };
  }, [user]);

  const handleWin = () => {
    setStatus((current) => ({ ...current, canSpin: false }));
  };

  if (!user || status.loading || !status.canSpin) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowWheel(true)}
        className="fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
        title="Spin to win"
      >
        <svg
          className="h-8 w-8 animate-spin-slow"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
        </svg>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-yellow-400" />
      </button>

      {showWheel && (
        <SpinWheel
          segments={status.segments}
          onWin={handleWin}
          onClose={() => setShowWheel(false)}
        />
      )}

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </>
  );
}
