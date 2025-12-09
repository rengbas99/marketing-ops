import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

const defaultFormatter = (elapsedMs) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export default function Timer({
  startTime = Date.now(),
  formatter = defaultFormatter,
  interval = 1000,
  ariaLive = 'polite',
  className,
}) {
  const startRef = useRef(startTime);
  const [display, setDisplay] = useState(() => formatter(0));
  const formatterRef = useRef(formatter);
  formatterRef.current = formatter;

  useEffect(() => {
    startRef.current = startTime;
  }, [startTime]);

  useEffect(() => {
    let rafId;
    let lastTick = 0;

    const tick = (timestamp) => {
      const elapsed = timestamp - startRef.current;
      if (elapsed - lastTick >= interval - 16) {
        lastTick = elapsed;
        setDisplay(formatterRef.current(elapsed));
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [interval]);

  const ariaProps = useMemo(
    () => ({
      'aria-live': ariaLive,
      'aria-atomic': 'true',
    }),
    [ariaLive],
  );

  return (
    <span className={className} {...ariaProps}>
      {display}
    </span>
  );
}

Timer.propTypes = {
  startTime: PropTypes.number,
  formatter: PropTypes.func,
  interval: PropTypes.number,
  ariaLive: PropTypes.oneOf(['off', 'polite', 'assertive']),
  className: PropTypes.string,
};

