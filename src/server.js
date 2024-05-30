const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });

server.on('connection', socket => {
  console.log('A client connected');

  socket.on('message', message => {
    console.log(`Received message: ${message}`);
    server.clients.forEach(client => {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  socket.on('close', () => {
    console.log('A client disconnected');
  });
});

console.log('WebSocket server running on ws://localhost:8080');
