import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { MongoClient } from 'mongodb';

// --- API Scaffolding: POST /users ---

const router = express.Router();

// 1. Zod Schema
const UserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2)
});

// Mock DB connection (Scaffold)
const mongoClient = new MongoClient(process.env.MONGO_URI || "mongodb://localhost:27017");
const db = mongoClient.db("app_db");
const usersCollection = db.collection("users");

router.post('/users', async (req, res) => {
    try {
        // 2. Validation
        const validatedData = UserSchema.parse(req.body);

        // 3. Password Hashing (Bcrypt)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

        // 4. Persistence (MongoDB)
        const newUser = {
            email: validatedData.email,
            password: hashedPassword, // Store has, NOT plain text
            name: validatedData.name,
            createdAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);

        res.status(201).json({
            success: true,
            userId: result.insertedId,
            message: "User created successfully"
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: "Validation Failed", details: error.errors });
        } else {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

export const userRouter = router;
