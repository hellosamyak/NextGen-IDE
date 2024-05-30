// const WebSocket = require('ws');

// const server = new WebSocket.Server({ port: 8080 });

// server.on('connection', socket => {
//   console.log('A client connected');

//   socket.on('message', message => {
//     console.log(`Received message: ${message}`);
//     server.clients.forEach(client => {
//       if (client !== socket && client.readyState === WebSocket.OPEN) {
//         client.send(message);
//       }
//     });
//   });

//   socket.on('close', () => {
//     console.log('A client disconnected');
//   });
// });

// console.log('WebSocket server running on ws://localhost:8080');

const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });

const connections = {};

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'join':
        connections[data.from] = ws;
        broadcast({ type: 'joined', from: data.from });
        break;
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        if (connections[data.to]) {
          connections[data.to].send(JSON.stringify(data));
        }
        break;
      default:
        break;
    }
  });

  ws.on('close', () => {
    const connectionID = Object.keys(connections).find(key => connections[key] === ws);
    if (connectionID) {
      delete connections[connectionID];
      broadcast({ type: 'left', from: connectionID });
    }
  });
});

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

console.log(`WebSocket server is running on port ${PORT}`);
