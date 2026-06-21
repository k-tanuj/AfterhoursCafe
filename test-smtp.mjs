import nodemailer from 'nodemailer';

async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log("✅ SMTP connection successful! Your App Password works.");
    
    // Attempt to send a test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "tanujkumawat54@gmail.com",
      subject: "Test email from AFTERHOURS",
      text: "If you see this, the email setup is working!"
    });
    console.log("Email sent successfully: ", info.messageId);
    
  } catch (error) {
    console.error("❌ SMTP error:", error.message);
  }
}

testEmail();
