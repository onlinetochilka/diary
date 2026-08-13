import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import pb from "../services/pocketbase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { generateDemoData } from "../utils/demoData.js";
import { Eye, EyeOff, Loader2, ArrowLeft, Home, Crown } from "lucide-react";
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';

export default function AuthPage() {
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [searchParams] = useSearchParams();
  
  const token = searchParams.get("token");
  const action = searchParams.get("action"); // 'reset-password' | 'verify-email' | 'confirm-email-change'
  const plan = searchParams.get("plan");
  
  const getInitialMode = () => {
    if (token) {
      if (action === "verify-email") return "verify";
      if (action === "confirm-email-change") return "confirm-email";
      return "reset"; // default for backwards compatibility
    }
    return searchParams.get("mode") === "register" ? "register" : "login";
  };
  
  const [mode, setMode] = useState(getInitialMode());
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically execute verification actions when component mounts with token
    if (token && (mode === "verify" || mode === "confirm-email")) {
      handleAutoActions();
    }
  }, [token, mode]);

  const handleAutoActions = async () => {
    setIsLoading(true);
    try {
      if (mode === "verify") {
        await pb.collection("users").confirmVerification(token);
        setSuccess("Ваш email успешно подтверждён! Теперь вы можете войти.");
      } else if (mode === "confirm-email") {
        await pb.collection("users").confirmEmailChange(token);
        setSuccess("Ваш email успешно изменён! Войдите с новым адресом.");
      }
      setMode("login");
    } catch (err) {
      console.error("[AuthPage] auto action error:", err);
      setError("Ссылка недействительна или устарела. Попробуйте запросить её снова.");
      setMode("login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === "verify" || mode === "confirm-email") return; // Handled automatically

    if (mode !== "reset" && (!email || !password)) {
      setError("Пожалуйста, заполните все поля");
      return;
    }
    if (mode === "reset" && (!password || !passwordConfirm)) {
      setError("Пожалуйста, заполните оба поля");
      return;
    }
    if (mode === "reset" && password !== passwordConfirm) {
      setError("Пароли не совпадают");
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
      if (mode === "reset") {
        await pb.collection("users").confirmPasswordReset(token, password, passwordConfirm);
        setSuccess("Пароль успешно изменён! Теперь вы можете войти.");
        setMode("login");
        setPassword("");
        setPasswordConfirm("");
        setIsLoading(false);
        return;
      } else if (mode === "login") {
        await pb.collection("users").authWithPassword(email, password);
        if (!rememberMe) localStorage.setItem("dont_remember_me", "true");
        else localStorage.removeItem("dont_remember_me");
      } else {
        // Register: create user, then authenticate
        await pb.collection("users").create({
          email,
          name,
          password,
          passwordConfirm: password,
        });
        await pb.collection("users").authWithPassword(email, password);
        if (!rememberMe) localStorage.setItem("dont_remember_me", "true");
        else localStorage.removeItem("dont_remember_me");
      }
      refreshUser();
      if (mode === "register" && plan === "pro") {
        navigate('/billing?checkout=monthly');
      }
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
      setDemoStatus("Загрузка деморежима...");
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
        setError(`Не удалось запустить деморежим (${err?.status || "?"}: ${msg || "неизвестная ошибка"}). Попробуйте позже.`);
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
              <img src="https://raw.githubusercontent.com/onlinetochilka/theme/main/tochilka-logo.svg" alt="Точилка" className="w-full h-full object-contain" style={{ animation: 'spin-gear 12s linear infinite' }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Забыли пароль?</h1>
            <p className="text-stone-500 mt-1 text-sm text-center">Отправим ссылку для сброса пароля на вашу почту</p>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center">{error}</div>}
          {success && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium text-center">{success}</div>}

          {!success && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700 ml-1">Электронная почта</label>
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
            <Button
              variant="ghost"
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className="text-stone-500 hover:text-stone-800"
              disabled={isLoading}
            >
              <ArrowLeft size={14} /> Вернуться ко входу
            </Button>
          </div>
        </form>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 ring-1 ring-stone-900/5 p-3">
            <img src="https://raw.githubusercontent.com/onlinetochilka/theme/main/tochilka-logo.svg" alt="Точилка" className="w-full h-full object-contain" style={{ animation: 'spin-gear 12s linear infinite' }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {mode === "reset" ? "Новый пароль" : (mode === "login" ? "С возвращением" : "Добро пожаловать!")}
          </h1>
          <p className="text-stone-500 mt-1 text-sm text-center">
            {mode === "reset" ? "Придумайте новый пароль для аккаунта" : (mode === "login" ? "Войдите в свою учётную запись" : "Создайте аккаунт, чтобы навести порядок в расписании")}
          </p>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center">{error}</div>}

        {mode === "register" && plan === "pro" && (
          <div className="mb-6 p-3 bg-[#164a63]/5 border border-[#164a63]/20 rounded-xl flex items-center justify-center gap-2 text-[#164a63]">
            <Crown size={18} />
            <span className="text-sm font-medium">Вы выбрали тариф: <b>Репетитор</b></span>
          </div>
        )}

        {mode === "register" && (
          <div className="space-y-1 mb-4">
            <label className="text-sm font-medium text-stone-700 ml-1">Имя</label>
            <Input
              type="text"
              placeholder="Ваше имя (по желанию)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
              disabled={isLoading}
            />
          </div>
        )}

        {mode !== "reset" && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-stone-700 ml-1">Электронная почта</label>
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
        )}

        <div className="space-y-1">
          <div className="flex justify-between items-center ml-1 mr-1">
            <label className="text-sm font-medium text-stone-700">{mode === "reset" ? "Новый пароль" : "Пароль"}</label>
            {mode === "login" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                className="h-auto px-2 py-1 text-xs text-stone-400 hover:text-stone-700 hover:bg-transparent"
                disabled={isLoading}
              >
                Забыли пароль?
              </Button>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 text-stone-400 hover:text-stone-600 rounded-md"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          </div>
        </div>

        {mode === "login" && (
          <div className="flex items-center gap-2 pt-1 pb-1">
            <input 
              type="checkbox" 
              id="remember" 
              className="rounded text-stone-900 focus:ring-stone-900 border-stone-300 w-4 h-4 shrink-0 cursor-pointer"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember" className="text-[13px] text-stone-600 cursor-pointer select-none">
              Запомнить меня на этом устройстве
            </label>
          </div>
        )}

        {mode === "reset" && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-stone-700 ml-1">Подтвердите пароль</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="h-12 pr-12"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

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
              Создавая аккаунт, вы принимаете <a href="/docs/terms.html" target="_blank" rel="noreferrer" className="text-stone-700 underline hover:text-stone-900">Лицензионное соглашение</a>, <a href="/docs/privacy.html" target="_blank" rel="noreferrer" className="text-stone-700 underline hover:text-stone-900">Политику конфиденциальности</a> и даете <a href="/docs/consent.html" target="_blank" rel="noreferrer" className="text-stone-700 underline hover:text-stone-900">согласие на обработку данных</a>.
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
            <><Loader2 size={18} className="animate-spin mr-2 inline" />{mode === "reset" ? "Сохраняем..." : (mode === "login" ? "Вход..." : "Создаём аккаунт...")}</>
          ) : (
            mode === "reset" ? "Сохранить пароль" : (mode === "login" ? "Войти" : "Начать")
          )}
        </Button>

        {mode !== "reset" && (
          <div className="pt-2 text-center">
            <Button
              variant="ghost"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
              className="text-stone-500 hover:text-stone-800"
              disabled={isLoading}
            >
              {mode === "login" ? "Ещё нет аккаунта? Создать" : "Уже есть аккаунт? Войти"}
            </Button>
          </div>
        )}

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
            "Войти без регистрации (деморежим)"
          )}
        </Button>
      </form>
    );
  };

  return (
    <div className="min-h-screen w-full flex text-stone-900 bg-[#FAFAF9]">
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
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-stone-400 hover:text-stone-700 mb-4 px-2"
          >
            <ArrowLeft size={14} /> На главную
          </Button>
          <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-xl shadow-stone-200/40 ring-1 ring-stone-900/5">
            {renderFormContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
