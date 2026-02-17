# DIAGNÓSTICO EXHAUSTIVO - CONTADORES DE MENSAJES NO LEÍDOS

## ARQUITECTURA ACTUAL

### 1. FUENTES DE DATOS DE CONTADORES

#### Frontend (Estado Local)
```javascript
// Estado principal en chatState
unreadMessages: {
  "roomCode1": 5,
  "roomCode2": 3,
  "conversationId1": 2
}
```

#### Backend (Eventos Socket)
1. **`message`** - Mensaje nuevo individual
2. **`unreadCountUpdate`** - Actualización de contador para grupos
3. **`assignedConversationUpdated`** - Actualización para chats asignados
4. **`unreadCountReset`** - Reset cuando se marca como leído

### 2. FLUJO DE ACTUALIZACIÓN DE CONTADORES

#### GRUPOS (myActiveRooms)
```
1. Usuario B envía mensaje en grupo X
2. Backend emite 'message' → Frontend incrementa unreadMessages[X]
3. Backend emite 'unreadCountUpdate' → Frontend actualiza lastMessage
4. Usuario A entra al grupo X
5. Frontend emite 'markRoomMessagesAsRead'
6. Backend emite 'unreadCountReset' → Frontend resetea unreadMessages[X] = 0
```

#### FAVORITOS (favoriteRooms)
- Usa la MISMA lógica que GRUPOS
- Se actualiza en paralelo con myActiveRooms
- Usa `sortRoomsByBackendLogic` para ordenar

#### ASIGNADOS (assignedConversations)
```
1. Usuario B envía mensaje a Usuario A
2. Backend emite 'message' con conversationId
3. Frontend incrementa unreadMessages[conversationId]
4. Backend emite 'assignedConversationUpdated' (OPCIONAL)
5. Usuario A abre el chat
6. Frontend emite 'markConversationAsRead' (API)
7. Backend emite 'unreadCountReset' con conversationId
```

## PROBLEMAS IDENTIFICADOS

### Problema 1: Backend no emite `assignedConversationUpdated`
**Síntoma:** Contador no se actualiza en chats asignados
**Causa:** Backend solo emite `message`, no `assignedConversationUpdated`
**Solución Frontend:** Implementado fallback en listener `message`
**Solución Backend:** Ver PROMPT_BACKEND_1

### Problema 2: Contador reaparece después de F5 (SUPERADMIN)
**Síntoma:** Contador se resetea pero reaparece al recargar
**Causa:** `getAdminRooms()` devuelve `unreadCount` desactualizado
**Solución Backend:** Ver PROMPT_BACKEND_2

### Problema 3: Chat no sube al primer lugar
**Síntoma:** Contador se actualiza pero el chat no sube
**Causa:** Estructura de datos incorrecta (`lastMessageTime` vs `lastMessage.sentAt`)
**Solución Frontend:** ✅ CORREGIDO - Ahora usa estructura unificada

## VERIFICACIÓN PASO A PASO

### Test 1: GRUPOS
1. Usuario A abre grupo "TEST"
2. Usuario B envía mensaje "Hola"
3. ✅ Verificar: `unreadMessages["TEST"]` debe incrementar
4. ✅ Verificar: Chat "TEST" debe subir al primer lugar
5. ✅ Verificar: Badge rojo debe aparecer con número
6. Usuario A entra al grupo "TEST"
7. ✅ Verificar: `unreadMessages["TEST"]` debe ser 0
8. ✅ Verificar: Badge rojo debe desaparecer
9. Usuario A presiona F5
10. ✅ Verificar: Badge NO debe reaparecer

### Test 2: FAVORITOS
1. Usuario A marca grupo "TEST" como favorito
2. Usuario B envía mensaje "Hola"
3. ✅ Verificar: Contador en FAVORITOS debe incrementar
4. ✅ Verificar: Chat debe subir al primer lugar en FAVORITOS
5. ✅ Verificar: Contador en GRUPOS también debe incrementar (mismo grupo)

### Test 3: ASIGNADOS
1. Usuario A tiene chat asignado con Usuario B
2. Usuario B envía mensaje "Hola"
3. ✅ Verificar: `unreadMessages[conversationId]` debe incrementar
4. ✅ Verificar: Chat debe subir al primer lugar
5. ✅ Verificar: Badge rojo debe aparecer
6. Usuario A abre el chat
7. ✅ Verificar: Contador debe ser 0
8. Usuario A presiona F5
9. ✅ Verificar: Contador NO debe reaparecer

