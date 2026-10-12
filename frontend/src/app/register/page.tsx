'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, UserPlus, Lock, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Alphanumeric, hyphens, and underscores only'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitting(true);
    await registerUser({
      email: values.email,
      username: values.username,
      password: values.password,
    });
    setSubmitting(false);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/25 mb-1">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs text-slate-400">
            Join TaskPulse to collaborate on engineering projects & Kanban boards
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                {...register('email')}
                placeholder="developer@company.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                  errors.email ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
            </div>
            {errors.email && (
              <span className="text-[11px] text-rose-400 mt-1 block">
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                {...register('username')}
                placeholder="johndoe"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                  errors.username ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
            </div>
            {errors.username && (
              <span className="text-[11px] text-rose-400 mt-1 block">
                {errors.username.message}
              </span>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                {...register('password')}
                placeholder="•••••••• (min. 6 characters)"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                  errors.password ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
            </div>
            {errors.password && (
              <span className="text-[11px] text-rose-400 mt-1 block">
                {errors.password.message}
              </span>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                {...register('confirmPassword')}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                  errors.confirmPassword ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <span className="text-[11px] text-rose-400 mt-1 block">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={submitting}
            className="w-full gap-2 mt-2 py-2.5 rounded-xl"
          >
            <UserPlus className="h-4 w-4" />
            Create Account
          </Button>
        </form>

        {/* Footer Link */}
        <div className="pt-2 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
