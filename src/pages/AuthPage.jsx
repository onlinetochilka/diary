import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { auth } from "../services/firebase.js";
import { generateDemoData } from "../utils/demoData.js";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input, Button } from "../components/ui/index.js";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Пожалуйста, заполните все поля");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Неверный email или пароль. Попробуем еще раз?");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Этот email уже занят. Попробуйте войти.");
      } else if (err.code === "auth/weak-password") {
        setError("Пароль слишком простой. Минимум 6 символов.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Слишком много попыток. Подождите пару минут.");
      } else {
        setError("Что-то пошло не так. Проверьте интернет-соединение.");
      }
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const cred = await signInAnonymously(auth);
      // Let's generate demo data for this new anonymous user
      await generateDemoData(cred.user.uid);
      // They will be automatically redirected by the auth observer in App.jsx
    } catch (err) {
      console.error(err);
      setError("Не удалось запустить демо-режим. Попробуйте позже.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9] p-4 font-sans text-stone-900">
      <div className="w-full max-w-sm">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 ring-1 ring-stone-900/5 p-3">
            <img src="https://raw.githubusercontent.com/onlinetochilka/theme/main/tochilka-logo.svg" alt="Точилка" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {isLogin ? "С возвращением" : "Регистрация"}
          </h1>
          <p className="text-stone-500 mt-1 text-sm">
            {isLogin ? "Войдите в свою учетную запись" : "Создайте новую учетную запись"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-xl shadow-stone-200/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700 ml-1">Email</label>
              <Input
                type="email"
                placeholder="yandji2@mail.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className="h-12 bg-white"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-stone-700">Пароль</label>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-white pr-12"
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

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full h-12 mt-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-lg shadow-stone-900/20"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  {isLogin ? "Вход..." : "Регистрация..."}
                </>
              ) : (
                isLogin ? "Войти" : "Зарегистрироваться"
              )}
            </Button>
            
            <div className="pt-2 text-center">
              <button 
                type="button" 
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
                className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
                disabled={isLoading}
              >
                {isLogin ? "Нет аккаунта? Зарегистрируйтесь" : "Уже есть аккаунт? Войти"}
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
              Попробовать демо-версию
            </Button>
          </form>
        </div>
        
        <p className="text-center text-xs text-stone-400 mt-8">
          Точилка — Планнер для репетиторов
        </p>
      </div>
    </div>
  );
}
