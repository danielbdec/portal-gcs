
"use client";

import { useSession } from 'next-auth/react';
import { Spin } from 'antd';

export default function SpinnerWrapper({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh'}}>
        <Spin size="large" />
      </div>
    );
  }

  return children;
}
