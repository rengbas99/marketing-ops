import PropTypes from 'prop-types';

const PADDING_BY_SIZE = {
  sm: 'var(--space-4)',
  md: 'var(--space-5)',
  lg: 'var(--space-6)',
};

const ELEVATION_CLASS = {
  none: 'shadow-none border border-transparent',
  sm: 'shadow-[0_10px_30px_rgba(15,23,42,0.08)] border border-slate-100',
  md: 'shadow-[0_25px_60px_rgba(15,23,42,0.12)] border border-slate-100',
};

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Card({
  as: Component = 'div',
  size = 'md',
  elevation = 'md',
  glass = false,
  className,
  style,
  children,
  ...rest
}) {
  const padding = PADDING_BY_SIZE[size] ?? PADDING_BY_SIZE.md;
  const glassStyles = glass ? {
    background: 'var(--glass-surface)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)',
  } : {};

  const componentClass = cx(
    'rounded-2xl bg-white transition-shadow motion-safe',
    ELEVATION_CLASS[elevation],
    className,
  );

  return (
    <Component
      className={componentClass}
      style={{ padding, ...glassStyles, ...style }}
      data-glass={glass || undefined}
      {...rest}
    >
      {children}
    </Component>
  );
}

Card.propTypes = {
  as: PropTypes.elementType,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  elevation: PropTypes.oneOf(['none', 'sm', 'md']),
  glass: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  children: PropTypes.node,
};

