# RESUMEN EJECUTIVO - DIAGNÓSTICO DE CONTADORES

## ESTADO ACTUAL

✅ **GRUPOS:** Funcionando correctamente
- Incremento de contador: ✅
- Ordenamiento (subir al primer lugar): ✅
- Reset al abrir chat: ✅

✅ **FAVORITOS:** Funcionando correctamente  
- Usa la misma lógica que GRUPOS
- Ordenamiento: ✅

⚠️ **ASIGNADOS:** Funcionando parcialmente
- Incremento de contador: ✅ (con fallback)
- Ordenamiento: ✅ (corregido)
- Reset al abrir chat: ✅
- **PROBLEMA:** Backend no siempre emite `assignedConversationUpdated`

⚠️ **SUPERADMIN:** Contador reaparece después de F5
- **PROBLEMA:** `getAdminRooms()` devuelve `unreadCount` desactualizado

## PRUEBAS A REALIZAR

### Test Rápido (5 minutos)

1. **GRUPOS:**
   - Usuario A abre la app
   - Usuario B envía mensaje en grupo "TEST"
   - ✅ Verificar: Contador aparece en grupo "TEST"
   - ✅ Verificar: Chat "TEST" sube al primer lugar
   - Usuario A entra al grupo "TEST"
   - ✅ Verificar: Contador desaparece
   - Usuario A presiona F5
   - ✅ Verificar: Contador NO reaparece

2. **ASIGNADOS:**
   - Usuario A abre la app
   - Usuario B envía mensaje a Usuario A
   - ✅ Verificar: Contador aparece en chat con Usuario B
   - ✅ Verificar: Chat sube al primer lugar
   - Usuario A abre el chat
   - ✅ Verificar: Contador desaparece

3. **SUPERADMIN:**
   - SUPERADMIN entra a un grupo
   - ✅ Verificar: Contador desaparece
   - SUPERADMIN presiona F5
   - ⚠️ VERIFICAR: ¿Contador reaparece? (SI = Bug confirmado)

## LOGS A REVISAR

Abre la consola del navegador y busca estos logs:

### Cuando llega un mensaje:
```
✅ [GRUPO] Incrementando contador: {roomCode, prevCount, newCount, from}
✅ [ASIGNADO-FALLBACK] Incrementando contador: {conversationId, prevCount, newCount, from}
💬 assignedConversationUpdated recibido: {conversationId, lastMessage, lastMessageFrom}
```

### Cuando se marca como leído:
```
📤 Emitiendo markRoomMessagesAsRead: {roomCode, username}
📥 EVENTO unreadCountReset RECIBIDO: {roomCode}
✅ Reseteando contador para: roomCode
```

### Si NO ves estos logs:
- ❌ `✅ [GRUPO] Incrementando contador` → El mensaje no está llegando o isChatOpen=true
- ❌ `💬 assignedConversationUpdated recibido` → Backend no está emitiendo el evento
- ❌ `📥 EVENTO unreadCountReset RECIBIDO` → Backend no está emitiendo reset

## SOLUCIONES

### Si GRUPOS no funciona:
1. Verificar que `data.roomCode` existe en el evento `message`
2. Verificar que `isChatOpen` es `false` cuando el chat NO está abierto
3. Ver logs: `🔍 Evaluando incremento de contador`

### Si ASIGNADOS no funciona:
1. Verificar que `data.conversationId` existe en el evento `message`
2. Si NO existe → **BACKEND debe incluir conversationId en el evento message**
3. Si existe pero no incrementa → Ver logs de fallback
4. **SOLUCIÓN BACKEND:** Implementar PROMPT_BACKEND_1 (ver DIAGNOSTICO_CONTADORES.md)

### Si contador reaparece después de F5 (SUPERADMIN):
1. **SOLUCIÓN BACKEND:** Implementar PROMPT_BACKEND_2 (ver DIAGNOSTICO_CONTADORES.md)
2. El backend debe calcular `unreadCount` dinámicamente en `getAdminRooms()`

## COMANDOS ÚTILES

### Ver estado actual en consola:
```javascript
// Ver contadores
console.table(chatState.unreadMessages);

// Ver grupos con contadores
console.table(chatState.myActiveRooms.map(r => ({
  name: r.name,
  unreadCount: r.unreadCount,
  lastMessage: r.lastMessage?.sentAt
})));

// Ver asignados con contadores
console.table(chatState.assignedConversations.map(c => ({
  id: c.id,
  participants: c.participants.join(', '),
  unreadCount: c.unreadCount
})));
```

## PRÓXIMOS PASOS

1. ✅ **Ejecutar Test Rápido** (arriba)
2. ✅ **Revisar logs** en consola
3. ✅ **Identificar qué falla**:
   - ¿GRUPOS? → Problema en frontend
   - ¿ASIGNADOS? → Problema en backend (falta conversationId o assignedConversationUpdated)
   - ¿SUPERADMIN F5? → Problema en backend (getAdminRooms)
4. ✅ **Aplicar solución** correspondiente
5. ✅ **Verificar con todos los roles**

## PROMPTS PARA BACKEND

Ver archivo `DIAGNOSTICO_CONTADORES.md` sección "PROMPTS PARA BACKEND":
- **PROMPT_BACKEND_1:** Emitir assignedConversationUpdated
- **PROMPT_BACKEND_2:** Calcular unreadCount en getAdminRooms
- **PROMPT_BACKEND_3:** Verificar markRoomMessagesAsRead

## CONTACTO

Si después de revisar los logs sigues teniendo problemas:
1. Copia los logs de la consola
2. Indica qué test falló (GRUPOS, ASIGNADOS, SUPERADMIN)
3. Indica qué rol estás usando
4. Proporciona los logs completos desde que llega el mensaje hasta que debería aparecer el contador
