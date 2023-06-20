const router = require("express").Router();
const moment = require('moment');
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
require("dotenv").config();
const Mailgen = require("mailgen");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();
const usersCollection = db.collection("users");
const key = []
const keyData = {};

const generateSecretKey = () => {
  const saltRounds = 5;
  const secretKey = bcrypt.genSaltSync(saltRounds);
  return secretKey;
};
const generateUserId = () => {
  const userId = bcrypt.genSaltSync();
  return userId;
};

router.post("/register", (req, res) => {
  const { nom, email, phone, sexe, domaine, image, role } = req.body.dataRegister;
  console.log(image)
  try {
    const userId = generateUserId();
    const secretKey = generateSecretKey();
    const userRef = usersCollection.doc(userId);
    const expirationTime = Date.now() + 2 *60 * 1000;
    const verificationToken = jwt.sign({expiration: expirationTime }, `${secretKey}`);
    keyData[verificationToken] = {
      secretKey: secretKey,
      expiration: expirationTime,
    };

    const newKey = {
      pass: `${userId}`
    }
    key.push(newKey)
    const newUser = {
      utilisateur: nom,
      email,
      phone,
      sexe,
      domaine,
      image,
      role
    };
    userRef.set(newUser);
    // Ajout de l'objet utilisateur au tableau dataUsers


    
    const mailGenerator = new Mailgen({
      theme: "default",
      product: {
        // Paramètres du produit (facultatif)
        name: "DV-PLANNER",
        link: `https://project-planner-dun.vercel.app`,
        // logo: 'https://example.com/logo.png'
      },
    });
    
    const expirationDuration = moment.duration(expirationTime - Date.now());
    const expirationMinutes = expirationDuration.minutes();
    const expirationSeconds = expirationDuration.seconds();
    // Génération du contenu de l'e-mail
    const mail = {
      body: {
        name: `${nom}`,
        intro: "Bienvenue dans DV-PLANNER !",
        action: {
          instructions:
            "Pour terminer votre inscription, cliquez sur le bouton ci-dessous :",
          button: {
            color: "#22BC66",
            text: "Terminer l'inscription",
            link: `https://api-dvplanner-9cdb66a81978.herokuapp.com/set-password/${verificationToken}`,
            // link: `http://127.0.0.1:5000/set-password/${verificationToken}`,
          },
        },
        outro: `Ce lien expirera dans ${expirationMinutes} minutes et ${expirationSeconds} secondes.<br> Si vous avez besoin d'aide, n'hésitez pas à nous contacter.`,
      },
    };

    // Générer le HTML de l'e-mail
    const emailBody = mailGenerator.generate(mail);

    // Générer le texte brut de l'e-mail
    const emailText = mailGenerator.generatePlaintext(mail);

    let config = {
      service: "gmail",
      auth: {
        user: process.env.USER,
        pass: process.env.PASSWORD,
      },
    };
    let transporter = nodemailer.createTransport(config);
    let message = {
      from: '"DV-PLANNER" <shababizetre@gmail.com>', // sender address
      to: `${email}`, // list of receivers
      subject: "Cree un mot de passe", // Subject line
      text: "cliquer sur le lien", // plain text body
      html: emailBody, // html body
    };
    transporter
      .sendMail(message)
      .then((result) => {
        console.log(result);
      })
      .catch((err) => {
        console.log(err);
      });
    res.send("email send");
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    res.status(500).json({ message: "Erreur lors de l'inscription" });
  }
});



router.get("/set-password/:token", (req, res) => {
  const token = req.params.token;

  try {
    const keyInfo = keyData[token];

    if (keyInfo) {
      const currentTimestamp = Date.now();
      if (currentTimestamp > keyInfo.expiration) {
        res.render("lien-expire");
      } else {
        res.render("set-password");
      }
    } else {
      res.send("Token invalide.");
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Erreur lors du traitement du token" });
  }
});


router.post("/save-user", async (req, res) => {
  const passUser = req.body.pass;

  if(passUser){
    if(passUser.length < 8){
      res.redirect('set-password')
    }
    
  try {
    const userRef = db.collection("users").doc(`${key[0].pass}`);
    const doc = await userRef.get();
    if (!doc.exists) {
      console.log("No such document!");
    } else {
      const{email} = doc.data()
      auth.createUser({
        email: `${email}`,
        password: `${passUser}`,
      })
      .then((userRecord) => {
        // See the UserRecord reference doc for the contents of userRecord.
        console.log('Successfully created new user:', userRecord.uid);
     
      })
      .catch((error) => {
        console.log('Error creating new user:', error);
      });
    }
    res.send('ok')
  } catch (error) {
    
  }
  
  }
  else{
    res.redirect('set-password')
  }


});

router.get("/", (req, res) => {
  res.send("hello");
});

module.exports = router;
