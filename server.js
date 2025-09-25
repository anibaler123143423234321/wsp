import { WebSocketServer } from "ws";
import crypto from "crypto";

const wss = new WebSocketServer({ port: 8082 });

const users = new Map(); // username -> { ws, userData }
const groups = new Map(); // groupName -> Set of usernames
const temporaryLinks = new Map(); // linkId -> { type, participants, expiresAt, createdBy, isActive }
const publicRooms = new Map(); // roomId -> { name, participants, createdBy, isActive }

// Función para verificar si un usuario es administrador
function isAdmin(userData) {
  // Verificar si el usuario tiene rol de administrador
  if (userData && userData.role) {
    return userData.role.toUpperCase() === "ADMIN";
  }

  // Fallback: verificar por nombre de usuario (para compatibilidad)
  const ADMIN_USERS = ["admin", "administrador", "soporte"];
  return ADMIN_USERS.includes(userData?.username?.toLowerCase());
}

// Función para generar enlaces temporales
function generateTemporaryLink(type, participants, createdBy) {
  const linkId = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

  temporaryLinks.set(linkId, {
    type,
    participants,
    expiresAt,
    createdBy,
    isActive: true,
    createdAt: new Date(),
  });

  return linkId;
}

// Función para limpiar enlaces expirados
function cleanExpiredLinks() {
  const now = new Date();
  for (const [linkId, link] of temporaryLinks.entries()) {
    if (link.expiresAt < now) {
      temporaryLinks.delete(linkId);
    }
  }
}

// Limpiar enlaces expirados cada 5 minutos
setInterval(cleanExpiredLinks, 5 * 60 * 1000);

// Función para enviar la lista de usuarios a todos los clientes
function broadcastUserList() {
  const userList = Array.from(users.keys());
  const message = JSON.stringify({
    type: "userList",
    users: userList,
  });

  console.log("Enviando lista de usuarios:", userList);
  console.log("Número total de usuarios conectados:", users.size);
  console.log("Mensaje JSON a enviar:", message);

  // Enviar a todos los clientes conectados
  let clientsNotified = 0;
  for (const userInfo of users.values()) {
    if (userInfo.ws.readyState === 1) {
      // WebSocketServer.OPEN is 1
      userInfo.ws.send(message);
      clientsNotified++;
    }
  }
  console.log(`Mensaje enviado a ${clientsNotified} clientes`);
}

// Función para enviar la lista de grupos a todos los clientes
function broadcastGroupList() {
  const groupList = Array.from(groups.keys()).map((groupName) => {
    const members = Array.from(groups.get(groupName));
    return {
      name: groupName,
      members: members,
    };
  });

  const message = JSON.stringify({
    type: "groupList",
    groups: groupList,
  });

  console.log("Enviando lista de grupos:", groupList);
  console.log("Número total de grupos:", groups.size);
  console.log("Mensaje JSON a enviar:", message);

  // Enviar a todos los clientes conectados
  let clientsNotified = 0;
  for (const userInfo of users.values()) {
    if (userInfo.ws.readyState === 1) {
      // WebSocketServer.OPEN is 1
      userInfo.ws.send(message);
      clientsNotified++;
    }
  }
  console.log(`Mensaje de grupos enviado a ${clientsNotified} clientes`);
}

