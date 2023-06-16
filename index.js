const express = require('express');
const admin = require("firebase-admin");
const app = express();

require('dotenv').config();

const port = process.env.PORT || 5000;
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
app.get('/', (req, res)=>{
    res.send('hello')
})

app.get("/hello/:nom", (req, res) =>{
    const user = {
        message : `Hello ${req.params.nom}`
    };
    console.log(user)
    res.json(user);
    res.send('ok')
})

app.get("/delete/:email", async (req, res) => {

    try {
        
        const response = await auth.getUserByEmail(req.params.email)
        
        const uid = response.uid

        if(response){
            await auth.deleteUser(uid)
            console.log('supprimer avec success')
        }
        else{
            console.log('utilisateur introuvable')
        }

    } catch (error) {
        console.log("Error fetching user data:", error);
    }

    res.send('ok')

});

app.listen(port, ()=>{
    console.log(`le serveur est lance sur le port ${port}`)
})