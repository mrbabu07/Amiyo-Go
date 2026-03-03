import { useState } from "react";
import SpinWheel from "./SpinWheel";
import useAuth from "../hooks/useAuth";

export default function SpinWheelFAB() {
  const [showWheel, setShowWheel] = useState(false);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const { user } = useAuth();

  // Check if user has spun today (you can implement this with localStorage or API)
  const checkSpinStatus = () => {
    const lastSpin = localStorage.getItem(`lastSpin_${user?.uid}`);
    const today = new Date().toDateString();
    return lastSpin === today;
  };

  const handleWin = (prize) => {
    console.log("User won:", prize);

    // Save spin status
    if (user?.uid) {
      localStorage.setItem(`lastSpin_${user.uid}`, new Date().toDateString());
      setHasSpunToday(true);
    }

    // Here you can implement the prize logic
    // For example, create a coupon code or add discount to user's account
    if (prize.value !== 0) {
      // Generate coupon code or apply discount
      const couponCode = `SPIN${prize.value}${Date.now().toString().slice(-4)}`;
      localStorage.setItem(
        "spinWheelPrize",
        JSON.stringify({
          ...prize,
          couponCode,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        }),
      );

      alert(
        `🎉 Congratulations! You won ${prize.label}!\nUse code: ${couponCode}\nValid for 24 hours.`,
      );
    }
  };

  // Don't show if user is not logged in or has already spun today
  if (!user || (user && checkSpinStatus())) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setShowWheel(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        title="Spin to Win!"
      >
        <div className="relative">
          <svg
            className="w-8 h-8 animate-spin-slow group-hover:animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6l4 2"
            />
          </svg>

          {/* Sparkle effect */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
        </div>
      </button>

      {/* Tooltip */}
      <div className="fixed bottom-24 right-6 z-30 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        🎰 Spin for prizes!
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
      </div>

      {/* Spin Wheel Modal */}
      {showWheel && (
        <SpinWheel onWin={handleWin} onClose={() => setShowWheel(false)} />
      )}

      <style>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </>
  );
}
