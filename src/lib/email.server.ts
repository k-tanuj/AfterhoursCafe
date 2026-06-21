import nodemailer from "nodemailer";

let testAccount: nodemailer.TestAccount | null = null;
let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  const env = process.env as Record<string, string | undefined>;

  // Use real SMTP if provided in environment variables
  if (env.MAIL_HOST && env.MAIL_USER && env.MAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: env.MAIL_HOST,
      port: Number(env.MAIL_PORT) || 587,
      secure: env.MAIL_SECURE === "true", 
      auth: {
        user: env.MAIL_USER,
        pass: env.MAIL_PASS,
      },
    });
    return transporter;
  }

  // Otherwise fallback to Ethereal Email for local testing
  if (!testAccount) {
    console.log("No SMTP credentials found. Generating Ethereal test account...");
    testAccount = await nodemailer.createTestAccount();
  }

  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return transporter;
}

export type BookingEmailDetails = {
  guest_email: string;
  guest_name: string;
  reference_code: string;
  booking_date: string;
  booking_time: string;
  party: number;
  table_no: string;
};

export async function sendBookingConfirmationEmail(details: BookingEmailDetails) {
  try {
    const t = await getTransporter();

    const htmlContent = `
      <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
        <h1 style="color: #1d1d1d; border-bottom: 2px solid #e63946; padding-bottom: 10px;">AFTERHOURS</h1>
        <p>Hi <strong>${details.guest_name}</strong>,</p>
        <p>Your table is confirmed. We look forward to seeing you.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #e63946; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #e63946;">Booking Slip</h3>
          <p><strong>Reference:</strong> ${details.reference_code}</p>
          <p><strong>Date:</strong> ${details.booking_date}</p>
          <p><strong>Time:</strong> ${details.booking_time}</p>
          <p><strong>Party Size:</strong> ${details.party} guests</p>
          <p><strong>Table:</strong> ${details.table_no}</p>
        </div>
        
        <p style="color: #666; font-size: 0.9em;">
          Need to cancel or change your booking? Just reply to this email or visit our website.
        </p>
        <p style="margin-top: 30px; font-size: 0.8em; color: #999;">
          Relief, after the hard part.<br>
          AFTERHOURS Café
        </p>
      </div>
    `;

    const env = process.env as Record<string, string | undefined>;
    const fromAddress = env.MAIL_FROM || '"AFTERHOURS" <reservations@afterhours.cafe>';

    const info = await t.sendMail({
      from: fromAddress,
      to: details.guest_email,
      subject: `Booking Confirmed: ${details.reference_code}`,
      html: htmlContent,
    });

    console.log("----------------------------------------");
    console.log(`✉️ Booking slip sent to ${details.guest_email}`);
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    console.log("----------------------------------------");

    return true;
  } catch (error: any) {
    console.error("Failed to send booking confirmation email:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    import("fs").then(fs => fs.appendFileSync("email-error.log", error.stack + "\n\n"));
    return false;
  }
}
