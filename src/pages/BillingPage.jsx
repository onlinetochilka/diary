import React, { useState } from 'react';
import { PageWrapper } from './Pages.jsx';
import { CreditCard, CheckCircle2, Clock, Zap, Lock } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { createSubscriptionPayment } from '../api/databaseApi.js';
import { useToast } from '../components/ui/Toast.jsx';

export default function BillingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState(null);

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
      title="Подписка и тарифы" 
      subtitle="Управление вашим тарифным планом"
      icon={CreditCard}
      iconBgClass="bg-indigo-100"
      iconTextClass="text-indigo-600"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-3 bg-gradient-to-r from-stone-900 to-stone-800 text-white border-0 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap size={120} />
          </div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2">
              {isSubscribed ? 'У вас активная подписка Точилка PRO' : 'Бесплатный тариф'}
            </h2>
            <p className="text-stone-300 mb-6 max-w-xl">
              {isSubscribed 
                ? `Ваша подписка активна до ${formatDate(user?.subscription_until)}. Вы можете добавлять неограниченное количество учеников и пользоваться всеми функциями.` 
                : 'Вы используете бесплатную версию. Лимит: до 5 учеников. Для снятия ограничений перейдите на PRO тариф.'}
            </p>
            
            {!isSubscribed && (
              <div className="flex items-center gap-2 text-sm text-stone-300">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Оставайтесь на бесплатном тарифе столько, сколько потребуется</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <h3 className="text-lg font-bold text-stone-900 mb-4">Выберите тариф</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        
        {/* Monthly Plan */}
        <Card className="flex flex-col h-full border-stone-200 hover:border-indigo-300 transition-colors">
          <div className="p-6 flex-grow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-xl font-bold text-stone-900">Ежемесячный</h4>
                <p className="text-sm text-stone-500">Удобно для старта</p>
              </div>
            </div>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-black text-stone-900">390</span>
              <span className="text-stone-500 font-medium">₽ / мес</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-sm text-stone-700">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <span>Неограниченное количество учеников</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-stone-700">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <span>Полный доступ ко всем функциям</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-stone-700">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <span>Приоритетная поддержка</span>
              </li>
            </ul>
          </div>
          <div className="p-6 pt-0 mt-auto">
            <Button 
              className="w-full bg-stone-900 hover:bg-stone-800 text-white" 
              onClick={() => handleSubscribe('monthly')}
              disabled={loadingPlan === 'monthly' || loadingPlan === 'yearly'}
            >
              {loadingPlan === 'monthly' ? 'Переход к оплате...' : (isSubscribed ? 'Продлить на месяц' : 'Оформить подписку')}
            </Button>
          </div>
        </Card>

        {/* Yearly Plan */}
        <Card className="flex flex-col h-full border-indigo-200 shadow-md relative ring-1 ring-indigo-500/20 overflow-visible">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-sm">
            Выгодно (-25%)
          </div>
          <div className="p-6 flex-grow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-xl font-bold text-indigo-900">Годовой</h4>
                <p className="text-sm text-indigo-600/70">Экономия 1190 ₽ в год</p>
              </div>
            </div>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-black text-indigo-900">3490</span>
              <span className="text-indigo-700/70 font-medium">₽ / год</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-sm text-stone-700">
                <CheckCircle2 size={18} className="text-indigo-500 shrink-0" />
                <span>Всё, что входит в ежемесячный тариф</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-stone-700">
                <CheckCircle2 size={18} className="text-indigo-500 shrink-0" />
                <span>Выгоднее на 25%</span>
              </li>
            </ul>
          </div>
          <div className="p-6 pt-0 mt-auto">
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" 
              onClick={() => handleSubscribe('yearly')}
              disabled={loadingPlan === 'monthly' || loadingPlan === 'yearly'}
            >
              {loadingPlan === 'yearly' ? 'Переход к оплате...' : (isSubscribed ? 'Продлить на год' : 'Оформить на год')}
            </Button>
          </div>
        </Card>

      </div>

      {/* Security Message */}
      <div className="max-w-4xl mt-8 p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start sm:items-center gap-3 text-stone-600 text-sm">
        <Lock size={20} className="text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
        <p>
          <strong>Ваш платеж надежно защищен.</strong> Оплата происходит на зашифрованной стороне платежной системы ЮKassa. 
          Точилка не собирает, не видит и не хранит данные ваших банковских карт.
        </p>
      </div>
    </PageWrapper>
  );
}
