import { useState, useEffect, useCallback } from 'react';
import pb from '../services/pocketbase.js';

/**
 * Хук для работы с заметками на день ("Возьми на карандаш")
 */
export function useDayNotes(dateStr) {
  const [notesRecord, setNotesRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load notes for a specific date
  const loadNotes = useCallback(async () => {
    if (!dateStr || !pb.authStore.isValid) {
      setNotesRecord(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const records = await pb.collection('daily_notes').getFullList({
        filter: `date = "${dateStr}" && userId = "${pb.authStore.model.id}"`,
      });
      if (records.length > 0) {
        setNotesRecord(records[0]);
      } else {
        setNotesRecord(null);
      }
    } catch (err) {
      // Игнорируем ошибку 404 коллекции, если она еще не создана
      if (err.status !== 404) {
        console.error('Failed to load notes for', dateStr, err);
      }
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const saveNotes = async (items, color) => {
    if (!pb.authStore.isValid) return;

    try {
      if (notesRecord) {
        const updated = await pb.collection('daily_notes').update(notesRecord.id, {
          items,
          color: color || notesRecord.color
        });
        setNotesRecord(updated);
      } else {
        const created = await pb.collection('daily_notes').create({
          date: dateStr,
          userId: pb.authStore.model.id,
          items,
          color: color || 'Pale Sage'
        });
        setNotesRecord(created);
      }
    } catch (err) {
      console.error('Failed to save notes', err);
      throw err;
    }
  };

  return {
    notesRecord,
    loading,
    saveNotes,
    reloadNotes: loadNotes
  };
}

/**
 * Загрузка всех заметок для отображения индикаторов в расписании
 */
export function useAllDayNotes(dateRangeStrs = []) {
  const [notesByDate, setNotesByDate] = useState({});

  useEffect(() => {
    if (!pb.authStore.isValid) return;

    const fetchAll = async () => {
      try {
        const records = await pb.collection('daily_notes').getFullList({
          filter: `userId = "${pb.authStore.model.id}"`,
        });
        
        const map = {};
        records.forEach(r => {
          map[r.date] = r;
        });
        setNotesByDate(map);
      } catch (err) {
        if (err.status !== 404) {
           console.error('Failed to load all notes', err);
        }
      }
    };
    fetchAll();
  }, [dateRangeStrs.join(',')]); // перезапрашиваем если изменился диапазон дат

  return notesByDate;
}
