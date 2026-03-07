import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import userRoutes from './routes/user-routes.js';
import authRoutes from './routes/auth-routes.js';
import { createRootAdminUser } from './database/query.js';
dotenv.config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors()); // config cors so that front-end can use

// To handle CORS Errors
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*"); // "*" -> Allow all links to access

	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept, Authorization",
	);

	// Browsers usually send this before PUT or POST Requests
	if (req.method === "OPTIONS") {
		res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, PATCH");
		return res.status(200).json({});
	}

	// Continue Route Processing
	next();
});

app.use((req, res, next) => {
	console.log(`${req.method} ${req.path}`);
	if (req.body && Object.keys(req.body).length > 0) {
		console.log('Body:', req.body);
	}
	if (req.query && Object.keys(req.query).length > 0) {
		console.log('Query:', req.query);
	}
	if (req.params && Object.keys(req.params).length > 0) {
		console.log('Params:', req.params);
	}
	if (req.headers) {
		console.log('Headers:', req.headers);
	}

	next();
});

app.use('/users', userRoutes);
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3000;

async function initializeRootAdmin() {
	try {
    const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
      console.log(
        "Admin credentials not fully set in environment variables. Skipping root admin initialization.",
      );
      return;
    }
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, salt);

    await createRootAdminUser(ADMIN_EMAIL, ADMIN_USERNAME, hashedPassword);
    console.log("Root admin user created successfully.");
  } catch (error) {
    console.error("Failed to initialize root admin user:", error);
  }
}

async function startServer() {
	try {
		app.listen(PORT, () => {
			console.log(`User service listening on port ${PORT}`);
		});
	} catch (error) {
		console.error('Failed to start user service:', error);
		process.exit(1);
	}
}

startServer();
initializeRootAdmin();

