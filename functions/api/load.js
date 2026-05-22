export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Извлекаем токен из заголовка Authorization: Bearer <токен>
    const authHeader = context.request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Требуется авторизация' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Получаем логин по токену
    const login = await context.env.MY_DIARY_KV.get(`session_${token}`);
    if (!login) {
      return new Response(JSON.stringify({ error: 'Сессия истекла, войдите заново' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Загружаем данные пользователя
    const data = await context.env.MY_DIARY_KV.get(`diary_data_${login}`, { type: 'json' });
    return new Response(JSON.stringify(data || {}), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
