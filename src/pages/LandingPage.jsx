import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, DollarSign, Users, BookOpen,
  ChevronDown, ChevronRight, Shield, Sparkles,
  ArrowRight, Check, X, Menu, X as XIcon,
  Clock, Send, FileText, BarChart3, Zap,
  ExternalLink, MessageCircle,
} from "lucide-react";
import "./landing.css";

/* ─── Intersection Observer hook ─────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ─── Data ───────────────────────────────────────────────────────── */
const SITUATIONS = [
  {
    emoji: "💸",
    question: "«Кто мне должен за уроки? Не помню, кто платил»",
    answer: "Автоматический баланс каждого ученика. Экран должников — видно сразу, кому пора напомнить.",
  },
  {
    emoji: "📊",
    question: "«Родители просят отчёт о прогрессе ребёнка»",
    answer: "PDF-отчёт формируется за секунды. Или отправьте гостевую ссылку — родители увидят прогресс сами, без регистрации.",
  },
  {
    emoji: "📚",
    question: "«Учебные планы в голове, блокноте и трёх файлах»",
    answer: "Редактор курсов: модули → темы → задания. Привяжите программу к ученику и следите, сколько пройдено.",
  },
  {
    emoji: "😰",
    question: "«Неловко напоминать об оплате»",
    answer: "Автоматическая рассылка вежливых напоминаний по гибкому расписанию — и о долгах, и о несданных ДЗ.",
  },
];

const FEATURES = [
  {
    icon: Calendar,
    title: "Расписание, которое работает на вас",
    description: "Перенесите урок на другой день за секунду — просто перетащите карточку мышкой. Отслеживайте свободные окна в расписании. Отметьте проведённый урок в одно касание — баланс пересчитается автоматически.",
    image: "/landing_schedule.jpg",
    color: "#B36A5E",
  },
  {
    icon: BarChart3,
    title: "Финансы под контролем",
    description: "Баланс каждого ученика считается автоматически. Должники вынесены на отдельный экран. Автоматическая рассылка напоминаний об оплате — настройте расписание, и Точилка сама отправит вежливое сообщение.",
    image: "/landing_finance.jpg",
    color: "#426B5C",
  },
  {
    icon: Users,
    title: "Портал для родителей",
    description: "Отправьте родителям гостевую ссылку — они увидят прогресс ребёнка без регистрации: пройденные темы, статус ДЗ, баланс. Настройте автоматическую рассылку отчётов по расписанию.",
    image: "/landing_portal.jpg",
    color: "#1B4F72",
  },
  {
    icon: BookOpen,
    title: "Программы обучения",
    description: "Создайте структуру курса: модули, темы, задания. Привяжите программу к ученику — и видите процент освоения. Импортируйте существующую программу из Excel за минуту.",
    image: "/landing_programs.jpg",
    color: "#735B7A",
  },
];

const FREE_FEATURES = [
  "Расписание (месяц / неделя / день)",
  "Перетаскивание уроков между днями",
  "До 5 активных учеников",
  "Финансы: баланс, долги",
  "Все KPI-метрики на дашборде",
  "Деморежим",
];
const FREE_MISSING = [
  "Программы / курсы",
  "Портал для родителей",
  "PDF-отчёты об успеваемости",
  "Автоматическая рассылка напоминаний",
  "Excel-импорт программ",
];

const PRO_FEATURES = [
  "Всё из тарифа «Старт»",
  "Ученики без ограничений",
  "Группы",
  "Программы / курсы",
  "Портал для родителей",
  "PDF-отчёты об успеваемости",
  "Авторассылка отчётов родителям",
  "Авторассылка напоминаний о долгах",
  "Авторассылка напоминаний о ДЗ",
  "Excel-импорт/экспорт программ",
  "Поддержка в Telegram-сообществе",
];

const FAQ_ITEMS = [
  {
    q: "Что такое Точилка?",
    a: "Рабочее пространство для репетитора: расписание, финансы, учебные программы и связь с родителями в одном окне.",
  },
  {
    q: "Сколько стоит?",
    a: "Базовый тариф «Старт» — бесплатно навсегда (до 5 учеников). Тариф «Репетитор» — 390 ₽/мес или 3 490 ₽/год.",
  },
  {
    q: "Могу ли я попробовать бесплатно?",
    a: "Да. Тариф «Старт» бесплатен навсегда. Также есть деморежим с готовыми данными — можно посмотреть все возможности без регистрации.",
  },
  {
    q: "Как оплатить подписку?",
    a: "Через СБП или банковской картой. Оплата происходит прямо на сайте через защищённую форму ЮKassa.",
  },
  {
    q: "Мои данные в безопасности?",
    a: "Да. Данные хранятся на серверах в России (152-ФЗ). Точилка не использует ИИ и не передаёт данные третьим лицам.",
  },
  {
    q: "Работает ли на телефоне?",
    a: "Да. Точилка — веб-приложение, адаптированное под любой экран. Работает в браузере телефона, планшета и компьютера.",
  },
  {
    q: "Есть ли сообщество?",
    a: "Да — Telegram-сообщество «Лайфхаки от Точилки». Там можно задать вопрос, предложить идею и обсудить с коллегами.",
  },
];

