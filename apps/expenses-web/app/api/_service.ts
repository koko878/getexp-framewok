// Self-contained expenses logic for the deployable demo: Next route handlers
// reuse the framework's @getexp/core ports (in-memory adapters here). This lets
// the whole prototype deploy as ONE Vercel app — no separate API to host.
//
// Imported from subpaths (`/storage`, `/errors`) so the web bundle never pulls
// in the Node-only logger. Production would share this domain via a package or
// call the standalone Fastify service (apps/expenses-api).
import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '@getexp/core/errors';
import { InMemoryRepository } from '@getexp/core/storage';
import { z } from 'zod';

export const CATEGORIES = ['travel', 'meals', 'lodging', 'supplies', 'other'] as const;
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: string;
  employee: string;
  amount: number;
  currency: string;
  category: (typeof CATEGORIES)[number];
  spentAt: string;
  status: ExpenseStatus;
  decisionComment?: string;
  createdAt: string;
}

export const submitSchema = z.object({
  employee: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  category: z.enum(CATEGORIES),
  spentAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'must be a valid date'),
});

const repo = new InMemoryRepository<Expense>((e) => e.id);
let seeded = false;

async function seed(): Promise<void> {
  if (seeded) return;
  seeded = true;
  await repo.create({
    id: randomUUID(),
    employee: 'ada',
    amount: 42.5,
    currency: 'EUR',
    category: 'meals',
    spentAt: '2026-05-20',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  await repo.create({
    id: randomUUID(),
    employee: 'grace',
    amount: 130,
    currency: 'EUR',
    category: 'travel',
    spentAt: '2026-05-18',
    status: 'approved',
    createdAt: new Date().toISOString(),
  });
}

export async function listExpenses(status?: ExpenseStatus): Promise<Expense[]> {
  await seed();
  const all = await repo.list();
  return status ? all.filter((e) => e.status === status) : all;
}

export async function createExpense(input: z.infer<typeof submitSchema>): Promise<Expense> {
  await seed();
  const expense: Expense = {
    id: randomUUID(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...input,
  };
  return repo.create(expense);
}

export async function decide(
  id: string,
  action: 'approve' | 'reject',
  comment?: string,
): Promise<Expense> {
  await seed();
  const expense = await repo.get(id);
  if (!expense) throw new NotFoundError(`Expense ${id} not found`);
  if (expense.status !== 'pending') {
    throw new ConflictError(`Expense ${id} is ${expense.status}; only pending can be decided`);
  }
  return action === 'approve'
    ? repo.update(id, { status: 'approved' })
    : repo.update(id, { status: 'rejected', decisionComment: comment });
}