## LOGS DE DIAGNÓSTICO

### Logs Clave a Buscar

#### Cuando llega un mensaje:
```
📨 LISTENER message recibido: {from, roomCode, isGroup, conversationId}
🔍 Estado del mensaje: {isOwnMessage, currentFullName, username}
📬 [NEW MESSAGE] Evento recibido: {id, from, to, isGroup, roomCode}
🔍 Evaluando incremento de contador: {isChatOpen, isOwnMessage, shouldIncrement}
✅ [GRUPO] Incrementando contador: roomCode → newCount
```

#### Cuando se marca como leído:
```
📤 Emitiendo markRoomMessagesAsRead: {roomCode, username}
📥 EVENTO unreadCountReset RECIBIDO: {roomCode}
✅ Reseteando contador para: roomCode
```

#### Cuando se actualiza la lista:
```
📬 unreadCountUpdate: {roomCode, isCurrentRoom, hasLastMessage, incrementCount}
📬 Después de sort, primera sala: roomCode sentAt: timestamp
💬 assignedConversationUpdated recibido: {conversationId, lastMessage, lastMessageFrom}
```

## COMANDOS DE DIAGNÓSTICO

### En la consola del navegador:
```javascript
// Ver estado actual de contadores
console.log('unreadMessages:', chatState.unreadMessages);

// Ver salas activas con sus contadores
console.log('myActiveRooms:', chatState.myActiveRooms.map(r => ({
  name: r.name,
  roomCode: r.roomCode,
  unreadCount: r.unreadCount,
  lastMessage: r.lastMessage?.sentAt
})));

// Ver conversaciones asignadas
console.log('assignedConversations:', chatState.assignedConversations.map(c => ({
  id: c.id,
  participants: c.participants,
  unreadCount: c.unreadCount,
  lastMessage: c.lastMessage?.sentAt
})));
```

## PROMPTS PARA BACKEND

### PROMPT_BACKEND_1: Emitir assignedConversationUpdated

```
PROBLEMA: El frontend no recibe actualizaciones de contadores para chats asignados

CONTEXTO:
Cuando un usuario envía un mensaje en un chat asignado (conversación temporal entre dos usuarios),
el backend emite el evento 'message' pero NO emite 'assignedConversationUpdated'.

SOLUCIÓN REQUERIDA:
Después de guardar un mensaje en una conversación asignada, emitir el evento 'assignedConversationUpdated'
a TODOS los participantes de la conversación (excepto el remitente).

DATOS A ENVIAR:
```javascript
socket.emit('assignedConversationUpdated', {
  conversationId: conversation.id,
  lastMessage: message.text,
  lastMessageTime: message.sentAt, // ISO 8601 string
  lastMessageFrom: message.from,
  lastMessageMediaType: message.mediaType || null
});
```

DESTINATARIOS:
- Emitir a todos los participantes de la conversación
- NO emitir al remitente del mensaje (para evitar duplicados)

CUÁNDO EMITIR:
- Después de guardar el mensaje en la base de datos
- Después de emitir el evento 'message'
- Solo para conversaciones asignadas (temporary_conversations)

VERIFICACIÓN:
El frontend debe recibir el evento y actualizar:
1. El contador de mensajes no leídos
2. El último mensaje visible en la lista
3. La posición del chat (debe subir al primer lugar)
```

### PROMPT_BACKEND_2: Calcular unreadCount correctamente en getAdminRooms

