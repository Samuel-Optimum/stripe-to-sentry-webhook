
const fetch = require("node-fetch");
const crypto = require("crypto");

exports.handler = async function(event) {
  const stripeSignature = event.headers["stripe-signature"];
  const endpointSecret = "whsec_dpXgFEuqZ31AyZLKAuxqtUisWyoUd58b";
  const body = event.body;

  const isVerified = true; // Simpelt läge, verifiering rekommenderas i produktion

  if (!isVerified) {
    return { statusCode: 400, body: "Invalid signature" };
  }

  const data = JSON.parse(body).data.object;
  const email = data.customer_email || data.receipt_email;
  const name = data.customer_name || "Användare";
  const password = generatePassword();

  // 1. Skapa användare i SentryLogin
  const response = await fetch("https://www.sentrylogin.com/api/create-user.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      api_username: process.env.SENTRY_API_USERNAME,
      api_password: process.env.SENTRY_API_PASSWORD,
      email: email,
      password: password,
      confirm_password: password,
      access_tag: "Kurs-1,Barnkurs"
    })
  });

  const result = await response.text();

  // 2. Skicka bekräftelsemail med lösenord
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Optimum Guitar <no-reply@optimumguitar.net>",
      to: email,
      subject: "Välkommen till Optimum Guitar",
      html: `<p>Hej ${name}!</p>
             <p>Tack för ditt köp. Du kan nu logga in här: <a href="https://optimumguitar.netlify.app/logga-in.html">Logga in</a></p>
             <p><strong>Användarnamn:</strong> ${email}<br>
             <strong>Lösenord:</strong> ${password}</p>
             <p>Vänliga hälsningar,<br>Optimum Guitar</p>`
    })
  });

  return { statusCode: 200, body: "Klar!" };
};

function generatePassword() {
  return crypto.randomBytes(5).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
}
