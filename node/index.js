const http = require("http");
const { WebSocketServer } = require("ws");
const url = require("url");
const uuid = require("uuid").v4;

const server = http.createServer();
const wsServer = new WebSocketServer({ server });
const port = 8000;

const connections = {};
const users = {};

const broadcastUsers = () => {
  Object.keys(connections).forEach((id) => {
    const connection = connections[id];
    const message = JSON.stringify(users);
    connection.send(message);
  });
};

const handleMessage = (bytes, id) => {
  // json {x: 1, y: 2}
  const message = JSON.parse(bytes.toString());
  const user = users[id];
  user.state = message;

  broadcastUsers();
};

const handleClose = (id) => {
  delete connections[id];
  delete users[id];
  broadcastUsers();
};

wsServer.on("connection", (connection, request) => {
  const { username } = url.parse(request.url, true).query;
  const id = uuid();
  console.log(`${username}-${id} connected`);

  connections[id] = connection;
  users[id] = {
    username: username,
    state: {},
  };

  connection.on("message", (message) => {
    handleMessage(message, id);
  });

  connection.on("close", () => {
    handleClose(id);
    console.log(`${username}-${id} disconnected`);
  });
});

server.listen(port, () => {
  // ws://localhost:8000?username=foo
  console.log(`ws://localhost:${port}`);
});
