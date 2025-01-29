const express = require("express")
const psychometrictest = express.Router()
const { v4: uuidv4 } = require('uuid');

const {checkToken} = require("../middleware/checkToken")
const {fetchUser} = require("../utils/fetchUser")
const {logMessage} = require("../utils/logger")
const {psychometricOllama} = require('../utils/ollama')
const {interfaceFetch} = require("../utils/interface");

const Users = require("../models/users")
const testsession = require("../models/psychometric")

MAX_QUESTIONS = 20

psychometrictest.post("/psychometrictest", checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    const interface = await interfaceFetch(req,res);
    const { test_id, question, answer } = req.body;

    try {
        // New test: when no test_id is provided
        if (!test_id) {
            const userId = await fetchUser(req,res);
            const test_id =  `${userId}-${uuidv4()}`;
            
            const session = new testsession({
                test_id: test_id,
                questions: [{ question, answer }],
                completed: false,
                feedback: "",
            });
            await session.save();

            const user = await Users.findOne({ username: userId });
            if (user) {
                // First-time user - initiate a new test
                const result = await psychometricOllama([], "NEW Regular test", '');
                return res.status(200).json({ result, test_id });

            } else {
                // Existing user - continue from previous session
                const result = await psychometricOllama([], "CONTINUE Regular test", user.mbti);
                return res.status(200).json({result,test_id});
            }
        } else {
            // If test_id is provided, continue the test session
            let session = await testsession.findOne({ test_id: test_id });
            if (!session) {
                return res.status(404).json({ error: "Session not found" });
            }
            
            // Check if the test is completed
            if (session.questions.length >= MAX_QUESTIONS) {
                return res.status(400).json({ error: "Test already completed. Feedback will be provided." });
            }

            // Add the new question and answer to the session
            session.questions.push({ question, answer });
            await session.save();

            const questionsAndAnswers = session.questions.map(q => ({
                question: q.question,
                answer: q.answer
            }));

            // Once 20 questions are completed, mark the test as complete and provide feedback
            if (session.questions.length >= MAX_QUESTIONS) {
                session.completed = true;
                await session.save();

                const user = await Users.findOne({ username: (await fetchUser(req, res)) });
                const mbti = user ? user.mbti : null;

                const result = await psychometricOllama(questionsAndAnswers, "Feedback", mbti);
                session.feedback = result.feedback;
                session.dimension = result.mbti;
                session.counselor = result.counselor;
                await session.save();
                return res.status(200).json({result});
            }

            // Continue the test by generating the next question
            const user = await Users.findOne({ username: (await fetchUser(req, res)) });
            const mbti = user ? user.mbti : null;

            const result = await psychometricOllama(questionsAndAnswers, "CONTINUE Regular test", mbti);
            return res.json({result, test_id});
        }
    } catch (error) {
        console.error("Error in psychometrictest route:", error);
        logMessage(`${interface} ${userIP} : [*] Internal server error : ${error}`)
        return res.status(500).json({ error: "Failed to process the request" });
    }
});

module.exports = psychometrictest;