const express = require('express');
const cors = require('cors');
const appRoute = require('./routes/route.js');
const path = require('path')

const app = express();
app.use(cors());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true }));

// app.use(express.static('public', {
//   setHeaders: (res, filePath) => {
//     if (filePath.endsWith('.css')) {
//       res.setHeader('Content-Type', 'text/css');
//     }
//   }
// }));

app.set("view engine", "ejs");
app.use(express.static('public'))


app.use('/css', express.static(path.join(__dirname, 'public/css')))

require('dotenv').config();

const port = process.env.PORT || 5000;

app.use('/', appRoute);

app.listen(port, ()=>{
    console.log(`le serveur est lance sur le port ${port}`)
})