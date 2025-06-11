// src/app.js - Payment Service Express Application
import express from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

// __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PAYMENT_PORT = process.env.PAYMENT_PORT || 3002; // Port for this service

// --- Firebase Admin SDK Initialization ---
const serviceAccountPath = process.env.FIREBASE_KEY_PATH;

if (!serviceAccountPath) {
  console.error("FIREBASE_KEY_PATH environment variable is NOT SET. Exiting Payment Service.");
  process.exit(1);
}

let firebaseAdminApp;
let db;
let auth;

try {
  const absoluteServiceAccountPath = path.resolve(__dirname, '..', serviceAccountPath);
  console.log(`Payment Service: Attempting to load service account key from: ${absoluteServiceAccountPath}`);
  
  const serviceAccountContent = await fsPromises.readFile(absoluteServiceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountContent);
  
  firebaseAdminApp = initializeApp({
    credential: cert(serviceAccount)
  }, 'paymentServiceApp'); // Use a unique app name to avoid conflicts if running multiple admin apps
  
  db = getFirestore(firebaseAdminApp);
  auth = getAuth(firebaseAdminApp);
  console.log("Payment Service: Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Payment Service: Failed to initialize Firebase Admin SDK:", error);
  if (error.code === 'ENOENT') {
    console.error(`Error: Service account key file not found at "${error.path}".`);
    console.error("Please ensure the file exists and FIREBASE_KEY_PATH in your .env is correct for payment-service.");
  } else if (error.name === 'SyntaxError') {
    console.error(`Error: Failed to parse service account key JSON file for payment-service. It might be corrupted or not valid JSON.`);
  } else {
    console.error("Payment Service: Other Firebase Admin SDK initialization error:", error.message);
  }
  process.exit(1);
}

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS setup (basic - adjust for production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// --- Authentication Middleware ---
// Reusing the same token verification logic as the booking service
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    console.warn("Payment Service: Authentication failed: No token provided.");
    return res.status(401).json({ message: 'Authentication required: No token provided.' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    console.log(`Payment Service: User authenticated: ${req.user.uid}`);
    next();
  } catch (error) {
    console.error("Payment Service: Authentication failed: Invalid token.", error.message);
    return res.status(403).json({ message: 'Authentication failed: Invalid token.', error: error.message });
  }
}

// --- API Routes ---

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Payment Service is running!', status: 'healthy', port: PAYMENT_PORT });
});

// Process Payment Endpoint
app.post('/api/payments/process', authenticateToken, async (req, res) => {
  try {
    const { bookingId, amount, currency, paymentMethod } = req.body;
    const userId = req.user.uid;

    if (!bookingId || !amount || amount <= 0 || !currency || !paymentMethod) {
      return res.status(400).json({ message: 'Booking ID, amount, currency, and payment method are required and must be valid.' });
    }

    // --- Simulate Payment Gateway Interaction ---
    // In a real application, you would integrate with Stripe, PayPal, etc. here.
    // This is a dummy simulation.
    const paymentStatus = 'completed'; // Simulate a successful payment
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Save payment record to Firestore
    const paymentRef = await db.collection('payments').add({
      userId: userId,
      bookingId: bookingId,
      amount: Number(amount),
      currency: currency,
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      status: paymentStatus,
      processedAt: new Date(),
    });

    console.log(`Payment processed for booking ${bookingId} by user ${userId}. Transaction ID: ${transactionId}`);
    res.status(200).json({
      message: 'Payment processed successfully!',
      paymentId: paymentRef.id,
      transactionId: transactionId,
      status: paymentStatus,
      bookingId: bookingId,
      amount: amount,
      currency: currency
    });

  } catch (error) {
    console.error("Payment Service: Error processing payment:", error);
    res.status(500).json({ message: 'Failed to process payment', error: error.message });
  }
});

// Get Payment Status by ID
app.get('/api/payments/:paymentId', authenticateToken, async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    const userId = req.user.uid;

    const paymentDoc = await db.collection('payments').doc(paymentId).get();

    if (!paymentDoc.exists) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    // Ensure the authenticated user owns this payment record
    if (paymentDoc.data().userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized: You do not have access to this payment.' });
    }

    res.status(200).json({ id: paymentDoc.id, ...paymentDoc.data() });

  } catch (error) {
    console.error("Payment Service: Error fetching payment status:", error);
    res.status(500).json({ message: 'Failed to fetch payment status', error: error.message });
  }
});


// Catch-all for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Payment Service: Not Found: The requested API endpoint does not exist.' });
});

// Basic Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Payment Service: Unhandled error:", err.stack);
  res.status(500).json({ message: 'Payment Service: Something broke!', error: err.message });
});

export default app;