/* ─── Navbar ─────────────────────────────────────────────────────── */
function Navbar({ onLogin, onDemo }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className={`landing-nav ${scrolled ? "landing-nav--scrolled" : ""}`}>
      <div className="landing-nav__inner">
        <div className="landing-nav__brand">
          <img
            src="https://raw.githubusercontent.com/onlinetochilka/theme/main/tochilka-logo.svg"
            alt="Точилка"
            className="landing-nav__logo"
          />
          <span className="landing-nav__name">Точилка<span className="landing-nav__dot">.</span> Ежедневник</span>
        </div>

        <div className={`landing-nav__links ${mobileOpen ? "landing-nav__links--open" : ""}`}>
          <button onClick={() => scrollTo("features")} className="landing-nav__link">Возможности</button>
          <button onClick={() => scrollTo("pricing")} className="landing-nav__link">Тарифы</button>
          <button onClick={() => scrollTo("faq")} className="landing-nav__link">Вопросы</button>
          <div className="landing-nav__buttons-mobile">
            <button onClick={onDemo} className="landing-nav__btn landing-nav__btn--ghost">Демо</button>
            <button onClick={onLogin} className="landing-nav__btn landing-nav__btn--primary">Войти</button>
          </div>
        </div>

        <div className="landing-nav__buttons">
          <button onClick={onDemo} className="landing-nav__btn landing-nav__btn--ghost">Демо</button>
          <button onClick={onLogin} className="landing-nav__btn landing-nav__btn--primary">Войти</button>
        </div>

        <button className="landing-nav__burger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Меню">
          {mobileOpen ? <XIcon size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </nav>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────── */
function Hero({ onRegister, onDemo }) {
  const [ref, vis] = useReveal(0.1);
  return (
    <section className="landing-hero" ref={ref}>
      <div className={`landing-hero__content ${vis ? "landing-reveal" : "landing-reveal--hidden"}`}>
        <div className="landing-hero__badge">
          <Sparkles size={14} />
          <span>Ранний доступ — 3 месяца бесплатно</span>
        </div>
        <h1 className="landing-hero__title">
          Ведите учеников,<br />а не таблицы
        </h1>
        <p className="landing-hero__subtitle">
          Расписание, финансы, программы обучения и отчёты родителям — всё в&nbsp;одном рабочем пространстве репетитора. Без&nbsp;ИИ&nbsp;— только ваши реальные данные.
        </p>
        <div className="landing-hero__actions">
          <button onClick={onRegister} className="landing-btn landing-btn--primary landing-btn--lg">
            Попробовать бесплатно <ArrowRight size={18} />
          </button>
          <button onClick={onDemo} className="landing-btn landing-btn--ghost landing-btn--lg">
            Посмотреть демо
          </button>
        </div>
      </div>
      <div className={`landing-hero__visual ${vis ? "landing-reveal landing-reveal--delay-1" : "landing-reveal--hidden"}`}>
        <img src="/landing_schedule.jpg" alt="Расписание Точилки" className="landing-hero__image" />
        <div className="landing-hero__image-glow" />
      </div>
    </section>
  );
}

/* ─── Situations ─────────────────────────────────────────────────── */
function Situations() {
  const [ref, vis] = useReveal();
  return (
    <section className="landing-section" ref={ref}>
      <div className={`landing-section__header ${vis ? "landing-reveal" : "landing-reveal--hidden"}`}>
        <h2 className="landing-section__title">Знакомые ситуации?</h2>
        <p className="landing-section__subtitle">Точилка решает их за вас</p>
      </div>
      <div className="landing-situations">
        {SITUATIONS.map((s, i) => {
          const [cRef, cVis] = useReveal(0.2);
          return (
            <div
              key={i}
              ref={cRef}
              className={`landing-situation-card ${cVis ? "landing-reveal" : "landing-reveal--hidden"}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="landing-situation-card__emoji">{s.emoji}</div>
              <p className="landing-situation-card__question">{s.question}</p>
              <p className="landing-situation-card__answer">{s.answer}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Features ───────────────────────────────────────────────────── */
function Features() {
  return (
    <section className="landing-section landing-section--alt" id="features">
      <div className="landing-section__header">
        <h2 className="landing-section__title">Что умеет Точилка</h2>
        <p className="landing-section__subtitle">Четыре модуля, которые заменяют десяток приложений</p>
      </div>
      <div className="landing-features">
        {FEATURES.map((f, i) => {
          const [ref, vis] = useReveal(0.15);
          const Icon = f.icon;
          const reversed = i % 2 === 1;
          return (
            <div
              key={i}
              ref={ref}
              className={`landing-feature ${reversed ? "landing-feature--reversed" : ""} ${vis ? "landing-reveal" : "landing-reveal--hidden"}`}
            >
              <div className="landing-feature__text">
                <div className="landing-feature__icon-wrap" style={{ background: f.color + "18", color: f.color }}>
                  <Icon size={22} />
                </div>
                <h3 className="landing-feature__title">{f.title}</h3>
                <p className="landing-feature__description">{f.description}</p>
              </div>
              <div className="landing-feature__image-wrap">
                <img src={f.image} alt={f.title} className="landing-feature__image" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── No AI Block ────────────────────────────────────────────────── */
function NoAiBlock() {
  const [ref, vis] = useReveal();
  return (
    <section className={`landing-noai ${vis ? "landing-reveal" : "landing-reveal--hidden"}`} ref={ref}>
      <div className="landing-noai__inner">
        <div className="landing-noai__icon">
          <Shield size={32} />
        </div>
        <div className="landing-noai__content">
          <h3 className="landing-noai__title">Без ИИ — только факты</h3>
          <p className="landing-noai__text">
            В Точилке нет искусственного интеллекта. Все данные — ваши реальные цифры.
            Отчёты формируются из фактических записей: проведённые уроки, полученные оплаты,
            пройденные темы. Никаких «умных» догадок, галлюцинаций и выдуманной статистики.
            Только то, что было на самом деле.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ────────────────────────────────────────────────────── */
function Pricing({ onRegister }) {
  const [annual, setAnnual] = useState(false);
  const [ref, vis] = useReveal();

  return (
    <section className="landing-section" id="pricing" ref={ref}>
      <div className={`landing-section__header ${vis ? "landing-reveal" : "landing-reveal--hidden"}`}>
        <h2 className="landing-section__title">Тарифы</h2>
        <p className="landing-section__subtitle">Начните бесплатно, растите с нами</p>
        <div className="landing-pricing-toggle">
          <span className={!annual ? "landing-pricing-toggle__active" : ""}>Месяц</span>
          <button
            className={`landing-pricing-toggle__switch ${annual ? "landing-pricing-toggle__switch--on" : ""}`}
            onClick={() => setAnnual(!annual)}
            aria-label="Переключить период"
          >
            <div className="landing-pricing-toggle__knob" />
          </button>
          <span className={annual ? "landing-pricing-toggle__active" : ""}>
            Год <span className="landing-pricing-toggle__badge">−25%</span>
          </span>
        </div>
      </div>

      <div className="landing-pricing-cards">
        {/* Free */}
        <div className={`landing-pricing-card ${vis ? "landing-reveal landing-reveal--delay-1" : "landing-reveal--hidden"}`}>
          <div className="landing-pricing-card__header">
            <h3 className="landing-pricing-card__name">Старт</h3>
            <div className="landing-pricing-card__price">
              <span className="landing-pricing-card__amount">0 ₽</span>
              <span className="landing-pricing-card__period">навсегда</span>
            </div>
            <p className="landing-pricing-card__desc">Для знакомства с Точилкой</p>
          </div>
          <ul className="landing-pricing-card__features">
            {FREE_FEATURES.map((f, i) => (
              <li key={i} className="landing-pricing-card__feature">
                <Check size={16} className="landing-pricing-card__check" /> {f}
              </li>
            ))}
            {FREE_MISSING.map((f, i) => (
              <li key={`m${i}`} className="landing-pricing-card__feature landing-pricing-card__feature--missing">
                <X size={16} className="landing-pricing-card__x" /> {f}
              </li>
            ))}
          </ul>
          <button onClick={onRegister} className="landing-btn landing-btn--outline landing-btn--full">
            Начать бесплатно
          </button>
        </div>

        {/* Pro */}
        <div className={`landing-pricing-card landing-pricing-card--featured ${vis ? "landing-reveal landing-reveal--delay-2" : "landing-reveal--hidden"}`}>
          <div className="landing-pricing-card__ribbon">Ранний доступ — 3 мес. бесплатно</div>
          <div className="landing-pricing-card__header">
            <h3 className="landing-pricing-card__name">Репетитор</h3>
            <div className="landing-pricing-card__price">
              {annual ? (
                <>
                  <span className="landing-pricing-card__amount">3 490 ₽</span>
                  <span className="landing-pricing-card__period">/год</span>
                  <span className="landing-pricing-card__old-price">4 680 ₽</span>
                </>
              ) : (
                <>
                  <span className="landing-pricing-card__amount">390 ₽</span>
                  <span className="landing-pricing-card__period">/мес</span>
                </>
              )}
            </div>
            <p className="landing-pricing-card__desc">Полный набор инструментов</p>
          </div>
          <ul className="landing-pricing-card__features">
            {PRO_FEATURES.map((f, i) => (
              <li key={i} className="landing-pricing-card__feature">
                <Check size={16} className="landing-pricing-card__check" /> {f}
              </li>
            ))}
          </ul>
          <button onClick={onRegister} className="landing-btn landing-btn--primary landing-btn--full">
            Попробовать бесплатно <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─────────────────────────────────────────────────────────── */
function FaqSection() {
  const [open, setOpen] = useState(null);
  const [ref, vis] = useReveal();
  return (
    <section className="landing-section landing-section--alt" id="faq" ref={ref}>
      <div className={`landing-section__header ${vis ? "landing-reveal" : "landing-reveal--hidden"}`}>
        <h2 className="landing-section__title">Вопросы и ответы</h2>
      </div>
      <div className={`landing-faq ${vis ? "landing-reveal landing-reveal--delay-1" : "landing-reveal--hidden"}`}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className={`landing-faq__item ${open === i ? "landing-faq__item--open" : ""}`}>
            <button className="landing-faq__question" onClick={() => setOpen(open === i ? null : i)}>
              <span>{item.q}</span>
              <ChevronDown size={18} className="landing-faq__chevron" />
            </button>
            <div className="landing-faq__answer">
              <p>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── CTA Banner ─────────────────────────────────────────────────── */
function CtaBanner({ onRegister, onDemo }) {
  const [ref, vis] = useReveal();
  return (
    <section className={`landing-cta ${vis ? "landing-reveal" : "landing-reveal--hidden"}`} ref={ref}>
      <h2 className="landing-cta__title">Готовы навести порядок в&nbsp;работе?</h2>
      <p className="landing-cta__text">Присоединяйтесь к репетиторам, которые уже используют Точилку</p>
      <div className="landing-cta__actions">
        <button onClick={onRegister} className="landing-btn landing-btn--white landing-btn--lg">
          Начать бесплатно <ArrowRight size={18} />
        </button>
        <button onClick={onDemo} className="landing-btn landing-btn--ghost-white landing-btn--lg">
          Посмотреть демо
        </button>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer__inner">
        <div className="landing-footer__brand">
          <img
            src="https://raw.githubusercontent.com/onlinetochilka/theme/main/tochilka-logo.svg"
            alt="Точилка"
            className="landing-footer__logo"
          />
          <span className="landing-footer__name">Точилка<span className="landing-nav__dot">.</span> Ежедневник</span>
        </div>
        <div className="landing-footer__links">
          <a href="/docs/terms.html" target="_blank" rel="noreferrer">Лицензионное соглашение</a>
          <a href="/docs/privacy.html" target="_blank" rel="noreferrer">Политика конфиденциальности</a>
          <a href="/docs/consent.html" target="_blank" rel="noreferrer">Согласие на обработку данных</a>
        </div>
        <div className="landing-footer__contacts">
          <a href="mailto:info@tochilka.app">info@tochilka.app</a>
          <a href="https://t.me/tochilka_online" target="_blank" rel="noreferrer" className="landing-footer__tg">
            <MessageCircle size={16} /> Лайфхаки от Точилки
          </a>
        </div>
        <p className="landing-footer__copy">© 2026 Докторова С.В.</p>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  LandingPage                                                      */
/* ═══════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();

  const handleLogin = () => navigate("/login");
  const handleRegister = () => navigate("/login?mode=register");
  const handleDemo = () => {
    localStorage.setItem("isDemoMode", "true");
    localStorage.removeItem("demo_db");
    setTimeout(() => { window.location.href = "/"; }, 300);
  };

  return (
    <div className="landing-page">
      <Navbar onLogin={handleLogin} onDemo={handleDemo} />
      <Hero onRegister={handleRegister} onDemo={handleDemo} />
      <Situations />
      <Features />
      <NoAiBlock />
      <Pricing onRegister={handleRegister} />
      <FaqSection />
      <CtaBanner onRegister={handleRegister} onDemo={handleDemo} />
      <Footer />
    </div>
  );
}
