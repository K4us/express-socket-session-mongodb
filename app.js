const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session)

const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const sessionSocketMap = {}

const sessionMiddleware = session({
  store: new MongoDBStore({
    uri: 'mongodb://localhost:27017/oo',
    collection: 'oo-session'
  }),
  secret: 'secret',
  key: 'express.sid'
})

function home(res) {
  return res.redirect('/')
}
/* express app */
app.use(cookieParser())
app.use(sessionMiddleware)

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
app.get('/client.js', (req, res) => res.sendFile(__dirname + '/client.js'))

app.get('/login', (req, res) => {
  req.session.login = true
  return home(res)
})
app.get('/clear', (req, res) => {
  if (!req.session.login) return home(res)
  req.session.val = 0
  req.session.save((err) => {
    if (err) console.error(err)
    return home(res)
  })
})

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    (sessionSocketMap[req.sessionID] || []).forEach((s) => s.disconnect())
    return home(res)
  })
})

let port = 8081
server.listen(port, () => console.log(`Listening on Port:${port}, http://localhost:${port}`))

io.use((socket, next) => sessionMiddleware(socket.request, socket.request.res, next))
io.of('/socket').use((socket, next) => {
  if (!socket.request.session || !socket.request.session.login) return next(new Error('No Login'))
  return next()
}).on('connection', (socket) => {
  let req = socket.request
  sessionSocketMap[req.sessionID] = sessionSocketMap[req.sessionID] || []
  sessionSocketMap[req.sessionID].push(socket)
  socket.on('increment', (callBack) => {
    req.session.reload(() => {
      if (!req.session.val) req.session.val = 0
      req.session.val += 1
      req.session.save(() => callBack(req.session.val))
    })
  })
})