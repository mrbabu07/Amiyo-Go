const webpush = require("web-push");

try {
  // Generate VAPID keys
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log("🔑 VAPID Keys Generated Successfully!");
  console.log("");
  console.log("Public Key:");
  console.log(vapidKeys.publicKey);
  console.log("");
  console.log("Private Key:");
  console.log(vapidKeys.privateKey);
  console.log("");
  console.log("📝 Add these to your .env file:");
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_EMAIL=mailto:admin@amiyo-go.com`);
  console.log("");
  console.log("✅ Keys generated successfully!");
} catch (error) {
  console.error("❌ Error generating VAPID keys:", error);
}
