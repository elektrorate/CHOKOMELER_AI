# CHOKOMELER AI — backend de texto (fase 3)

Proyecto independiente de Casa Rosier y del APK Android TV.

## Desplegar en Vercel

1. Clona este repositorio o impórtalo en Vercel desde GitHub.
2. Crea un proyecto **nuevo** llamado `chokomeler-ai` en tu equipo de Vercel. No lo vincules al proyecto de Casa Rosier.
3. En Vercel > Project > Settings > Environment Variables, define:
   - `OPENAI_API_KEY`: clave privada de OpenAI.
   - `CHOKOMELER_DEVICE_TOKEN`: token aleatorio largo para autorizar el dispositivo.
   - `OPENAI_MODEL`: `gpt-4.1-mini` (opcional).
4. Despliega de nuevo después de establecer las variables.
5. Comprueba `https://TU-DOMINIO.vercel.app/api/health`.

## Prueba de conversación desde PowerShell

No compartas claves ni tokens en chats ni los publiques en GitHub.

```powershell
$base = "https://TU-PROYECTO.vercel.app"
$token = Read-Host "Token privado del dispositivo"
Invoke-RestMethod -Uri "$base/api/chat" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json; charset=utf-8' -Body '{"message":"Hola, ¿qué puedes hacer?"}'
```

## Seguridad y límites

Este backend es un **prototipo** de un solo dispositivo. La clave de OpenAI se mantiene exclusivamente en Vercel, nunca en el código Android. El token del dispositivo tampoco debe estar en este repositorio. Antes de uso prolongado, se necesitarán emparejamiento y revocación de dispositivos, rate limits distribuidos y un presupuesto/límite de gasto en OpenAI. El token local puede extraerse de un dispositivo comprometido, así que no se considera autenticación fuerte.

## Endpoints

- `GET /api/health`: comprobación de estado.
- `POST /api/chat`: recibe JSON `{"message":"..."}` y requiere `Authorization: Bearer <token>`.

En esta fase solo se implementa texto. No controla aplicaciones ni reemplaza Google Assistant, y no modifica el módulo del clima.
