// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIO(server,{
  transports: ['polling', 'websocket'],
  cors: {
    origin: "*",  // This will allow any origin
    methods: ["GET", "POST"],  // Allowed request methods
    allowedHeaders: ["my-custom-header"],  // Allowed custom headers
    credentials: true  // This is important if you are using cookies/sessions
  }
});

// setup the db
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// XHR HTTP
const port = 3009;



app.use(bodyParser.json());

const { exec } = require('child_process');

// see if the users table exists
// if not, create it
db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`, (err, row) => {
  if (err) {
    console.error(err);
    return;
  }
  if (!row) {
    db.run(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      real_name_first TEXT NOT NULL,
      real_name_m TEXT,
      real_name_last TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )`);
  }
});

// make sure the SYSTEM user exists
const stmt = db.prepare(`SELECT * FROM users WHERE username = ?`);
stmt.get('SYSTEM', (err, row) => {
  if (err) {
    console.error(err);
    return;
  }
  if (!row) {
    db.run(`INSERT INTO users (username, real_name_first, real_name_last, email, phone, password) VALUES (?, ?, ?, ?, ?, ?)`, 'SYSTEM', 'SYSTEM', 'SYSTEM', 'SYSTEM', 'SYSTEM', 'SYSTEM');
  }
});

// make sure the ADMIN user exists
stmt.get('ADMIN', (err, row) => {
  if (err) {
    console.error(err);
    return;
  }
  if (!row) {
    db.run(`INSERT INTO users (username, real_name_first, real_name_last, email, phone, password) VALUES (?, ?, ?, ?, ?, ?)`, 'ADMIN', 'ADMIN', 'ADMIN', 'ADMIN', 'ADMIN', 'ADMIN');
  }
});

// Add a route that exposes the ability to call the git add command on the project's repo directory
// app.post('/git-add', (req, res) => {
//   exec('git add .', (err, stdout, stderr) => {
//     if (err) {
//       console.error(err);
//       res.status(500).send('Error executing git add command');
//       return;
//     }
//     console.log(stdout);
//     res.status(200).send('Git add command executed successfully');
//   });
// });

// Add a route that exposes the ability to call the git commit command on the project's repo directory
// app.post('/git-commit', (req, res) => {
//   const { message } = req.body;
//   exec(`git commit -m "${message}"`, (err, stdout, stderr) => {
//     if (err) {
//       console.error(err);
//       res.status(500).send('Error executing git commit command');
//       return;
//     }
//     console.log(stdout);
//     res.status(200).send('Git commit command executed successfully');
//   });
// });

// NOTE: there is a second command-line program that communicate with this server...
// it is located in the client directory and is called client.js
// users can interact with the server via the client program (like laravel tinker sessions and artisan commands)
// this is a route dedicated to authenticating client program requests
// the client program will send a request to this route with a secret key
// if the secret key matches the one stored on the server, the client program will be authenticated
// and will be able to execute commands on the server
// this is a simple way to prevent unauthorized access to the server
// NOTE: this is not a secure way to authenticate a client program
// but it is a simple way to demonstrate the concept
let authToken = null;

// app.post('/authenticate-client', (req, res) => {
//   const { secret } = req.body;
//   if (secret === 'secret') {
//     authToken = generateAuthToken();
//     res.status(200).json({ message: 'Client authenticated successfully', token: authToken });
//   } else {
//     res.status(401).json({ error: 'Client authentication failed' });
//   }
// });

