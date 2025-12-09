import PropTypes from 'prop-types';

const VARIANT_STYLES = {
  primary: 'bg-primary text-white hover:bg-primary-dark focus-visible:ring-primary',
  secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 focus-visible:ring-gray-200',
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  glass: 'bg-white/80 text-slate-900 border border-white/40 backdrop-blur hover:bg-white focus-visible:ring-slate-200',
};

const SIZE_STYLES = {
  sm: 'text-sm px-3 py-2',
  md: 'text-base px-4 py-2.5',
  lg: 'text-lg px-6 py-3',
};

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon: Icon,
  children,
  className,
  ...rest
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors motion-safe';
  const iconOnly = !children && Icon ? 'p-2' : '';

  return (
    <Component
      className={cx(baseClasses, VARIANT_STYLES[variant], SIZE_STYLES[size], iconOnly, disabled ? 'opacity-60 cursor-not-allowed' : '', className)}
      disabled={disabled}
      {...rest}
    >
      {Icon ? <Icon className="w-4 h-4" aria-hidden="true" /> : null}
      {children}
    </Component>
  );
}

Button.propTypes = {
  as: PropTypes.elementType,
  variant: PropTypes.oneOf(['primary', 'secondary', 'destructive', 'glass']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  icon: PropTypes.elementType,
  className: PropTypes.string,
  children: PropTypes.node,
};

