import { problemResponse } from '../../../_problem';
import { decide } from '../../../_service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    return Response.json(await decide(id, 'approve'));
  } catch (error) {
    return problemResponse(error);
  }
}
