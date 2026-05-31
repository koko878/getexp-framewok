import { problemResponse } from '../../../_problem';
import { decide } from '../../../_service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { comment?: string };
    return Response.json(await decide(id, 'reject', body.comment ?? 'rejected from web'));
  } catch (error) {
    return problemResponse(error);
  }
}
