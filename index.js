const express = require('express');
const cors = require('cors');
const plannerRoute = require('./routes/planner.route.js');
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

app.use('/', plannerRoute);

app.listen(port, ()=>{
    console.log(`le serveur est lance sur le port ${port}`)
})