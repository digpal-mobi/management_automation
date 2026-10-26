'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, UserPlus, Lock, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

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
    <div className="min-h-[80vh] flex items-center justify-center py-6 px-2">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6 shadow-card">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF5F9] border border-[#669BBC]/30 mb-1 text-[#003049] shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#17212B] tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs text-[#526174]">
            Join TaskPulse to plan features, extract roadmaps, and manage engineering backlogs
          </p>
        </div>

        {/* Register Form */}
        <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="developer@company.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Username"
            type="text"
            placeholder="johndoe"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.username?.message}
            {...register('username')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="•••••••• (min. 6 characters)"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={submitting}
            leftIcon={<UserPlus className="h-4 w-4" />}
            className="w-full mt-2"
          >
            Create Account
          </Button>
        </form>

        {/* Footer Link */}
        <div className="pt-2 text-center text-xs text-[#526174]">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-[#003049] hover:underline transition-colors"
          >
            Sign in instead
          </Link>
        </div>
      </Card>
    </div>
  );
}
