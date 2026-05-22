export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { login, password } = await context.request.json();
    if (!login || !password) {
      return new Response(JSON.stringify({ error: 'Логин и пароль обязательны' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Хешируем пароль
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Загружаем объект пользователей из KV
    let users = await context.env.MY_DIARY_KV.get('users', { type: 'json' });
    if (!users) users = {};

    if (users[login]) {
      // Пользователь существует — проверяем пароль
      if (users[login] !== passwordHash) {
        return new Response(JSON.stringify({ error: 'Неверный пароль' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Новый пользователь — регистрируем
      users[login] = passwordHash;
      await context.env.MY_DIARY_KV.put('users', JSON.stringify(users));
    }

    // Создаём сессионный токен (случайная строка)
    const token = crypto.randomUUID();
    // Сохраняем связку токен -> логин в KV с TTL 30 дней (2592000 секунд)
    await context.env.MY_DIARY_KV.put(`session_${token}`, login, { expirationTtl: 2592000 });

    return new Response(JSON.stringify({ token, login }), {
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
