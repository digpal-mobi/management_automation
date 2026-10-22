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
      'bg-white hover:bg-neutral-200 text-black font-semibold border border-white shadow-sm',
    secondary:
      'bg-[#141414] hover:bg-[#1E1E1E] text-white border border-[#2A2A2A]',
    outline:
      'bg-transparent hover:bg-[#141414] text-neutral-300 hover:text-white border border-[#2A2A2A]',
    ghost:
      'bg-transparent hover:bg-[#141414] text-neutral-400 hover:text-white',
    danger:
      'bg-transparent hover:bg-[#141414] text-neutral-300 hover:text-white border border-[#404040]',
  };

  const sizeMap = {
    sm: 'px-2.5 py-1 text-xs rounded-md',
    md: 'px-3.5 py-1.5 text-xs rounded-lg',
    lg: 'px-5 py-2.5 text-sm rounded-lg',
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
            className="animate-spin h-3.5 w-3.5 text-current"
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
