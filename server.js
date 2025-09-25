import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8082 });

const users = new Map(); // username -> ws
const groups = new Map(); // groupName -> Set of usernames

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
  for (const client of users.values()) {
    if (client.readyState === 1) {
      // WebSocketServer.OPEN is 1
      client.send(message);
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
  for (const client of users.values()) {
    if (client.readyState === 1) {
      // WebSocketServer.OPEN is 1
      client.send(message);
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
        users.set(username, ws);
        console.log(`Usuario registrado: ${username}`);
        console.log(`Total de usuarios conectados: ${users.size}`);
        ws.send(
          JSON.stringify({
            type: "info",
            message: `Registrado como ${username}`,
          })
        );
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
              const target = users.get(member);
              if (target && target.readyState === 1) {
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

                target.send(JSON.stringify(messageObj));
                messagesSent++;
              }
            }
          }

          console.log(
            `Mensaje enviado al grupo ${to} (${messagesSent} miembros recibieron el mensaje)`
          );
        } else {
          // Mensaje a un usuario individual
          const target = users.get(to);
          if (target && target.readyState === 1) {
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

            target.send(JSON.stringify(messageObj));
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
