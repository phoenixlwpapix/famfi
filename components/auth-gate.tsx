'use client';

import { useState } from 'react';
import {
  Mail,
  ArrowRight,
  Wallet,
  TrendingUp,
  Users,
  Gem,
  RefreshCw,
  Shield,
  BarChart3,
} from 'lucide-react';
import { db } from '@/lib/instant';

const FEATURES = [
  {
    icon: Wallet,
    title: '多类资产管理',
    desc: '存款、贵金属、有价证券，统一管理',
    color: '#C9A84C',
  },
  {
    icon: TrendingUp,
    title: '实时行情同步',
    desc: '黄金白银实时价格，多货币自动换算',
    color: '#34C77B',
  },
  {
    icon: Users,
    title: '家庭成员档案',
    desc: '为每位成员建立独立财务档案',
    color: '#4A9BFF',
  },
  {
    icon: Shield,
    title: '私密安全',
    desc: '数据绑定您的账户，仅您可见',
    color: '#8B7CF6',
  },
];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = db.useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <RefreshCw className="animate-spin text-primary" size={22} />
      </div>
    );
  }

  if (user) return <>{children}</>;

  async function sendCode() {
    if (!email.trim() || pending) return;
    setPending(true);
    setError('');
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
      setStep('code');
    } catch {
      setError('发送失败，请检查邮箱地址');
    } finally {
      setPending(false);
    }
  }

  async function verifyCode() {
    if (!code.trim() || pending) return;
    setPending(true);
    setError('');
    try {
      await db.auth.signInWithMagicCode({ email: email.trim(), code: code.trim() });
    } catch {
      setError('验证码错误或已过期');
      setCode('');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-foreground overflow-hidden">
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)`,
          backgroundSize: '72px 72px',
        }}
      />
      {/* Ambient glows */}
      <div
        className="fixed top-[-200px] right-[-200px] w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)' }}
      />
      <div
        className="fixed bottom-[-150px] left-[-150px] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(74,155,255,0.06) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navbar */}
        <nav className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center border border-primary/20">
              <BarChart3 size={15} className="text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-primary">Fam</span>
              <span className="text-foreground-secondary font-light">Fi</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            实时数据同步
          </div>
        </nav>

        {/* Hero */}
        <div className="flex-1 flex items-center px-6 sm:px-10 py-16">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: Copy */}
            <div className="space-y-10">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-medium text-primary-light">
                  <Gem size={11} />
                  家庭财务管理系统
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.1]">
                  家庭财富
                  <br />
                  <span style={{ color: '#C9A84C' }}>清晰可见</span>
                </h1>
                <p className="text-base text-foreground-secondary leading-relaxed max-w-[420px]">
                  实时追踪存款、贵金属与有价证券。多货币自动换算，
                  家庭成员独立档案，所有资产一目了然。
                </p>
              </div>

              {/* Feature grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURES.map(({ icon: Icon, title, desc, color }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-surface/50 backdrop-blur-sm hover:border-border transition-colors duration-200"
                  >
                    <div
                      className="p-2 rounded-lg flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: color + '18', color }}
                    >
                      <Icon size={14} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs text-foreground-secondary mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Auth card */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[380px]">
                <div className="bg-surface border border-border rounded-2xl p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
                  {/* Card header */}
                  <div className="mb-7">
                    <h2 className="text-xl font-bold text-foreground">
                      {step === 'email' ? '开始使用' : '输入验证码'}
                    </h2>
                    <p className="text-sm text-foreground-secondary mt-1.5 leading-relaxed">
                      {step === 'email'
                        ? '输入邮箱，我们将发送一次性登录验证码'
                        : `验证码已发送至 ${email}`}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {step === 'email' ? (
                      <>
                        <div className="relative">
                          <Mail
                            size={14}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-secondary"
                          />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                            placeholder="your@email.com"
                            autoFocus
                            className="w-full pl-10 pr-4 py-3 bg-bg border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-foreground-secondary/30"
                          />
                        </div>
                        <button
                          onClick={sendCode}
                          disabled={!email.trim() || pending}
                          className="w-full py-3 bg-primary text-bg rounded-xl font-semibold text-sm hover:bg-primary-light disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          {pending ? (
                            <RefreshCw size={15} className="animate-spin" />
                          ) : (
                            <>
                              发送验证码
                              <ArrowRight size={15} strokeWidth={2.5} />
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                          placeholder="000000"
                          autoFocus
                          maxLength={6}
                          className="w-full px-4 py-3.5 bg-bg border border-border rounded-xl text-foreground focus:border-primary outline-none transition-all text-center tracking-[0.5em] font-mono text-xl placeholder:tracking-normal placeholder:text-base placeholder:text-foreground-secondary/30"
                        />
                        <button
                          onClick={verifyCode}
                          disabled={code.length < 6 || pending}
                          className="w-full py-3 bg-primary text-bg rounded-xl font-semibold text-sm hover:bg-primary-light disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          {pending ? (
                            <RefreshCw size={15} className="animate-spin" />
                          ) : (
                            <>
                              登录
                              <ArrowRight size={15} strokeWidth={2.5} />
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => { setStep('email'); setCode(''); setError(''); }}
                          className="w-full py-2 text-xs text-foreground-secondary hover:text-foreground transition-colors"
                        >
                          重新输入邮箱
                        </button>
                      </>
                    )}

                    {error && (
                      <p className="text-xs text-danger text-center pt-1">{error}</p>
                    )}
                  </div>

                  <div className="mt-7 pt-5 border-t border-border/50">
                    <p className="text-xs text-foreground-secondary/50 text-center">
                      无需密码 · 邮件验证码安全登录 · 数据私密隔离
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/30 text-center">
          <p className="text-xs text-foreground-secondary/30">
            FamFi · 家庭财务管理 · 数据由 InstantDB 安全存储
          </p>
        </div>
      </div>
    </div>
  );
}
