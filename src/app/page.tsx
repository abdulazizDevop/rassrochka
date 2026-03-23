'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function Home() {
  const { isLoggedIn } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/dashboard/contracts');
    } else {
      router.replace('/login');
    }
  }, [isLoggedIn, router]);

  return null;
}
