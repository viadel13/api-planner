const router = require("express").Router();
const nodemailer = require("nodemailer");
const Mailgen = require('mailgen');


router.get("/sendMail/:email/:nom", (req, res) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      // Paramètres du produit (facultatif)
      name: "DV-PLANNER",
      link: "https://project-planner-dun.vercel.app/createPassword",
      // logo: 'https://example.com/logo.png'
    },
  });

  // Génération du contenu de l'e-mail
  const email = {
    body: {
      name: `${req.params.nom}`,
      intro: "Bienvenue dans DV-PLANNER !",
      action: {
        instructions:
          "Pour terminer votre inscription, cliquez sur le bouton ci-dessous :",
        button: {
          color: "#22BC66",
          text: "Terminer l'inscription",
          link: "https://www.dvplanner.com/inscription",
        },
      },
      outro: "Si vous avez besoin d'aide, n'hésitez pas à nous contacter.",
    },
  };

  // Générer le HTML de l'e-mail
  const emailBody = mailGenerator.generate(email);

  // Générer le texte brut de l'e-mail
  const emailText = mailGenerator.generatePlaintext(email);

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
    to: `${req.params.email}`, // list of receivers
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
});

router.post('/passwordUser', (req, res)=>{
  const passUser = req.body.data
  console.log(passUser)
  res.redirect(`/addUser/${passUser}`)
})


router.post('/',  (req, res)=>{
  res.send('hello');
})

// app.get("/delete/:email", async (req, res) => {

// })

// app.get('/createUser', (req, res)=>{

// })

module.exports = router;