wss.on("connection", function connection(ws) {
  console.log("Nueva conexión recibida");
  let username = null;

  // Enviar lista de usuarios actual al cliente que se acaba de conectar
  const currentUsers = Array.from(users.keys());
  console.log(
    "Enviando lista inicial de usuarios al nuevo cliente:",
    currentUsers
  );
  try {
    ws.send(
      JSON.stringify({
        type: "userList",
        users: currentUsers,
      })
    );
    console.log("Lista inicial de usuarios enviada correctamente");
  } catch (error) {
    console.error("Error al enviar lista inicial de usuarios:", error);
  }

  ws.on("message", function incoming(message) {
    try {
      const data = JSON.parse(message);

      if (data.type === "register") {
        // Registrar usuario
        username = data.username;
        const userData = data.userData || { username, role: "USER" }; // Fallback si no viene userData

        users.set(username, { ws, userData });
        console.log(`Usuario registrado: ${username}`, userData);
        console.log(`Total de usuarios conectados: ${users.size}`);
        ws.send(
          JSON.stringify({
            type: "info",
            message: `Registrado como ${username}`,
          })
        );

        // Enviar información de administrador si aplica
        if (isAdmin(userData)) {
          ws.send(
            JSON.stringify({
              type: "adminStatus",
              isAdmin: true,
              message: "Tienes permisos de administrador",
            })
          );
        }

        // Enviar lista actualizada de usuarios a todos
        broadcastUserList();
        // Enviar lista de grupos si hay alguno
        if (groups.size > 0) {
          broadcastGroupList();
        }
      } else if (data.type === "getUserList") {
        // Solicitud manual de lista de usuarios
        console.log("Solicitud manual de lista de usuarios recibida");
        if (username) {
          const userList = Array.from(users.keys());
          ws.send(
            JSON.stringify({
              type: "userList",
              users: userList,
            })
          );
        }
      } else if (data.type === "getGroupList") {
        // Solicitud manual de lista de grupos
        console.log("Solicitud manual de lista de grupos recibida");
        if (username) {
          const groupList = Array.from(groups.keys()).map((groupName) => {
            const members = Array.from(groups.get(groupName));
            return {
              name: groupName,
              members: members,
            };
          });
          ws.send(
            JSON.stringify({
              type: "groupList",
              groups: groupList,
            })
          );
        }
      } else if (data.type === "createGroup") {
        // Crear un nuevo grupo
        const groupName = data.groupName;
        const members = data.members || [];

        if (!groupName) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Nombre de grupo no válido",
            })
          );
          return;
        }

        if (groups.has(groupName)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `El grupo ${groupName} ya existe`,
            })
          );
          return;
        }

        // Asegurarse de que el creador esté en el grupo
        if (!members.includes(username)) {
          members.push(username);
        }

        // Crear el grupo
        groups.set(groupName, new Set(members));
        console.log(
          `Grupo creado: ${groupName} con miembros: ${members.join(", ")}`
        );

        // Notificar a todos los usuarios sobre el nuevo grupo
        broadcastGroupList();

        ws.send(
          JSON.stringify({
            type: "info",
            message: `Grupo ${groupName} creado con éxito con los miembros: ${members.join(
              ", "
            )}`,
          })
        );
      } else if (data.type === "joinGroup") {
        // Unirse a un grupo existente
        const groupName = data.groupName;

        if (!groups.has(groupName)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `El grupo ${groupName} no existe`,
            })
          );
          return;
        }

        // Añadir usuario al grupo
        const group = groups.get(groupName);
        group.add(username);

        console.log(`Usuario ${username} se unió al grupo ${groupName}`);

        // Notificar a todos los usuarios sobre el cambio en el grupo
        broadcastGroupList();

        ws.send(
          JSON.stringify({
            type: "info",
            message: `Te has unido al grupo ${groupName}`,
          })
        );
      } else if (data.type === "leaveGroup") {
        // Salir de un grupo
        const groupName = data.groupName;

        if (!groups.has(groupName)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `El grupo ${groupName} no existe`,
            })
          );
          return;
        }

        // Eliminar usuario del grupo
        const group = groups.get(groupName);
        group.delete(username);

        // Si el grupo queda vacío, eliminarlo
        if (group.size === 0) {
          groups.delete(groupName);
          console.log(`Grupo ${groupName} eliminado por falta de miembros`);
        } else {
          console.log(`Usuario ${username} salió del grupo ${groupName}`);
        }

        // Notificar a todos los usuarios sobre el cambio en el grupo
        broadcastGroupList();

        ws.send(
          JSON.stringify({
            type: "info",
            message: `Has salido del grupo ${groupName}`,
          })
        );
      } else if (data.type === "createTemporaryLink") {
        // Crear enlace temporal (solo administradores)
        const userInfo = users.get(username);
        if (!userInfo || !isAdmin(userInfo.userData)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message:
                "Solo los administradores pueden crear enlaces temporales",
            })
          );
          return;
        }

        const linkType = data.linkType; // 'conversation' o 'room'
        const participants = data.participants || [];
        const roomName = data.roomName;

        if (linkType === "conversation" && participants.length < 2) {
          ws.send(
            JSON.stringify({
              type: "error",
              message:
                "Se necesitan al menos 2 participantes para crear una conversación",
            })
          );
          return;
        }

        if (linkType === "room" && !roomName) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Se necesita un nombre para la sala",
            })
          );
          return;
        }

        const linkId = generateTemporaryLink(linkType, participants, username);
        const linkUrl = `ws://localhost:8082/join/${linkId}`;

        ws.send(
          JSON.stringify({
            type: "temporaryLinkCreated",
            linkId,
            linkUrl,
            expiresAt: temporaryLinks.get(linkId).expiresAt,
            linkType,
            participants:
              linkType === "conversation" ? participants : undefined,
            roomName: linkType === "room" ? roomName : undefined,
          })
        );
      } else if (data.type === "joinTemporaryLink") {
        // Unirse a un enlace temporal
        const linkId = data.linkId;
        const link = temporaryLinks.get(linkId);

        if (!link) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Enlace no válido o expirado",
            })
          );
          return;
        }

        if (!link.isActive) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Este enlace ya no está activo",
            })
          );
          return;
        }

        if (link.expiresAt < new Date()) {
          temporaryLinks.delete(linkId);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Este enlace ha expirado",
            })
          );
          return;
        }

        if (link.type === "conversation") {
          // Crear conversación temporal
          const tempGroupName = `temp_${linkId}`;
          groups.set(tempGroupName, new Set(link.participants));

          ws.send(
            JSON.stringify({
              type: "joinedTemporaryConversation",
              groupName: tempGroupName,
              participants: link.participants,
              expiresAt: link.expiresAt,
            })
          );

          // Notificar a todos sobre el nuevo grupo temporal
          broadcastGroupList();
        } else if (link.type === "room") {
          // Unirse a sala temporal
          const roomId = `room_${linkId}`;
          if (!publicRooms.has(roomId)) {
            publicRooms.set(roomId, {
              name: link.roomName || `Sala ${linkId.substring(0, 8)}`,
              participants: new Set(),
              createdBy: link.createdBy,
              isActive: true,
            });
          }

          const room = publicRooms.get(roomId);
          room.participants.add(username);

          ws.send(
            JSON.stringify({
              type: "joinedTemporaryRoom",
              roomId,
              roomName: room.name,
              participants: Array.from(room.participants),
              expiresAt: link.expiresAt,
            })
          );
        }
      } else if (data.type === "createPublicRoom") {
        // Crear sala pública (solo administradores)
        const userInfo = users.get(username);
        if (!userInfo || !isAdmin(userInfo.userData)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Solo los administradores pueden crear salas públicas",
            })
          );
          return;
        }

        const roomName = data.roomName;
        if (!roomName) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Se necesita un nombre para la sala",
            })
          );
          return;
        }

        const roomId = crypto.randomBytes(8).toString("hex");
        publicRooms.set(roomId, {
          name: roomName,
          participants: new Set([username]),
          createdBy: username,
          isActive: true,
          createdAt: new Date(),
        });

        ws.send(
          JSON.stringify({
            type: "publicRoomCreated",
            roomId,
            roomName,
            createdBy: username,
          })
        );
      } else if (data.type === "joinPublicRoom") {
        // Unirse a sala pública
        const roomId = data.roomId;
        const room = publicRooms.get(roomId);

        if (!room || !room.isActive) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Sala no encontrada o no disponible",
            })
          );
          return;
        }

        room.participants.add(username);

        ws.send(
          JSON.stringify({
            type: "joinedPublicRoom",
            roomId,
            roomName: room.name,
            participants: Array.from(room.participants),
          })
        );
      } else if (data.type === "getPublicRooms") {
        // Obtener lista de salas públicas
        const roomsList = Array.from(publicRooms.entries())
          .filter(([, room]) => room.isActive)
          .map(([roomId, room]) => ({
            roomId,
            name: room.name,
            participantCount: room.participants.size,
            createdBy: room.createdBy,
          }));

        ws.send(
          JSON.stringify({
            type: "publicRoomsList",
            rooms: roomsList,
          })
        );
      } else if (data.type === "message") {
        // Enviar mensaje a usuario destino
        const to = data.to;
        const msg = data.message;
        const isGroup = data.isGroup || false;

        console.log(`Mensaje recibido de ${username} a ${to}: "${msg}"`);

        if (isGroup) {
          // Mensaje a un grupo
          if (!groups.has(to)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: `El grupo ${to} no existe`,
              })
            );
            return;
          }

          const group = groups.get(to);

          // Verificar que el remitente es miembro del grupo
          if (!group.has(username)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: `No eres miembro del grupo ${to}`,
              })
            );
            return;
          }

          // Enviar mensaje a todos los miembros del grupo
          let messagesSent = 0;
          for (const member of group) {
            if (member !== username) {
              // No enviar el mensaje al remitente
              const targetInfo = users.get(member);
              if (targetInfo && targetInfo.ws.readyState === 1) {
                // Obtener la hora actual
                const now = new Date();
                const timeString = now.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                // Crear objeto base del mensaje
                const messageObj = {
                  type: "message",
                  from: username,
                  group: to,
                  isGroup: true,
                  time: timeString,
                };

                // Añadir contenido del mensaje (texto y/o multimedia)
                if (msg) {
                  messageObj.message = msg;
                }

                // Añadir información multimedia si existe
                if (data.mediaType) {
                  messageObj.mediaType = data.mediaType;
                  messageObj.mediaData = data.mediaData;
                  messageObj.fileName = data.fileName;
                }

                targetInfo.ws.send(JSON.stringify(messageObj));
                messagesSent++;
              }
            }
          }

          console.log(
            `Mensaje enviado al grupo ${to} (${messagesSent} miembros recibieron el mensaje)`
          );
        } else {
          // Mensaje a un usuario individual
          const targetInfo = users.get(to);
          if (targetInfo && targetInfo.ws.readyState === 1) {
            // WebSocketServer.OPEN is 1
            // Obtener la hora actual
            const now = new Date();
            const timeString = now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            // Crear objeto base del mensaje
            const messageObj = {
              type: "message",
              from: username,
              to: to, // Añadimos el destinatario explícitamente
              time: timeString,
            };

            // Añadir contenido del mensaje (texto y/o multimedia)
            if (msg) {
              messageObj.message = msg;
            }

            // Añadir información multimedia si existe
            if (data.mediaType) {
              messageObj.mediaType = data.mediaType;
              messageObj.mediaData = data.mediaData;
              messageObj.fileName = data.fileName;
            }

            console.log(
              `Enviando mensaje de ${username} a ${to}: "${
                msg || "Archivo multimedia"
              }"`
            );

            targetInfo.ws.send(JSON.stringify(messageObj));
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                message: `Usuario ${to} no está conectado`,
              })
            );
          }
        }
      }
    } catch {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Formato de mensaje inválido",
        })
      );
    }
  });

  ws.on("close", () => {
    if (username) {
      users.delete(username);
      // Enviar lista actualizada de usuarios cuando alguien se desconecta
      broadcastUserList();
    }
  });
});

console.log("Servidor WebSocket escuchando en ws://localhost:8082");
