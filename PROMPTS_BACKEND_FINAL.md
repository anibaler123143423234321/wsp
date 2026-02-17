# PROMPTS PARA BACKEND - SOLUCIÓN COMPLETA DE CONTADORES

## PROMPT 1: Emitir assignedConversationUpdated para chats asignados

```
PROBLEMA: Los contadores no se actualizan correctamente en chats asignados

DESCRIPCIÓN:
Cuando un usuario envía un mensaje en un chat asignado (temporary_conversations), 
el backend emite el evento 'message' pero NO emite 'assignedConversationUpdated'.
Esto causa que el contador no se actualice y el chat no suba al primer lugar.

SOLUCIÓN:
Después de guardar un mensaje en una conversación asignada, emitir el evento 
'assignedConversationUpdated' a todos los participantes (excepto el remitente).

UBICACIÓN DEL CÓDIGO:
Buscar donde se emite el evento 'message' para conversaciones asignadas.
Probablemente en un controlador de WebSocket o servicio de mensajería.

CÓDIGO A AGREGAR:
```java
// Después de guardar el mensaje y emitir 'message'
if (conversation.isTemporary() || conversation.getType().equals("ASSIGNED")) {
    
    // Obtener todos los participantes
    List<String> participants = conversation.getParticipants();
    
    // Emitir a cada participante (excepto el remitente)
    for (String participant : participants) {
        if (!participant.equals(message.getFrom())) {
            
            // Crear el payload
            Map<String, Object> payload = new HashMap<>();
            payload.put("conversationId", conversation.getId());
            payload.put("lastMessage", message.getText());
            payload.put("lastMessageTime", message.getSentAt().toString()); // ISO 8601
            payload.put("lastMessageFrom", message.getFrom());
            payload.put("lastMessageMediaType", message.getMediaType());
            
            // Emitir el evento
            socketService.emitToUser(participant, "assignedConversationUpdated", payload);
            
            System.out.println("✅ Emitido assignedConversationUpdated a: " + participant);
        }
    }
}
```

VERIFICACIÓN:
1. Usuario A envía mensaje a Usuario B en chat asignado
2. En la consola del backend debe aparecer: "✅ Emitido assignedConversationUpdated a: Usuario B"
3. En el frontend de Usuario B debe aparecer el log: "💬 assignedConversationUpdated recibido"
4. El contador debe incrementar y el chat debe subir al primer lugar

IMPORTANTE:
- El campo 'lastMessageTime' debe ser un string ISO 8601 (ejemplo: "2026-02-16T10:30:00.000Z")
- NO emitir al remitente del mensaje (para evitar duplicados)
- Emitir DESPUÉS de guardar el mensaje en la base de datos
```

---

## PROMPT 2: Calcular unreadCount dinámicamente en getAdminRooms

```
PROBLEMA: Contador reaparece después de F5 para usuarios con rol SUPERADMIN

DESCRIPCIÓN:
Cuando un SUPERADMIN entra a un grupo y marca los mensajes como leídos:
1. El contador desaparece correctamente
2. Al recargar la página (F5), el contador reaparece

CAUSA:
El endpoint getAdminRooms() devuelve las salas con un campo 'unreadCount' que 
contiene valores cacheados o desactualizados, en lugar de calcular dinámicamente 
cuántos mensajes realmente no ha leído el usuario.

SOLUCIÓN:
Calcular el 'unreadCount' dinámicamente para cada sala basándose en los mensajes 
REALMENTE no leídos por el usuario actual.

UBICACIÓN DEL CÓDIGO:
Endpoint: GET /api/rooms/admin o similar
Método: getAdminRooms(username, page, limit)

CÓDIGO A MODIFICAR:
```java
@GetMapping("/admin/rooms")
public ResponseEntity<?> getAdminRooms(
    @RequestParam String username,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "50") int limit
) {
    try {
        // Obtener salas activas
        List<Room> rooms = roomRepository.findAllActive(page, limit);
        
        // NUEVO: Calcular unreadCount dinámicamente para cada sala
        for (Room room : rooms) {
            int unreadCount = calculateUnreadCountForUser(room.getRoomCode(), username);
            room.setUnreadCount(unreadCount);
        }
        
        return ResponseEntity.ok(rooms);
        
    } catch (Exception e) {
        return ResponseEntity.status(500).body("Error: " + e.getMessage());
    }
}

// NUEVO: Método helper para calcular mensajes no leídos
private int calculateUnreadCountForUser(String roomCode, String username) {
    // Contar mensajes que:
    // 1. Pertenecen a esta sala
    // 2. NO fueron enviados por este usuario
    // 3. NO están marcados como leídos por este usuario
    // 4. NO están eliminados
    
    return messageRepository.countUnreadMessagesInRoom(roomCode, username);
}
```

QUERY SQL PARA messageRepository:
```sql
-- Opción 1: Si usas tabla de read_receipts
SELECT COUNT(*) 
FROM messages m
WHERE m.room_code = :roomCode
  AND m.is_deleted = false
  AND m.from_user != :username
  AND m.id NOT IN (
    SELECT message_id 
    FROM message_read_receipts 
    WHERE username = :username
  )

