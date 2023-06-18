const express = require('express');
const admin = require("firebase-admin");
const cors = require('cors');
const appRoute = require('./routes/route.js')

const app = express();
app.use(cors());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static("public"));

require('dotenv').config();

const port = process.env.PORT || 5000;
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

app.use('/', appRoute);

app.listen(port, ()=>{
    console.log(`le serveur est lance sur le port ${port}`)
})