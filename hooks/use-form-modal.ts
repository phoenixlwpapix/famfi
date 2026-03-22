'use client';

import { useState, useCallback } from 'react';
import { type FieldErrors, type ValidationRule, validateForm, hasErrors } from '@/lib/validation';

interface UseFormModalReturn<T extends Record<string, unknown>> {
  modalOpen: boolean;
  editingId: string | null;
  form: T;
  errors: FieldErrors<T>;
  setForm: React.Dispatch<React.SetStateAction<T>>;
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  openAdd: (overrides?: Partial<T>) => void;
  openEdit: (id: string, values: T) => void;
  closeModal: () => void;
  validate: () => boolean;
  clearError: (field: keyof T) => void;
}

export function useFormModal<T extends Record<string, unknown>>(
  initialState: T,
  rules?: ValidationRule<T>[]
): UseFormModalReturn<T> {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<T>(initialState);
  const [errors, setErrors] = useState<FieldErrors<T>>({});

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const openAdd = useCallback(
    (overrides?: Partial<T>) => {
      setEditingId(null);
      setForm({ ...initialState, ...overrides });
      setErrors({});
      setModalOpen(true);
    },
    [initialState]
  );

  const openEdit = useCallback((id: string, values: T) => {
    setEditingId(id);
    setForm(values);
    setErrors({});
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setErrors({});
  }, []);

  const validate = useCallback((): boolean => {
    if (!rules) return true;
    const validationErrors = validateForm(form, rules);
    setErrors(validationErrors);
    return !hasErrors(validationErrors);
  }, [form, rules]);

  const clearError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  return {
    modalOpen,
    editingId,
    form,
    errors,
    setForm,
    setField,
    openAdd,
    openEdit,
    closeModal,
    validate,
    clearError,
  };
}
