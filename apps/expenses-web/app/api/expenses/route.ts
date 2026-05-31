import { ValidationError } from '@getexp/core/errors';
import { problemResponse } from '../_problem';
import { createExpense, type ExpenseStatus, listExpenses, submitSchema } from '../_service';

export async function GET(request: Request): Promise<Response> {
  const status = new URL(request.url).searchParams.get('status') as ExpenseStatus | null;
  return Response.json(await listExpenses(status ?? undefined));
}

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = submitSchema.safeParse(await request.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue?.message ?? 'Invalid body', {
        details: { field: issue?.path.join('.') },
      });
    }
    return Response.json(await createExpense(parsed.data), { status: 201 });
  } catch (error) {
    return problemResponse(error);
  }
}
