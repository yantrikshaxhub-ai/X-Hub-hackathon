export const dynamic = 'force-dynamic';
export async function POST() {
  return Response.json({ success: true }, {
    headers: { 'Set-Cookie': 'xhub_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0' }
  });
}