// app.post('/uber', (req, res) => {
//   const { token, command, args } = req.body;
//   if (token !== authToken) {
//     res.status(401).json({ error: 'Invalid authentication token' });
//     return;
//   }
//   switch (command) {
//     case 'deleteStack':
//       const stackId = parseInt(args[0]);
//       if (isNaN(stackId)) {
//         res.status(400).json({ error: 'Invalid stack ID', callstack: getCallstack() });
//         return;
//       }
//       const stmt = db.prepare(`SELECT * FROM stacks WHERE id = ?`);
//       stmt.get(stackId, (err, row) => {
//         if (err) {
//           res.status(500).json({ error: err.message });
//           return;
//         }
//         if (!row) {
//           res.status(404).json({ error: 'Stack not found' });
//           return;
//         }
//         // TODO: implement deleteStack function
//         res.status(200).json({ message: 'Stack deleted successfully' });
//       });
//       stmt.finalize();
//       break;
//     case 'deleteStacks':
//       const ids = args.map(id => parseInt(id));
//       const results = { success: [], failure: [] };
//       const promises = ids.map(id => {
//         return new Promise((resolve, reject) => {
//           const stmt = db.prepare(`SELECT * FROM stacks WHERE id = ?`);
//           stmt.get(id, (err, row) => {
//             if (err) {
//               reject(err);
//               return;
//             }
//             if (!row) {
//               results.failure.push(id);
//               resolve();
//               return;
//             }
//             // TODO: implement deleteStack function
//             results.success.push(id);
//             resolve();
//           });
//           stmt.finalize();
//         });
//       });
//       Promise.all(promises)
//         .then(() => {
//           res.status(200).json({ message: 'Stacks deleted successfully', results });
//         })
//         .catch((err) => {
//           res.status(500).json({ error: err.message });
//         });
//       break;
//     default:
//       res.status(400).json({ error: 'Invalid command', callstack: getCallstack() });
//       break;
//   }
// });

// function generateAuthToken() {
//   // TODO: implement token generation
// }

// function getCallstack() {
//   // TODO: implement callstack retrieval
// }

// Register a new user
// app.post('/register', (req, res) => {
//   const { username, real_name_first, real_name_m, real_name_last, email, phone, password } = req.body;

//   // Here you would add password strength validation according to your requirements.

//   const stmt = db.prepare(`INSERT INTO users (username, real_name_first, real_name_m, real_name_last, email, phone, password) VALUES (?, ?, ?, ?, ?, ?, ?)`);
//   stmt.run(username, real_name_first, real_name_m, real_name_last, email, phone, password, (err) => {
//     if (err) {
//       res.status(400).json({ error: err.message });
//     } else {
//       res.status(201).json({ message: "User registered successfully!" });
//     }
//   });
//   stmt.finalize();
// });

// Authentication would go here - you'll need to create an endpoint for login and compare the provided password
// with the stored hash (after you implement password hashing)

// More API endpoints as per your specification would be added here...

// SETUP websocket server for real-time communication with the client
// const WebSocket = require('ws');
// const wss = new WebSocket.Server({ port: WSS_PORT });
// keep track of clients
const clients = [];
const heartbeats = new Map();

// Handle connection
io.on('connection', (socket) => {
  console.log('a user connected');

  console.log('Client connected');
  clients.push(socket);
  // assign a unique ID to the client
  socket.id = clients.length;
  // let the client know what its ID is
  socket.emit('id', socket.id);

  socket.on('message', (message) => {
    console.log(`Received message => ${JSON.stringify(message)}`);
  });
  let lastHeartbeatSent = Date.now();
  // establish a heartbeat to keep the connection alive
  const heartbeat = setInterval(() => {
    // so client knows about missed heartbeats / missed broadcasts
    let thisHeartbeat = Date.now();
    socket.emit('heartbeat', JSON.stringify({ heartbeat: thisHeartbeat, lastHeartbeatSent }));
    lastHeartbeatSent = thisHeartbeat;
  }, 30000);

  // keep track of the heartbeat emitter
  heartbeats.set(socket.id, heartbeat);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    // remove the client from the clients array
    const index = clients.indexOf(socket);
    if (index !== -1) {
      clients.splice(index, 1);
    }
    // clear the heartbeat emitter
    clearInterval(heartbeats.get(socket.id));
    heartbeats.delete(socket.id);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

server.listen(3010, () => {
  console.log('listening on *:3010');
});
