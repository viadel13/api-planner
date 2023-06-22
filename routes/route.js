const router = require("express").Router();
const moment = require("moment");
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
const emailKey = [];
const keyData = {};

const generateSecretKey = () => {
  const saltRounds = 5;
  const secretKey = bcrypt.genSaltSync(saltRounds);
  return secretKey;
};
// const generateUserId = () => {
//   const userId = bcrypt.genSaltSync();
//   return userId;
// };

const authentKey = (req, res, next) => {
  const apiKey = req.headers["apikey"];
  const key = process.env.APIKEY;
  if (apiKey === key) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized " });
  }
};

router.post("/register", authentKey, (req, res) => {
  const { nom, email, phone, sexe, domaine, role } = req.body.dataRegister;

  try {
    const secretKey = generateSecretKey();
    const userRef = usersCollection.doc();
    const expirationTime = Date.now() + 2 * 60 * 1000;
    const verificationToken = jwt.sign(
      { expiration: expirationTime },
      `${secretKey}`
    );
    keyData[verificationToken] = {
      secretKey: secretKey,
      expiration: expirationTime,
    };

    const newEmail = {
      email: `${email}`,
    };
    emailKey.push(newEmail);
    const newUser = {
      utilisateur: nom,
      email,
      phone,
      sexe,
      domaine,
      image: req.body.url,
      role,
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

// router.post("/save-user", async (req, res) => {
//   const passUser = req.body.pass;
//   if (!passUser || passUser.length < 8) {
//     res.render("set-password");
//     return;
//   }

//   try {
//     const query = db
//       .collection("users")
//       .where("email", "==", `${emailKey[0].email}`);

//     const snapshot = await query.get();
//     if (snapshot.empty) {
//       console.log(
//         "Aucun document trouvé avec cette adresse e-mail!",
//         emailKey[0].email
//       );
//     } else {
//       snapshot.forEach(async (doc) => {
//         const { email } = doc.data();
//         // Vérifier si l'utilisateur est déjà authentifié
     
      
//         const response = await auth.createUser({
//           email: `${email}`,
//           password: `${passUser}`,
//         });

//         if (response) {
//           console.log("Successfully created new user:", response);
//           res.render("success");
//         }
      
//       });

//       // const user = await auth.getUserByEmail(emailKey[0].email);
//       // if (user) {
//       //   console.log("L'utilisateur est déjà authentifié");
//       //   res.render("already-authenticated");
//       // }

//     }
//   } catch (error) {
//     if (error.code === "auth/email-already-exists") {
//       console.log("Adresse e-mail déjà utilisée par un autre compte");
//       // Traitez cette erreur de manière appropriée (redirection, message d'erreur, etc.)
//       res.render("already-authenticated");
//     } else {
//       console.log("Error creating new user:", error);
//     }
//   }
// });
router.post("/save-user", async (req, res) => {
  const passUser = req.body.pass;
  if (!passUser || passUser.length < 8) {
    res.render("set-password");
    return;
  }

  try {
    const query = db.collection("users").where("email", "==", `${emailKey[0].email}`);

    const snapshot = await query.get();
    if (snapshot.empty) {
      console.log("Aucun document trouvé avec cette adresse e-mail!", emailKey[0].email);
    } else {
      let userExists = false;

      snapshot.forEach(async (doc) => {
        const { email } = doc.data();
        
        try {
          const response = await auth.createUser({
            email: `${email}`,
            password: `${passUser}`,
          });

          if (response) {
            console.log("Successfully created new user:", response);
            res.render("success");
          }
        } catch (error) {
          if (error.code === "auth/email-already-exists") {
            console.log("Adresse e-mail déjà utilisée par un autre compte");
            // Traitez cette erreur de manière appropriée (redirection, message d'erreur, etc.)
            res.render("already-authenticated");
          } else {
            console.log("Error creating new user:", error);
          }
        }

        userExists = true;
      });

      if (userExists) {
        console.log("L'utilisateur est déjà authentifié");
        res.render("already-authenticated");
      }
    }
  } catch (error) {
    console.log("Error retrieving user from Firestore:", error);
  }
});

router.get("/", (req, res) => {
  res.send("hello");
});

module.exports = router;
