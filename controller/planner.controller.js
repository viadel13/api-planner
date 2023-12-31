const moment = require("moment");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
require("dotenv").config();
const Mailgen = require("mailgen");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();
const usersCollection = db.collection("users");
let emailKey = "";
const keyData = {};

const generateSecretKey = () => {
  const saltRounds = 5;
  const secretKey = bcrypt.genSaltSync(saltRounds);
  return secretKey;
};

const authentKey = (req, res, next) => {
  const apiKey = req.headers["apikey"];
  const key = process.env.APIKEY;
  if (apiKey === key) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized " });
  }
};

const register = (req, res) => {
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
    emailKey = email;

    // Ajout de l'objet utilisateur au tableau dataUsers

    const mailGenerator = new Mailgen({
      theme: "default",
      product: {
        // Paramètres du produit (facultatif)
        name: "DV-PLANNER",
        // link: `http://127.0.0.1:5000/`,
        link: `https://project-planner-dun.vercel.app/`,
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
            link: `https://api-planner-y202.onrender.com/set-password/${verificationToken}`,
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
        res.json("enregistrer avec success");
      })
      .catch((err) => {
        res.json("Message non envoye et erreur inscription");
      });
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    res.status(500).json({ message: "Erreur lors de l'inscription" });
  }
};

const setPassword = (req, res) => {
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
};

const saveUser = async (req, res) => {
  const passUser = req.body.pass;
  if (!passUser || passUser.length < 8) {
    res.render("set-password");
    return;
  }

  try {
    const query = db.collection("users").where("email", "==", `${emailKey}`);

    const snapshot = await query.get();
    if (snapshot.empty) {
      console.log("Aucun document trouvé avec cette adresse e-mail!", emailKey);
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
};

const deleteUser = async (req, res) => {
  try {
    const response = await auth.getUserByEmail(req.params.email);

    const uid = response.uid;

    if (response) {
      await auth.deleteUser(uid);
      console.log("supprimer avec success");
      res.json(response);
    } else {
      console.log("utilisateur introuvable");
    }
  } catch (error) {
    console.log("Error fetching user data:", error);
  }
};

const editUser = async (req, res) =>{

};

const verifySuccess = async (req, res)=>{
  try {
    const userList = await admin.auth().listUsers();

    const emailList = userList.users.map((user) => user.email);

    console.log("List of authenticated users:", emailList);

    res.json(emailList); // Envoyer la liste des adresses e-mail en tant que réponse

  } catch (error) {
    console.log("Error fetching authenticated users:", error);
    res.sendStatus(500); // En cas d'erreur, envoyer une réponse d'erreur au client
  }
}

module.exports = {
  register,
  authentKey,
  setPassword,
  saveUser,
  deleteUser,
  verifySuccess,
  editUser,
};
