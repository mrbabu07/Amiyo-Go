import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ endDate }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isEnded: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isEnded: true,
        });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isEnded: false,
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (timeLeft.isEnded) {
    return <div className="countdown-timer ended">Campaign Ended</div>;
  }

  return (
    <div className="countdown-timer">
      <div className="time-unit">
        <span className="value">{String(timeLeft.days).padStart(2, '0')}</span>
        <span className="label">Days</span>
      </div>
      <span className="separator">:</span>
      <div className="time-unit">
        <span className="value">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="label">Hours</span>
      </div>
      <span className="separator">:</span>
      <div className="time-unit">
        <span className="value">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="label">Minutes</span>
      </div>
      <span className="separator">:</span>
      <div className="time-unit">
        <span className="value">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="label">Seconds</span>
      </div>
    </div>
  );
};

export default CountdownTimer;
