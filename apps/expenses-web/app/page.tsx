'use client';

import { type FormEvent, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const CATEGORIES = ['travel', 'meals', 'lodging', 'supplies', 'other'] as const;
const STATUSES = ['all', 'pending', 'approved', 'rejected'] as const;

interface Expense {
  id: string;
  employee: string;
  amount: number;
  currency: string;
  category: string;
  spentAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const badgeColor: Record<Expense['status'], string> = {
  pending: '#b45309',
  approved: '#15803d',
  rejected: '#b91c1c',
};

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(status: (typeof STATUSES)[number]) {
    setLoading(true);
    setError(null);
    try {
      const qs = status === 'all' ? '' : `?status=${status}`;
      const res = await fetch(`${API}/expenses${qs}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      setExpenses(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filter);
  }, [filter]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      employee: String(form.get('employee')),
      amount: Number(form.get('amount')),
      currency: String(form.get('currency')),
      category: String(form.get('category')),
      spentAt: String(form.get('spentAt')),
    };
    const res = await fetch(`${API}/expenses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      event.currentTarget.reset();
      void load(filter);
    } else {
      const problem = await res.json();
      setError(problem.detail ?? 'submit failed');
    }
  }

  async function decide(id: string, action: 'approve' | 'reject') {
    const init: RequestInit = { method: 'POST' };
    if (action === 'reject') {
      init.headers = { 'content-type': 'application/json' };
      init.body = JSON.stringify({ comment: 'rejected from web' });
    }
    await fetch(`${API}/expenses/${id}/${action}`, init);
    void load(filter);
  }

  return (
    <main
      style={{ fontFamily: 'system-ui', maxWidth: 760, margin: '2rem auto', padding: '0 1rem' }}
    >
      <h1>Notes de frais</h1>

      <form onSubmit={submit} style={{ display: 'grid', gap: 8, margin: '1rem 0' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input name="employee" placeholder="employé" required />
          <input name="amount" type="number" step="0.01" placeholder="montant" required />
          <input name="currency" defaultValue="EUR" maxLength={3} required style={{ width: 60 }} />
          <select name="category">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input name="spentAt" type="date" required />
          <button type="submit">Soumettre</button>
        </div>
      </form>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            style={{ fontWeight: filter === s ? 700 : 400 }}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p style={{ color: '#b91c1c' }}>Erreur : {error}</p>}
      {loading ? (
        <p>Chargement…</p>
      ) : expenses.length === 0 ? (
        <p>Aucune dépense.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
          {expenses.map((e) => (
            <li
              key={e.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                <strong>
                  {e.amount} {e.currency}
                </strong>{' '}
                · {e.category} · {e.employee} · {e.spentAt}
              </span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: badgeColor[e.status], fontWeight: 600 }}>{e.status}</span>
                {e.status === 'pending' && (
                  <>
                    <button type="button" onClick={() => decide(e.id, 'approve')}>
                      ✓
                    </button>
                    <button type="button" onClick={() => decide(e.id, 'reject')}>
                      ✗
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
