const express = require('express');

const {Server:SocketServer} = require('socket.io')
const {Server:HTTPServer} = require('http');

const app = express();
const handlebars = require('express-handlebars');
const events = require('./public/js/sockets_events');
const httpServer = new HTTPServer(app);
const socketServer = new SocketServer(httpServer);
const routerProductos = require('./routes/productos-test')

const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoOptions = { useNewUrlParser: true, useUnifiedTopology: true }

const {mensaje} = require('./schema/mensajes')
const MensajeMongo = require('./DAOs/mensajes')
const nvoMsj = new MensajeMongo
const connection = require('./dataBase')
connection()

 const hbs = handlebars.create({
    extname:'.hbs',
    defaultLayout:'index.hbs',
    layoutsDir: __dirname + '/public/views/layout',
})  
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use('/test/productos', routerProductos)

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', './public/views');

app.use(session({
    store: MongoStore.create({
        mongoUrl: 'mongodb+srv://ignacio:pass123456@cluster0.cqnie57.mongodb.net/?retryWrites=true&w=majority',
        mongoOptions,
        ttl: 600,
        retries: 0
    }),
    secret: "Secret",
    resave: false,
    saveUninitialized: true
}))



app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/login.html");
});

app.get("/login", (req, res) => {
    const usuario = req.session.usuario
    if(!usuario){
        res.redirect('http://localhost:3000/')
    }
    res.render('main',{
        usuario: usuario
    })
});

app.post("/", (req,res)=>{
    let usuario = req.body.usuario;
    req.session.usuario = usuario
    if(usuario){
        res.redirect('http://localhost:3000/login')
    }
})

app.get("/logout", (req,res)=>{
    let usuario = req.session.usuario
    if(usuario){
        req.session.destroy();
        res.render('./partials/logout',{
         usuario: usuario
    })
    }else{
        res.redirect('http://localhost:3000/')
    }
})


socketServer.on('connection', async(socket)=>{
    const totalMensajes = await nvoMsj.getAll();
    socketServer.emit(events.TOTAL_MENSAJES, totalMensajes)
    socket.on(events.ENVIAR_MENSAJE, async(msg)=>{
        const MENSAJE = new mensaje(msg)
        const result = await nvoMsj.save(MENSAJE)
        console.log(result);
        console.log(msg.author.nombre);
        socketServer.sockets.emit(events.NUEVO_MENSAJE, msg)
    })
    const pesoNormMsjs = JSON.stringify(totalMensajes).length / 1024
    socketServer.sockets.emit('porcentaje', totalMensajes, pesoNormMsjs)
})

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, ()=>{
    console.log(`El servidor se esta ejecutando en el puerto ${PORT}`);
})