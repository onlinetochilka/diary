import React, { useState } from "react";
import pb from "../services/pocketbase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { generateDemoData } from "../utils/demoData.js";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Input, Button } from "../components/ui/index.js";

export default function AuthPage() {
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  // "login" | "register" | "forgot"
  const [mode, setMode] = useState("login");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Пожалуйста, заполните все поля");
      return;
    }
    if (mode === "register" && !agreed) {
      setError("Необходимо принять условия пользовательского соглашения");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "login") {
        await pb.collection("users").authWithPassword(email, password);
      } else {
        // Register: create user, then authenticate
        await pb.collection("users").create({
          email,
          password,
          passwordConfirm: password,
        });
        await pb.collection("users").authWithPassword(email, password);
      }
      refreshUser();
    } catch (err) {
      console.error("[AuthPage] auth error:", err?.status, err?.message, JSON.stringify(err?.data));
      const msg = err?.message || err?.response?.message || "";
      const fieldErrors = err?.data?.data || err?.response?.data || {};
      const fieldMessages = Object.entries(fieldErrors)
        .map(([field, info]) => `${field}: ${info?.message || info?.code || JSON.stringify(info)}`)
        .join("; ");

      if (msg.includes("Invalid") || msg.includes("invalid") || msg.includes("authenticate") || msg.includes("Failed to authenticate")) {
        setError("Неверный email или пароль. Нажмите «Забыли пароль?» чтобы сбросить.");
      } else if (fieldErrors.email?.code === "validation_not_unique") {
        setError("Этот email уже зарегистрирован. Войдите или сбросьте пароль.");
      } else if (fieldErrors.email?.code === "validation_invalid_email") {
        setError("Некорректный формат email.");
      } else if (fieldErrors.password?.code === "validation_length_out_of_range") {
        setError("Пароль слишком короткий — минимум 8 символов.");
      } else if (err?.status === 403) {
        setError("Регистрация отключена. Обратитесь к администратору.");
      } else if (err?.status === 429) {
        setError("Слишком много попыток. Подождите пару минут.");
      } else if (err?.status === 0 || msg.includes("fetch") || msg.includes("Failed to fetch")) {
        setError("Нет соединения с сервером. Проверьте интернет.");
      } else if (fieldMessages) {
        setError(`Ошибка: ${fieldMessages}`);
      } else {
        setError(`Ошибка ${err?.status || ""}: ${msg || "Проверьте интернет-соединение"}`);
      }
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Введите email чтобы сбросить пароль");
      return;
    }
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      await pb.collection("users").requestPasswordReset(email);
      setSuccess(`Письмо со ссылкой для сброса пароля отправлено на ${email}. Проверьте почту (и папку «Спам»).`);
    } catch (err) {
      console.error("[AuthPage] password reset error:", err?.status, err?.message);
      const msg = err?.message || "";
      if (err?.status === 0 || msg.includes("fetch") || msg.includes("Failed to fetch")) {
        setError("Нет соединения с сервером.");
      } else if (err?.status === 429) {
        setError("Слишком много попыток. Подождите пару минут.");
      } else {
        // PocketBase не раскрывает наличие email из соображений безопасности — считаем успехом
        setSuccess(`Если аккаунт с ${email} существует, письмо отправлено. Проверьте почту.`);
      }
    }
    setIsLoading(false);
  };

  const [demoStatus, setDemoStatus] = useState("");

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      setDemoStatus("Загрузка демо-режима...");
      pb.authStore.clear();
      localStorage.setItem("isDemoMode", "true");
      localStorage.removeItem("demo_db"); // force fresh regen

      setTimeout(() => { 
        window.location.href = "/";
      }, 300);
    } catch (err) {
      console.error("[AuthPage] Demo login error:", err?.status, err?.message, JSON.stringify(err?.data));
      const msg = err?.message || "";
      if (err?.status === 0 || msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
        setError("Нет соединения с сервером. Проверьте интернет.");
      } else if (err?.status === 429) {
        setError("Слишком много попыток. Подождите пару минут.");
      } else {
        setError(`Не удалось запустить демо-режим (${err?.status || "?"}: ${msg || "неизвестная ошибка"}). Попробуйте позже.`);
      }
      setIsLoading(false);
    }
  };

  // ─── Рендер формы ────────────────────────────────────────────────
  const renderFormContent = () => {
    if (mode === "forgot") {
      return (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 ring-1 ring-stone-900/5 p-3">
              <img src="https://raw.githubusercontent.com/onlinetochilka/theme/main/tochilka-logo.svg" alt="Точилка" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Сброс пароля</h1>
            <p className="text-stone-500 mt-1 text-sm text-center">Введите email — пришлём ссылку</p>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center">{error}</div>}
          {success && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium text-center">{success}</div>}

          {!success && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700 ml-1">Email</label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  className="h-12"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full h-12 mt-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-lg shadow-stone-900/20"
              >
                {isLoading ? <><Loader2 size={18} className="animate-spin mr-2" />Отправляем...</> : "Отправить письмо"}
              </Button>
            </>
          )}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
              disabled={isLoading}
            >
              <ArrowLeft size={14} /> Вернуться ко входу
            </button>
          </div>
        </form>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 ring-1 ring-stone-900/5 p-3">
            <img src="https://raw.githubusercontent.com/onlinetochilka/theme/main/tochilka-logo.svg" alt="Точилка" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {mode === "login" ? "С возвращением" : "Добро пожаловать"}
          </h1>
          <p className="text-stone-500 mt-1 text-sm text-center">
            {mode === "login" ? "Войдите в свою учетную запись" : "Создайте аккаунт, чтобы начать"}
          </p>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center">{error}</div>}

        <div className="space-y-1">
          <label className="text-sm font-medium text-stone-700 ml-1">Email</label>
          <Input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            className="h-12"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center ml-1 mr-1">
            <label className="text-sm font-medium text-stone-700">Пароль</label>
            {mode === "login" && (
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                className="text-xs font-medium text-stone-400 hover:text-stone-700 transition-colors"
                disabled={isLoading}
              >
                Забыли пароль?
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 pr-12"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none p-1 rounded-md"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {mode === "register" && (
          <div className="flex items-start gap-2 pt-2 pb-1">
            <input 
              type="checkbox" 
              id="agree" 
              className="mt-0.5 rounded text-stone-900 focus:ring-stone-900 border-stone-300 w-4 h-4 shrink-0 cursor-pointer"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <label htmlFor="agree" className="text-[11px] text-stone-500 leading-tight cursor-pointer">
              Создавая аккаунт, вы принимаете <a href="/docs/terms.docx" target="_blank" rel="noreferrer" className="text-stone-700 underline hover:text-stone-900">Лицензионное соглашение</a>, <a href="/docs/privacy.docx" target="_blank" rel="noreferrer" className="text-stone-700 underline hover:text-stone-900">Политику конфиденциальности</a> и даете <a href="/docs/consent.docx" target="_blank" rel="noreferrer" className="text-stone-700 underline hover:text-stone-900">согласие на обработку данных</a>.
            </label>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          className="w-full h-12 mt-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-lg shadow-stone-900/20"
        >
          {isLoading ? (
            <><Loader2 size={18} className="animate-spin mr-2 inline" />{mode === "login" ? "Вход..." : "Создаём аккаунт..."}</>
          ) : (
            mode === "login" ? "Войти" : "Начать"
          )}
        </Button>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
            className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
            disabled={isLoading}
          >
            {mode === "login" ? "Ещё нет аккаунта? Создать" : "Уже есть аккаунт? Войти"}
          </button>
        </div>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-stone-200"></div>
          <span className="flex-shrink-0 mx-4 text-stone-400 text-xs">ИЛИ</span>
          <div className="flex-grow border-t border-stone-200"></div>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={isLoading}
          onClick={handleDemoLogin}
          className="w-full h-12 bg-white hover:bg-stone-50 text-stone-700 rounded-xl border border-stone-200 shadow-sm"
        >
          {isLoading && demoStatus ? (
            <><Loader2 size={16} className="animate-spin mr-2 inline shrink-0" /><span className="truncate">{demoStatus}</span></>
          ) : (
            "Попробовать демо-версию"
          )}
        </Button>
      </form>
    );
  };

  return (
    <div className="min-h-screen w-full flex font-sans text-stone-900 bg-[#FAFAF9]">
      {/* Левая часть - Визуальная (скрыта на мобилках) */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-stone-900 overflow-hidden items-center justify-center">
        <img 
          src="/auth_bg.jpg" 
          alt="Abstract Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        {/* Градиентный оверлей для текста */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/20 to-transparent" />
        
        <div className="relative z-10 p-12 mt-auto w-full max-w-lg">
          <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-md leading-tight">
            Точилка — ваш<br />умный ежедневник
          </h2>
          <p className="text-lg text-white/90 drop-shadow-md">
            Все ученики, расписания и финансы под полным контролем.
          </p>
        </div>
      </div>

      {/* Правая часть - Форма */}
      <div className="w-full lg:w-[55%] flex flex-col items-center justify-center p-6 sm:p-12 relative bg-[#FAFAF9]">
        <div className="w-full max-w-[400px]">
          <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-xl shadow-stone-200/40 ring-1 ring-stone-900/5">
            {renderFormContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
