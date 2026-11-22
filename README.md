# CHOKOMELER AI — Backend Gemini (fase 3)

Backend de texto alojado en **Vercel**, independiente del launcher Android TV. El endpoint de chat conserva su contrato: `POST /api/chat` con `{"message":"..."}`, autenticación Bearer, y respuesta con campo `answer`.

## Configuración en Vercel

Proyecto existente: `elektrorates-projects/chokomelerai`.

En **Settings > Environment Variables**, configura para **Production**:

- `GEMINI_API_KEY` (obligatoria): clave privada creada en https://aistudio.google.com/apikey.
- `CHOKOMELER_DEVICE_TOKEN` (obligatoria): conserva el token privado ya configurado.
- `GEMINI_MODEL` (opcional): `gemini-2.5-flash-lite`, el valor por defecto.

La clave antigua `OPENAI_API_KEY` ya **no se utiliza** por el backend; puedes eliminarla del proyecto Vercel después de verificar Gemini. No pegues claves en el chat, código fuente o commits.

Vercel debe realizar un despliegue **Production / Ready** después de añadir las variables. Si GitHub está conectado, un push puede generar un nuevo despliegue; si no, usa **Redeploy**. Revisa que el dominio de pruebas no esté bloqueado por Vercel Authentication.

## Pruebas sin exponer el token

Verifica `https://chokomelerai-git-main-elektrorates-projects.vercel.app/api/health`.

```powershell
$base = "https://chokomelerai-git-main-elektrorates-projects.vercel.app"
$token = Read-Host "Token del dispositivo (no lo compartas)"
$body = @{ message = "Hola CHOKOMELER AI" } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "$base/api/chat" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 30
```

## Seguridad y cuotas

- `GEMINI_API_KEY` solo debe existir en las variables privadas de Vercel.
- `CHOKOMELER_DEVICE_TOKEN` autentica peticiones, pero un token almacenado en un APK podría extraerse. Se necesita emparejamiento y revocación antes de una distribución pública.
- Este prototipo todavía **no** implementa rate limiting distribuido. No distribuyas el token.
- Google ofrece cuotas gratuitas para determinados modelos/proyectos; **no son ilimitadas** y dependen de elegibilidad, región, cuota y condiciones actuales. Comprueba el coste y límites en https://ai.google.dev/gemini-api/docs/pricing antes de activar facturación.
- La aplicación Android TV, el clima y los botones del mando no se modifican en esta fase.

## Endpoints

- `GET /api/health`: devuelve `ok: true` si la función de estado está desplegada.
- `POST /api/chat`: requiere `Authorization: Bearer <CHOKOMELER_DEVICE_TOKEN>`, devuelve `answer`.

La prueba de salud no garantiza que Gemini esté configurado: la primera consulta autenticada comprueba el proveedor.
