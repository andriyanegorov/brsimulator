# Telegram Notifications для Приватных Сообщений

## Описание функции
Когда игрок получает личное сообщение в игре, ему сразу отправляется уведомление в Telegram с информацией о том, кто и что ему написал.

## Как это работает

### 1️⃣ Игрок отправляет сообщение
- Игрок написал кому-то ЛС в интерфейсе игры
- Сообщение сохраняется в таблице `personal_messages` (Supabase)

### 2️⃣ Триггер отправки уведомления
- После успешной вставки сообщения, `script.js` вызывает функцию `notifyTelegramAboutMessage()`
- Функция отправляет POST запрос на webhook: `/api/notify-private-message`

### 3️⃣ Обработка на сервере
- Endpoint `api/notify-private-message.js` получает:
  - `receiver_id` - ID получателя сообщения
  - `sender_nick` - Ник отправителя
  - `message` - Текст сообщения (до 100 символов в превью)

### 4️⃣ Отправка в Telegram
- Сервер получает `telegram_id` получателя из таблицы `players`
- Если `telegram_id` существует, отправляет форматированное сообщение в Telegram
- Сообщение включает кнопку "Открыть игру" с ссылкой на проект

### 5️⃣ Что видит игрок в Telegram
```
💬 Новое личное сообщение в игре!

👤 От: ИванПро
📝 Сообщение: привет! как дела? когда начнём контракт?…

🎮 Перейти в игру и ответить
[📱 Открыть игру]
```

## Файлы затронуты
1. **api/notify-private-message.js** - ✅ НОВЫЙ endpoint
2. **api/bot.js** - Добавлена функция `notifyPlayerAboutPrivateMessage()` (для будущего использования)
3. **script.js** - Добавлена функция `notifyTelegramAboutMessage()` в модуль PrivateChatSystem

## Требования
- ✅ Таблица `personal_messages` в Supabase
- ✅ Колонка `telegram_id` в таблице `players`
- ✅ Переменные окружения в Vercel:
  - `TG_BOT_TOKEN` - токен Telegram бота
  - `SUPABASE_URL` - URL Supabase
  - `SUPABASE_ANON_KEY` - анонимный ключ Supabase

## Error Handling
- Если у получателя нет `telegram_id` - уведомление не отправляется (warn в консоль)
- Если webhook недоступен - ошибка залогируется, но сообщение всё равно сохранится в БД
- Если API Telegram вернул ошибку - ошибка залогируется

## Примеры использования

### На фронтенде (автоматически)
```javascript
// Когда игрок нажимает "Отправить" в диалоге ЛС
const msg = await supabaseClient.from('personal_messages').insert([{
  sender_id: currentPlayer.id,
  receiver_id: receiverId,
  message: "Привет!",
  // ... другие поля
}]);

// Затем автоматически отправляется:
await notifyTelegramAboutMessage(receiverId, currentPlayer.nick, "Привет!");
```

### API Endpoint
```bash
curl -X POST https://black-russia-simulator.vercel.app/api/notify-private-message \
  -H "Content-Type: application/json" \
  -d '{
    "receiver_id": "player_123",
    "sender_nick": "ИванПро",
    "message": "Привет! Как дела?"
  }'
```

Response:
```json
{
  "ok": true,
  "sent_to": 123456789
}
```

## Тестирование

1. ✅ Убедитесь что в таблице `players` есть колонка `telegram_id` с вашим ID
2. ✅ Отправьте ЛС любому другому игроку
3. ✅ Проверьте Telegram - должно прийти уведомление
4. ✅ Нажмите кнопку "Открыть игру" - должны вернуться в браузер

## Включение/отключение

Функция включена по умолчанию. Чтобы отключить:

```javascript
// В script.js, в функции sendMessage(), закомментировать:
// notifyTelegramAboutMessage(currentReceiverId, currentPlayer.nick || 'Unknown', text);
```

## Future Enhancements
- [ ] Уведомления о других событиях (подписка на игрока, ответ на сообщение и т.д.)
- [ ] Группировка уведомлений (если много сообщений быстро)
- [ ] Настройка типов уведомлений в профиле
- [ ] История уведомлений в Telegram боте
