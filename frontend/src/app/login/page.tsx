'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, LogIn, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const loginSchema = z.object({
  login: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    await login(values);
    setSubmitting(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] shadow-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#141414] border border-[#2A2A2A] mb-1">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sign In to TaskPulse
          </h1>
          <p className="text-xs text-[#A3A3A3]">
            Enter your credentials to access your projects and tickets
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#A3A3A3] block mb-1.5">
              Email or Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#525252]" />
              <input
                type="text"
                {...register('login')}
                placeholder="developer@company.com or username"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#000000] border text-xs text-white placeholder-[#525252] focus:outline-none focus:ring-1 focus:ring-white transition-colors ${
                  errors.login ? 'border-white' : 'border-[#2A2A2A]'
                }`}
              />
            </div>
            {errors.login && (
              <span className="text-[11px] text-[#A3A3A3] mt-1 block">
                {errors.login.message}
              </span>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#A3A3A3] block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#525252]" />
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#000000] border text-xs text-white placeholder-[#525252] focus:outline-none focus:ring-1 focus:ring-white transition-colors ${
                  errors.password ? 'border-white' : 'border-[#2A2A2A]'
                }`}
              />
            </div>
            {errors.password && (
              <span className="text-[11px] text-[#A3A3A3] mt-1 block">
                {errors.password.message}
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
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </form>

        {/* Footer Link */}
        <div className="pt-2 text-center text-xs text-[#A3A3A3]">
          Don't have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-white hover:underline transition-colors"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
