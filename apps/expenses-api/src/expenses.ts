import { randomUUID } from 'node:crypto';
import { type BlobStore, ConflictError, NotFoundError, type Repository } from '@getexp/core';
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
  receiptKey?: string;
  decisionComment?: string;
  createdAt: string;
}

export const submitExpenseSchema = z.object({
  employee: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  category: z.enum(CATEGORIES),
  spentAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'must be a valid date'),
});

export const rejectSchema = z.object({ comment: z.string().min(1) });

export const receiptSchema = z.object({
  contentType: z.string().min(1),
  dataBase64: z.string().min(1),
});

export type SubmitExpenseInput = z.infer<typeof submitExpenseSchema>;

/**
 * Expense business logic. Depends only on the storage *ports* — in the
 * prototype these are in-memory adapters; in production they become Postgres /
 * S3 selected by env, with zero change to this file.
 */
export class ExpenseService {
  constructor(
    private readonly repo: Repository<Expense>,
    private readonly receipts: BlobStore,
  ) {}

  async submit(input: SubmitExpenseInput): Promise<Expense> {
    const expense: Expense = {
      id: randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...input,
    };
    return this.repo.create(expense);
  }

  async list(status?: ExpenseStatus): Promise<Expense[]> {
    const all = await this.repo.list();
    return status ? all.filter((e) => e.status === status) : all;
  }

  async get(id: string): Promise<Expense> {
    const expense = await this.repo.get(id);
    if (!expense) throw new NotFoundError(`Expense ${id} not found`);
    return expense;
  }

  async approve(id: string): Promise<Expense> {
    await this.assertPending(id);
    return this.repo.update(id, { status: 'approved' });
  }

  async reject(id: string, comment: string): Promise<Expense> {
    await this.assertPending(id);
    return this.repo.update(id, { status: 'rejected', decisionComment: comment });
  }

  async attachReceipt(id: string, data: Uint8Array, contentType: string): Promise<Expense> {
    await this.get(id);
    const key = `receipts/${id}`;
    await this.receipts.put(key, data, { contentType });
    return this.repo.update(id, { receiptKey: key });
  }

  async receiptUrl(id: string): Promise<string> {
    const expense = await this.get(id);
    if (!expense.receiptKey) throw new NotFoundError(`Expense ${id} has no receipt`);
    return this.receipts.presignedUrl(expense.receiptKey, { expiresInSeconds: 300 });
  }

  private async assertPending(id: string): Promise<void> {
    const expense = await this.get(id);
    if (expense.status !== 'pending') {
      throw new ConflictError(`Expense ${id} is ${expense.status}; only pending can be decided`);
    }
  }
}
