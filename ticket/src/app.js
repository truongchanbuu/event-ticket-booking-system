// src/app.js - Your main Express application
import express from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs'; // <--- IMPORTANT FIX: Import promises as fsPromises

// __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- DEBUG LOGS FOR .ENV LOADING ---
console.log(`Current __dirname in app.js: ${__dirname}`);
const dotenvPath = path.resolve(__dirname, '../.env'); // Path should be D:\GitHub\event-ticket-booking-system\ticket\.env
console.log(`Attempting to load .env from: ${dotenvPath}`);

// Load environment variables from .env file
const result = dotenv.config({ path: dotenvPath });

if (result.error) {
  console.error('Error loading .env file:', result.error.message);
  console.error('This often means the .env file does not exist at the specified path.');
} else {
  console.log('.env file loaded successfully.');
  // console.log('Parsed variables:', result.parsed); // Uncomment to see all parsed vars (might contain sensitive data)
  console.log(`FIREBASE_KEY_PATH from process.env: ${process.env.FIREBASE_KEY_PATH}`);
  console.log(`AUTH_PORT from process.env: ${process.env.AUTH_PORT}`);
}
// --- END DEBUG LOGS ---

const app = express();
const AUTH_PORT = process.env.AUTH_PORT || 3001; // Port for this service. Should now pick up from .env if loaded.

// --- Firebase Admin SDK Initialization ---
// IMPORTANT: This path is relative to the project root (D:\GitHub\event-ticket-booking-system\ticket\)
const serviceAccountPath = process.env.FIREBASE_KEY_PATH;

if (!serviceAccountPath) {
  console.error("FIREBASE_KEY_PATH environment variable is NOT SET. Exiting.");
  console.error("Please ensure your .env file is in the project root (D:\\GitHub\\event-ticket-booking-system\\ticket\\.env)");
  console.error("and contains the line: FIREBASE_KEY_PATH=./config/your-key-file.json (with your correct key file name).");
  process.exit(1); // Exit if Firebase key path is missing
}

let firebaseAdminApp;
let db;
let auth;

try {
  // Resolve the absolute path to the service account key JSON file
  const absoluteServiceAccountPath = path.resolve(__dirname, '..', serviceAccountPath);
  console.log(`Attempting to load service account key from: ${absoluteServiceAccountPath}`);
  
  // Read and parse the JSON file asynchronously using fsPromises
  const serviceAccountContent = await fsPromises.readFile(absoluteServiceAccountPath, 'utf8'); // <--- IMPORTANT FIX: Use fsPromises
  const serviceAccount = JSON.parse(serviceAccountContent);
  
  firebaseAdminApp = initializeApp({
    credential: cert(serviceAccount)
  });
  db = getFirestore(firebaseAdminApp);
  auth = getAuth(firebaseAdminApp);
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
  if (error.code === 'ENOENT') { // ENOENT means 'Error NO ENTry', file not found
    console.error(`Error: Service account key file not found at "${absoluteServiceAccountPath}".`);
    console.error("Please ensure the file exists and FIREBASE_KEY_PATH in your .env is correct.");
  } else if (error.name === 'SyntaxError') {
    console.error(`Error: Failed to parse service account key JSON file at "${absoluteServiceAccountPath}". It might be corrupted or not valid JSON.`);
  } else {
    // Catch-all for other errors during Firebase init
    console.error("Other Firebase Admin SDK initialization error:", error.message);
  }
  process.exit(1); // Exit on Firebase initialization error
}

// --- Middleware ---
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// CORS setup (basic - adjust for production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow requests from any origin (be specific in production)
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// --- Authentication Middleware ---
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expects 'Bearer TOKEN'

  if (token == null) {
    console.warn("Authentication failed: No token provided.");
    return res.status(401).json({ message: 'Authentication required: No token provided.' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    console.log(`User authenticated: ${req.user.uid}`);
    next();
  } catch (error) {
    console.error("Authentication failed: Invalid token.", error.message);
    return res.status(403).json({ message: 'Authentication failed: Invalid token.', error: error.message });
  }
}

// --- API Routes ---

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Ticket Booking Backend Service is running!', status: 'healthy' });
});

app.post('/api/auth/create-test-user', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const userRecord = await auth.createUser({ email, password });
    console.log(`Test user created: ${userRecord.uid}`);
    res.status(201).json({ uid: userRecord.uid, email: userRecord.email, message: 'Test user created successfully.' });
  } catch (error) {
    console.error("Error creating test user:", error);
    if (error.code === 'auth/email-already-exists') {
      res.status(409).json({ message: 'Email already exists.', error: error.message });
    } else {
      res.status(500).json({ message: 'Failed to create test user', error: error.message });
    }
  }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { eventName, eventDate, numTickets } = req.body;
    const userId = req.user.uid;

    if (!eventName || !eventDate || !numTickets || numTickets <= 0) {
      return res.status(400).json({ message: 'Event name, date, and number of tickets are required and must be valid.' });
    }

    const bookingRef = await db.collection('bookings').add({
      userId: userId,
      eventName,
      eventDate,
      numTickets: Number(numTickets),
      bookedAt: new Date(),
      status: 'confirmed'
    });

    console.log(`Booking created for user ${userId}: ${bookingRef.id}`);
    res.status(201).json({
      message: 'Booking created successfully!',
      bookingId: bookingRef.id,
      data: { eventName, eventDate, numTickets, userId }
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: 'Failed to create booking', error: error.message });
  }
});

app.get('/api/bookings/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const bookingsRef = db.collection('bookings').where('userId', '==', userId);
    const snapshot = await bookingsRef.get();

    const bookings = [];
    snapshot.forEach(doc => {
      bookings.push({ id: doc.id, ...doc.data() });
    });

    bookings.sort((a, b) => (b.bookedAt?.toDate().getTime() || 0) - (a.bookedAt?.toDate().getTime() || 0));

    console.log(`Fetched ${bookings.length} bookings for user ${userId}.`);
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: 'Failed to fetch bookings', error: error.message });
  }
});

app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.uid;

    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (bookingDoc.data().userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized: You do not own this booking.' });
    }

    await bookingRef.delete();
    console.log(`Booking ${bookingId} deleted by user ${userId}.`);
    res.status(200).json({ message: 'Booking cancelled successfully!' });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ message: 'Failed to cancel booking', error: error.message });
  }
});

app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found: The requested API endpoint does not exist.' });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ message: 'Something broke on the server!', error: err.message });
});

export default app;
