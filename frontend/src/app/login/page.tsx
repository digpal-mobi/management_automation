'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, LogIn, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

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
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-2">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6 shadow-card">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF5F9] border border-[#669BBC]/30 mb-1 text-[#003049] shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#17212B] tracking-tight">
            Sign In to TaskPulse
          </h1>
          <p className="text-xs text-[#526174]">
            Enter your credentials to access your projects and tickets
          </p>
        </div>

        {/* Login Form */}
        <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email or Username"
            type="text"
            placeholder="developer@company.com or username"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.login?.message}
            {...register('login')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register('password')}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={submitting}
            leftIcon={<LogIn className="h-4 w-4" />}
            className="w-full mt-2"
          >
            Sign In
          </Button>
        </form>

        {/* Footer Link */}
        <div className="pt-2 text-center text-xs text-[#526174]">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-[#003049] hover:underline transition-colors"
          >
            Create an account
          </Link>
        </div>
      </Card>
    </div>
  );
}
