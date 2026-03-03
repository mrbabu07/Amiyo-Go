/**
 * Test Email Service
 *
 * This script tests if emails are being sent correctly using your SMTP configuration.
 */

require("dotenv").config();
const emailService = require("../services/emailService");

async function testEmailService() {
  console.log("🧪 Testing Email Service...\n");

  // Check SMTP configuration
  console.log("📋 SMTP Configuration:");
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   User: ${process.env.SMTP_USER}`);
  console.log(
    `   Pass: ${process.env.SMTP_PASS ? "***" + process.env.SMTP_PASS.slice(-4) : "NOT SET"}`,
  );
  console.log(`   App Name: ${process.env.APP_NAME}`);
  console.log(`   App Email: ${process.env.APP_EMAIL}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL}\n`);

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.error("❌ SMTP credentials not configured!");
    console.error("Please check your Server/.env file\n");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("Test 1: Simple Test Email");
  console.log("=".repeat(60));

  try {
    const result = await emailService.sendEmail(
      process.env.SMTP_USER, // Send to yourself
      "Test Email - HnilaBazar",
      `
        <h1>✅ Email Service Working!</h1>
        <p>This is a test email from HnilaBazar.</p>
        <p>If you received this, your email service is configured correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      `,
    );

    if (result.success) {
      console.log("✅ Test email sent successfully!");
      if (result.messageId) {
        console.log(`   Message ID: ${result.messageId}`);
      }
    } else {
      console.error("❌ Failed to send test email");
      console.error(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error("❌ Error sending test email:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Test 2: Order Confirmation Email");
  console.log("=".repeat(60));

  try {
    const result = await emailService.sendOrderConfirmation({
      userEmail: process.env.SMTP_USER,
      userName: "Test User",
      orderId: "TEST123",
      orderTotal: 3.2, // $3.2 USD = ৳352 BDT
      items: [
        {
          title: "Test Product 1",
          quantity: 2,
          price: 1.0, // $1 USD = ৳110 BDT
        },
        {
          title: "Test Product 2",
          quantity: 1,
          price: 1.2, // $1.2 USD = ৳132 BDT
        },
      ],
      shippingAddress: {
        name: "Test User",
        address: "123 Test Street",
        city: "Dhaka",
        zipCode: "1000",
        phone: "+880 1234567890",
      },
    });

    if (result.success) {
      console.log("✅ Order confirmation email sent successfully!");
      if (result.messageId) {
        console.log(`   Message ID: ${result.messageId}`);
      }
    } else {
      console.error("❌ Failed to send order confirmation email");
      console.error(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error("❌ Error sending order confirmation:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Test 3: Order Status Update Email (Shipped)");
  console.log("=".repeat(60));

  try {
    const result = await emailService.sendOrderStatusUpdate({
      userEmail: process.env.SMTP_USER,
      userName: "Test User",
      orderId: "TEST123",
      status: "shipped",
      trackingNumber: "TRACK123456",
    });

    if (result.success) {
      console.log("✅ Status update email sent successfully!");
      if (result.messageId) {
        console.log(`   Message ID: ${result.messageId}`);
      }
    } else {
      console.error("❌ Failed to send status update email");
      console.error(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error("❌ Error sending status update:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Test 4: Welcome Email");
  console.log("=".repeat(60));

  try {
    const result = await emailService.sendWelcomeEmail({
      userEmail: process.env.SMTP_USER,
      userName: "Test User",
    });

    if (result.success) {
      console.log("✅ Welcome email sent successfully!");
      if (result.messageId) {
        console.log(`   Message ID: ${result.messageId}`);
      }
    } else {
      console.error("❌ Failed to send welcome email");
      console.error(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error("❌ Error sending welcome email:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));
  console.log("✅ All tests completed!");
  console.log("\n📧 Check your inbox: " + process.env.SMTP_USER);
  console.log("   You should have received 4 test emails:");
  console.log("   1. Simple test email");
  console.log("   2. Order confirmation");
  console.log("   3. Order shipped notification");
  console.log("   4. Welcome email");
  console.log("\n💡 If you didn't receive emails, check:");
  console.log("   - Spam/Junk folder");
  console.log("   - SMTP credentials in Server/.env");
  console.log("   - Gmail app password is correct");
  console.log("   - 2-factor authentication is enabled on Gmail");
  console.log("=".repeat(60));
}

// Run the tests
testEmailService()
  .then(() => {
    console.log("\n🎉 Email service test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Email service test failed:", error);
    process.exit(1);
  });
