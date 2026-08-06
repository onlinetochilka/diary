import React, { useState, useEffect } from 'react';

const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const dayNames = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

export function CurrentDateTitle() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return <>{`${now.getDate()} ${monthNames[now.getMonth()]}`}</>;
}

export function CurrentDateSubtitle() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const dayStr = dayNames[now.getDay()];
  return <>{dayStr.charAt(0).toUpperCase() + dayStr.slice(1)}</>;
}