```
PROBLEMA: Contador de mensajes no leídos reaparece después de F5 para rol SUPERADMIN

CONTEXTO:
Cuando un SUPERADMIN entra a un grupo y marca los mensajes como leídos:
1. El contador desaparece correctamente (frontend emite markRoomMessagesAsRead)
2. El backend marca los mensajes como leídos en la BD
3. El backend emite unreadCountReset
4. El frontend actualiza el contador a 0

Sin embargo, al recargar la página (F5):
1. El frontend llama a getAdminRooms()
2. El backend devuelve las salas con unreadCount que contiene valores antiguos
3. El contador reaparece

SOLUCIÓN REQUERIDA:
En el endpoint getAdminRooms(), calcular dinámicamente el unreadCount para cada sala
basándose en los mensajes REALMENTE no leídos por el usuario actual.

PSEUDOCÓDIGO:
```java
@GetMapping("/admin/rooms")
public ResponseEntity<?> getAdminRooms(
    @RequestParam String username,
    @RequestParam int page,
    @RequestParam int limit
) {
    List<Room> rooms = roomRepository.findAllActive(page, limit);
    
    for (Room room : rooms) {
        // Calcular unreadCount dinámicamente
        int unreadCount = messageRepository.countUnreadMessagesInRoom(
            room.getRoomCode(),
            username
        );
        room.setUnreadCount(unreadCount);
    }
    
    return ResponseEntity.ok(rooms);
}
```

QUERY SQL SUGERIDA:
```sql
SELECT COUNT(*) 
FROM messages m
WHERE m.room_code = ?
  AND m.is_deleted = false
  AND m.from_user != ?
  AND (
    m.is_read = false 
    OR m.id NOT IN (
      SELECT message_id 
      FROM message_read_receipts 
      WHERE username = ?
    )
  )
```

VERIFICACIÓN:
1. SUPERADMIN entra a un grupo → contador desaparece
2. SUPERADMIN presiona F5 → contador NO reaparece
3. Otros roles (ADMIN, JEFEPISO, usuarios normales) siguen funcionando correctamente
```

### PROMPT_BACKEND_3: Verificar markRoomMessagesAsRead para todos los roles

```
PROBLEMA: Verificar que markRoomMessagesAsRead funciona para todos los roles

CONTEXTO:
El evento socket 'markRoomMessagesAsRead' debe marcar todos los mensajes de un grupo
como leídos para el usuario actual, independientemente de su rol.

VERIFICACIÓN REQUERIDA:
1. ¿El evento markRoomMessagesAsRead está marcando correctamente los mensajes como leídos?
2. ¿Hay alguna condición que excluya a ciertos roles (SUPERADMIN, ADMIN, etc.)?
3. ¿Se está emitiendo correctamente el evento unreadCountReset después de marcar como leído?

CÓDIGO A REVISAR:
```javascript
// Listener del evento
socket.on('markRoomMessagesAsRead', async (data) => {
  const { roomCode, username } = data;
  
  // ¿Hay alguna condición aquí que excluya roles?
  // ¿Se está marcando correctamente en la BD?
  // ¿Se está emitiendo unreadCountReset?
});
```

COMPORTAMIENTO ESPERADO:
1. Recibir evento: {roomCode: "ABC123", username: "JOHN DOE"}
2. Marcar todos los mensajes del grupo como leídos para ese usuario
3. Emitir unreadCountReset: {roomCode: "ABC123"} al usuario
4. El frontend resetea el contador a 0

PRUEBA:
1. Usuario con rol SUPERADMIN entra a un grupo
2. Verificar en BD que los mensajes se marcaron como leídos
3. Verificar que se emitió unreadCountReset
4. Verificar que el contador desaparece en el frontend
```

## CHECKLIST DE VERIFICACIÓN

### Frontend
- [x] Listener `message` incrementa contador para grupos
- [x] Listener `message` incrementa contador para asignados (fallback)
- [x] Listener `unreadCountUpdate` actualiza lastMessage
- [x] Listener `assignedConversationUpdated` actualiza asignados
- [x] Listener `unreadCountReset` resetea contadores
- [x] Estructura de datos unificada (lastMessage.sentAt)
- [x] Ordenamiento correcto (sortRoomsByBackendLogic)
- [x] Logs de diagnóstico agregados

### Backend (PENDIENTE)
- [ ] Emitir `assignedConversationUpdated` para chats asignados
- [ ] Calcular `unreadCount` dinámicamente en `getAdminRooms()`
- [ ] Verificar `markRoomMessagesAsRead` para todos los roles
- [ ] Emitir `unreadCountReset` después de marcar como leído
- [ ] Verificar que no hay condiciones que excluyan roles específicos

## PRÓXIMOS PASOS

1. **Agregar logs de diagnóstico** (ver sección LOGS DE DIAGNÓSTICO)
2. **Ejecutar tests** (ver sección VERIFICACIÓN PASO A PASO)
3. **Identificar qué falla** usando los logs
4. **Aplicar solución** (Frontend o Backend según corresponda)
5. **Verificar con todos los roles** (SUPERADMIN, ADMIN, JEFEPISO, usuarios normales)
