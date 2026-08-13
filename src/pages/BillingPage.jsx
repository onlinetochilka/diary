import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageWrapper } from './Pages.jsx';
import { CreditCard, CheckCircle2, Clock, Zap, Lock, Crown, Sparkles, TrendingUp, UserPlus, X, ShieldCheck } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Switch from '../components/ui/Switch.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { createSubscriptionPayment } from '../api/databaseApi.js';
import { useToast } from '../components/ui/Toast.jsx';

export default function BillingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const isAnonymous = localStorage.getItem("isDemoMode") === "true";

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('checkout') === 'monthly' && user && !isAnonymous) {
      // Remove parameter from URL to prevent loop
      navigate('/billing', { replace: true });
      handleSubscribe('monthly');
    }
  }, [searchParams, user, isAnonymous, navigate]);

  const handleRegister = (planKey) => {
    if (planKey) {
      navigate(`/login?mode=register&plan=${planKey}`);
    } else {
      navigate('/login?mode=register');
    }
  };

  const isSubscribed = user?.subscription_status === 'active' && new Date(user?.subscription_until) > new Date();
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr.replace(' ', 'T')).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleSubscribe = async (planKey) => {
    if (isAnonymous) {
      handleRegister();
      return;
    }
    try {
      setLoadingPlan(planKey);
      const res = await createSubscriptionPayment(planKey);
      if (res && res.confirmation_url) {
        window.location.href = res.confirmation_url;
      } else {
        throw new Error("Не удалось получить ссылку на оплату");
      }
    } catch (err) {
      console.error(err);
      showToast({
        title: "Ошибка",
        description: "Не удалось инициализировать оплату. Попробуйте позже.",
        type: "error"
      });
      setLoadingPlan(null);
    }
  };

  return (
    <PageWrapper 
      title={isAnonymous ? "Порядок в расписании — приятное чувство, правда?" : "Подписка и тарифы"}
      subtitle={isAnonymous ? "Зарегистрируйтесь, чтобы получить полный доступ ко всем функциям." : "Управление вашим тарифным планом"}
      icon={CreditCard}
      iconBgClass="bg-indigo-100"
      iconTextClass="text-indigo-600"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-12 lg:gap-16 items-stretch pt-4 lg:pt-8 mb-8">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col h-full">
          {isAnonymous ? (
            <Card className="bg-white border border-stone-200/80 shadow-sm rounded-3xl p-6 md:p-8 flex flex-col gap-4 justify-between h-full">
              
              <div className="flex items-start gap-4 bg-indigo-50 border-l-[4px] border-indigo-400 rounded-2xl p-5 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <UserPlus size={24} className="text-indigo-500" />
                </div>
                <p className="text-[14px] text-stone-700 leading-relaxed font-medium pt-1">
                  Вы только что вели расписание, считали доходы и управляли учениками — всё это без единой инструкции.
                </p>
              </div>
              
              <div className="flex items-start gap-4 bg-fuchsia-50 border-l-[4px] border-fuchsia-400 rounded-2xl p-5 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <TrendingUp size={24} className="text-fuchsia-500" />
                </div>
                <p className="text-[14px] text-stone-700 leading-relaxed font-medium pt-1">
                  Теперь представьте то же самое, но с вашими настоящими данными. Все ученики и финансы в одном месте.
                </p>
              </div>

              <div className="flex items-start gap-4 bg-amber-50 border-l-[4px] border-amber-400 rounded-2xl p-5 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck size={24} className="text-amber-500" />
                </div>
                <p className="text-[14px] text-stone-700 leading-relaxed font-medium pt-1">
                  Вся история занятий, долгов и абонементов бережно сохраняется в облаке. Вы больше не потеряете важные записи.
                </p>
              </div>

              <div className="flex items-start gap-4 bg-emerald-50 border-l-[4px] border-emerald-400 rounded-2xl p-5 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles size={24} className="text-emerald-500" />
                </div>
                <p className="text-[14px] text-stone-700 leading-relaxed font-medium pt-1">
                  Создайте аккаунт, чтобы перенести сюда свою практику — это займёт пару минут, а польза останется навсегда.
                </p>
              </div>

            </Card>
          ) : (
            <Card className="bg-white ring-1 ring-stone-200 shadow-sm relative overflow-hidden rounded-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-60">
                <Crown size={140} className="text-stone-100" />
              </div>
              <div className="relative z-10 p-6">
                <h2 className="text-xl font-bold text-stone-900 mb-2">
                  {isSubscribed ? 'У вас активная подписка Точилка PRO' : 'Бесплатный тариф'}
                </h2>
                <p className="text-stone-600 mb-6 text-[14px] leading-relaxed">
                  {isSubscribed 
                    ? `Ваша подписка активна до ${formatDate(user?.subscription_until)}. Вы можете добавлять неограниченное количество учеников и пользоваться всеми функциями.` 
                    : 'Вы используете бесплатную версию. Лимит: до 5 учеников. Для снятия ограничений перейдите на PRO тариф.'}
                </p>
                
                {!isSubscribed && (
                  <div className="flex items-center gap-2 text-sm text-stone-600 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>Оставайтесь на бесплатном тарифе столько, сколько потребуется</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: PRICING DECISION */}
        <div className="flex flex-col">

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch mb-6">
            
            {/* Start (Free) Card */}
            <Card className="flex flex-col h-full bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="p-6 md:p-8 flex-grow flex flex-col">
                <h4 className="text-2xl font-black text-stone-900 mb-2 tracking-tight">Старт</h4>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[40px] font-black text-stone-900 leading-none">0</span>
                  <span className="text-[28px] font-black text-stone-900 leading-none">₽</span>
                  <span className="text-stone-500 text-sm font-medium ml-1">навсегда</span>
                </div>
                <p className="text-[13px] text-stone-500 mb-8">Для знакомства с ежедневником</p>
                
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-start gap-3 text-[13.5px] text-stone-700 font-medium">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="leading-tight mt-0.5">Базовое расписание и перенос уроков</span>
                  </li>
                  <li className="flex items-start gap-3 text-[13.5px] text-stone-700 font-medium">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="leading-tight mt-0.5">До 5 активных учеников</span>
                  </li>
                  <li className="flex items-start gap-3 text-[13.5px] text-stone-700 font-medium">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="leading-tight mt-0.5">Учёт финансов (баланс, долги)</span>
                  </li>
                  <li className="flex items-start gap-3 text-[13.5px] text-stone-700 font-medium">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="leading-tight mt-0.5">Базовая аналитика на главной</span>
                  </li>
                  <li className="flex items-start gap-3 text-[13.5px] text-stone-400 font-medium">
                    <X size={18} className="text-stone-300 shrink-0" />
                    <span className="leading-tight mt-0.5">Автоматические напоминания и отчёты</span>
                  </li>
                </ul>
                
                <div className="mt-auto">
                  <Button 
                    className="w-full bg-white border-2 border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300 font-semibold h-[52px] rounded-2xl transition-all disabled:opacity-50 disabled:hover:bg-white"
                    onClick={() => {
                      if (isAnonymous) handleRegister();
                    }}
                    disabled={!isAnonymous}
                  >
                    {isAnonymous ? 'Создать аккаунт' : (!isSubscribed ? 'Ваш текущий тариф' : 'Базовые функции')}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Tutor (Paid) Card */}
            <Card className="flex flex-col h-full bg-white border border-[#164a63] rounded-3xl overflow-visible shadow-xl ring-2 ring-[#164a63]/20 relative mt-4 sm:mt-0">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#164a63] text-white text-[11px] font-bold py-1.5 px-4 tracking-wider uppercase rounded-full whitespace-nowrap shadow-md">
                Ранний доступ — 3 мес. бесплатно
              </div>
              <div className="p-6 md:p-8 flex-grow flex flex-col pt-8">
                <h4 className="text-2xl font-black text-stone-900 mb-2 tracking-tight">Репетитор</h4>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[40px] font-black text-stone-900 leading-none">390</span>
                  <span className="text-[28px] font-black text-stone-900 leading-none">₽</span>
                  <span className="text-stone-500 text-sm font-medium ml-1">/ мес</span>
                </div>
                <p className="text-[13px] text-stone-500 mb-8">Полный набор инструментов</p>
                
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-start gap-3 text-[13.5px] text-stone-700 font-medium">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="leading-tight mt-0.5">Всё из тарифа «Старт»</span>
                  </li>
                  <li className="flex items-start gap-3 text-[13.5px] text-stone-700 font-medium">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="leading-tight mt-0.5">До 50 активных учеников</span>
                  </li>
                  <li className="flex items-start gap-3 text-[13.5px] text-stone-700 font-medium">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="leading-tight mt-0.5">Настраиваемая аналитика и статистика</span>
                  </li>
                  <li className="flex items-start gap-3 text-[13.5px] text-stone-700 font-medium">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="leading-tight mt-0.5">Автоматические рассылки (долги, д/з, отчёты)</span>
                  </li>
                  <li className="flex items-start gap-3 text-[13.5px] text-stone-700 font-medium">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="leading-tight mt-0.5">Программы курсов и база домашних заданий</span>
                  </li>
                </ul>
                
                <div className="mt-auto">
                  <Button 
                    className="w-full bg-[#1e1c1b] text-white hover:bg-[#2c2a29] font-semibold h-[52px] rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-70"
                    onClick={() => {
                      if (isAnonymous) {
                        handleRegister('pro');
                      } else {
                        handleSubscribe('monthly');
                      }
                    }}
                    disabled={loadingPlan === 'monthly' || loadingPlan === 'yearly'}
                  >
                    {loadingPlan ? 'Переход к оплате...' : (isAnonymous ? (
                      <>Создать аккаунт <span className="text-lg leading-none mt-[-2px]">&rarr;</span></>
                    ) : (
                      isSubscribed ? 'Продлить подписку' : 'Оформить подписку'
                    ))}
                  </Button>
                </div>
              </div>
            </Card>

          </div>

          {/* Security Message */}
          <div className="w-full mt-2 p-4 bg-stone-50 rounded-lg border border-stone-200 flex items-start sm:items-center justify-center gap-3 text-stone-600 text-sm">
            <Lock size={20} className="text-stone-400 shrink-0 mt-0.5 sm:mt-0" />
            <p>
              <strong>Ваш платеж надежно защищен.</strong> Оплата происходит на зашифрованной стороне платежной системы ЮKassa. 
              Точилка не собирает, не видит и не хранит данные ваших банковских карт.
            </p>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
