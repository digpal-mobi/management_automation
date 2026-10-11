import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variantMap = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 border border-indigo-500/50',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
    outline:
      'bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700',
    ghost:
      'bg-transparent hover:bg-slate-800 text-slate-300',
    danger:
      'bg-red-600 hover:bg-red-500 text-white border border-red-500',
  };

  const sizeMap = {
    sm: 'px-2.5 py-1 text-xs rounded-md',
    md: 'px-3.5 py-1.5 text-sm rounded-lg',
    lg: 'px-5 py-2.5 text-base rounded-lg',
    icon: 'p-2 rounded-lg',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${
        variantMap[variant]
      } ${sizeMap[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