-- Opción 2: Si usas campo is_read en messages
SELECT COUNT(*) 
FROM messages m
WHERE m.room_code = :roomCode
  AND m.is_deleted = false
  AND m.from_user != :username
  AND (m.is_read = false OR m.read_by NOT LIKE CONCAT('%', :username, '%'))
```

VERIFICACIÓN:
1. SUPERADMIN entra a un grupo con mensajes no leídos
2. El contador debe aparecer correctamente
3. SUPERADMIN entra al grupo (marca como leído)
4. El contador desaparece
5. SUPERADMIN presiona F5
6. El contador NO debe reaparecer (porque calculateUnreadCountForUser devuelve 0)

IMPORTANTE:
- Aplicar esta lógica SOLO en getAdminRooms() (usado por SUPERADMIN, ADMIN, JEFEPISO, PROGRAMADOR)
- NO modificar el endpoint de usuarios normales (getUserRooms)
- El cálculo debe ser eficiente (agregar índices en room_code y username si es necesario)
```

---

## PROMPT 3: Incluir conversationId en evento 'message' para chats asignados

```
PROBLEMA: El frontend no puede identificar a qué conversación asignada pertenece un mensaje

DESCRIPCIÓN:
Cuando se emite el evento 'message' para un chat asignado, el payload NO incluye 
el campo 'conversationId'. Esto impide que el frontend actualice correctamente 
la lista de conversaciones asignadas.

SOLUCIÓN:
Incluir el campo 'conversationId' en el payload del evento 'message' cuando 
el mensaje pertenece a una conversación asignada.

UBICACIÓN DEL CÓDIGO:
Donde se emite el evento 'message' (probablemente en MessageController o MessageService)

CÓDIGO A MODIFICAR:
```java
// Antes
Map<String, Object> messagePayload = new HashMap<>();
messagePayload.put("id", message.getId());
messagePayload.put("from", message.getFrom());
messagePayload.put("to", message.getTo());
messagePayload.put("message", message.getText());
messagePayload.put("sentAt", message.getSentAt().toString());
messagePayload.put("isGroup", message.isGroup());
messagePayload.put("roomCode", message.getRoomCode());
// ... otros campos

socketService.emitToUser(recipient, "message", messagePayload);

// Después (AGREGAR ESTOS CAMPOS)
Map<String, Object> messagePayload = new HashMap<>();
messagePayload.put("id", message.getId());
messagePayload.put("from", message.getFrom());
messagePayload.put("to", message.getTo());
messagePayload.put("message", message.getText());
messagePayload.put("sentAt", message.getSentAt().toString());
messagePayload.put("isGroup", message.isGroup());
messagePayload.put("roomCode", message.getRoomCode());

// NUEVO: Agregar conversationId si es chat asignado
if (message.getConversation() != null) {
    messagePayload.put("conversationId", message.getConversation().getId());
    messagePayload.put("isAssignedConversation", true);
}

socketService.emitToUser(recipient, "message", messagePayload);
```

VERIFICACIÓN:
1. Usuario A envía mensaje a Usuario B en chat asignado
2. En el frontend de Usuario B, el log debe mostrar:
   ```
   📨 LISTENER message recibido: {
     from: "Usuario A",
     conversationId: 123,  // ← DEBE EXISTIR
     isAssignedConversation: true
   }
   ```
3. El contador debe incrementar correctamente

IMPORTANTE:
- Solo agregar conversationId si el mensaje pertenece a una conversación asignada
- No afectar mensajes de grupos (roomCode) ni mensajes directos normales
```

---

## PROMPT 4: Verificar markRoomMessagesAsRead para todos los roles

