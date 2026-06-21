
import { sendBookingConfirmationEmail } from './src/lib/email.server.ts';

async function run() {
  const success = await sendBookingConfirmationEmail({
    guest_email: "tanujkumawat54@gmail.com",
    guest_name: "Test Guest",
    reference_code: "AH-TEST",
    booking_date: "2026-06-20",
    booking_time: "8:00 pm",
    party: 2,
    table_no: "T1",
  });
  console.log("Email success:", success);
}

run();