```
PROBLEMA: Verificar que el marcado de mensajes como leídos funciona para todos los roles

DESCRIPCIÓN:
Necesitamos asegurar que cuando un usuario (de cualquier rol) entra a un grupo,
los mensajes se marcan correctamente como leídos en la base de datos.

VERIFICACIÓN REQUERIDA:
1. ¿El listener del evento 'markRoomMessagesAsRead' está funcionando?
2. ¿Hay alguna condición que excluya ciertos roles (SUPERADMIN, ADMIN, etc.)?
3. ¿Se está emitiendo correctamente 'unreadCountReset' después de marcar como leído?

UBICACIÓN DEL CÓDIGO:
Listener del evento socket 'markRoomMessagesAsRead'

CÓDIGO A REVISAR:
```java
@OnEvent("markRoomMessagesAsRead")
public void handleMarkRoomMessagesAsRead(SocketIOClient client, Map<String, Object> data) {
    String roomCode = (String) data.get("roomCode");
    String username = (String) data.get("username");
    
    System.out.println("📥 markRoomMessagesAsRead recibido: " + roomCode + " - " + username);
    
    try {
        // VERIFICAR: ¿Hay alguna condición aquí que excluya roles?
        // EJEMPLO DE CÓDIGO PROBLEMÁTICO:
        // if (!user.getRole().equals("USER")) {
        //     return; // ← ESTO CAUSARÍA EL BUG
        // }
        
        // Marcar mensajes como leídos
        int updatedCount = messageRepository.markRoomMessagesAsRead(roomCode, username);
        
        System.out.println("✅ Marcados " + updatedCount + " mensajes como leídos");
        
        // CRÍTICO: Emitir unreadCountReset al usuario
        Map<String, Object> resetPayload = new HashMap<>();
        resetPayload.put("roomCode", roomCode);
        
        socketService.emitToUser(username, "unreadCountReset", resetPayload);
        
        System.out.println("✅ Emitido unreadCountReset a: " + username);
        
    } catch (Exception e) {
        System.err.println("❌ Error en markRoomMessagesAsRead: " + e.getMessage());
    }
}
```

QUERY SQL PARA markRoomMessagesAsRead:
```sql
-- Opción 1: Si usas tabla de read_receipts
INSERT INTO message_read_receipts (message_id, username, read_at)
SELECT m.id, :username, NOW()
FROM messages m
WHERE m.room_code = :roomCode
  AND m.from_user != :username
  AND m.is_deleted = false
  AND m.id NOT IN (
    SELECT message_id 
    FROM message_read_receipts 
    WHERE username = :username
  )

-- Opción 2: Si usas campo is_read en messages
UPDATE messages
SET is_read = true,
    read_at = NOW(),
    read_by = CONCAT(COALESCE(read_by, ''), ',', :username)
WHERE room_code = :roomCode
  AND from_user != :username
  AND is_deleted = false
  AND (is_read = false OR read_by NOT LIKE CONCAT('%', :username, '%'))
```

VERIFICACIÓN:
1. Usuario con rol SUPERADMIN entra a un grupo
2. En la consola del backend debe aparecer:
   ```
   📥 markRoomMessagesAsRead recibido: ABC123 - JESUS PISCOYA
   ✅ Marcados 5 mensajes como leídos
   ✅ Emitido unreadCountReset a: JESUS PISCOYA
   ```
3. En el frontend debe aparecer:
   ```
   📥 EVENTO unreadCountReset RECIBIDO: {roomCode: "ABC123"}
   ✅ Reseteando contador para: ABC123
   ```
4. El contador debe desaparecer

IMPORTANTE:
- NO debe haber condiciones que excluyan roles específicos
- SIEMPRE emitir 'unreadCountReset' después de marcar como leído
- Verificar que la query SQL funciona correctamente para todos los roles
```

---

## RESUMEN DE IMPLEMENTACIÓN

### Backend debe implementar (en orden de prioridad):

1. **PROMPT 3** (CRÍTICO) - Incluir conversationId en evento 'message'
   - Sin esto, los chats asignados no funcionan correctamente
   - Tiempo estimado: 5 minutos

2. **PROMPT 1** (IMPORTANTE) - Emitir assignedConversationUpdated
   - Mejora la experiencia en chats asignados
   - Tiempo estimado: 10 minutos

3. **PROMPT 2** (IMPORTANTE) - Calcular unreadCount dinámicamente
   - Soluciona el bug de SUPERADMIN
   - Tiempo estimado: 15 minutos

4. **PROMPT 4** (VERIFICACIÓN) - Revisar markRoomMessagesAsRead
   - Asegurar que no hay condiciones que excluyan roles
   - Tiempo estimado: 5 minutos

### Frontend (YA IMPLEMENTADO):

✅ Fallback para actualizar assignedConversations desde evento 'message'
✅ Estructura de datos unificada (lastMessage.sentAt)
✅ Ordenamiento correcto en todas las secciones
✅ Logs de diagnóstico completos
✅ Reset de contadores al abrir chats

---

## TESTING DESPUÉS DE IMPLEMENTAR

Una vez implementados los prompts en el backend, verificar:

1. **GRUPOS:** Contador incrementa, chat sube, contador desaparece al abrir
2. **FAVORITOS:** Mismo comportamiento que grupos
3. **ASIGNADOS:** Contador incrementa, chat sube, contador desaparece al abrir
4. **SUPERADMIN:** Contador NO reaparece después de F5
5. **TODOS LOS ROLES:** Funcionan correctamente (ADMIN, JEFEPISO, PROGRAMADOR, USER)
