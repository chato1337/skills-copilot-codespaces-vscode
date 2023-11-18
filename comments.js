// Create web server

// Import the express module
const express = require('express');

// Create a router object
const router = express.Router();

// Import the Comment model
const Comment = require('../models/Comment');

// Import the Post model
const Post = require('../models/Post');

// Import the User model
const User = require('../models/User');

// Import the auth middleware
const auth = require('../middleware/auth');

// Import the multer middleware
const multer = require('../middleware/multer-config');

// Import the fs module
const fs = require('fs');

// Import the path module
const path = require('path');

// Import the nodemailer module
const nodemailer = require('nodemailer');

// Import the sanitize-html module
const sanitizeHtml = require('sanitize-html');

// Import the sanitize-html module
const sanitize = require('mongo-sanitize');

// Import the dotenv module
const dotenv = require('dotenv');

// Import the dotenv module
const { check, validationResult } = require('express-validator');

// Import the dotenv module
const { v4: uuidv4 } = require('uuid');

// Load the dotenv config file
dotenv.config();

// Create a transport object
let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER, // generated ethereal user
        pass: process.env.SMTP_PASSWORD, // generated ethereal password
    },
});

// @route GET /comments
// @desc Get all comments
// @access Private
router.get('/', auth, async (req, res) => {
    try {
        // Get all comments
        const comments = await Comment.find().sort({ createdAt: -1 });

        // Return the comments
        res.json(comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route POST /comments
// @desc Create a comment
// @access Private
router.post(
    '/',
    [
        auth,
        [
            check('content', 'Please enter a comment').not().isEmpty(),
            check('post', 'Please enter a post').not().isEmpty(),
        ],
    ],
    async (req, res) => {
        // Check for errors
        const errors = validationResult(req);

        // If there are errors
        if (!errors.isEmpty()) {
            // Return the errors
            return res.status(400).json({ errors: errors.array() });
        }

        // Get the user
        const user = await User.findById(req.user.id).select('-password');

        // Get the post
        const post = await Post.findById(req.body.post);

        // If the post doesn't exist
        if (!post) {
            // Return an error
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Create a new comment
        const newComment = new Comment({
            content: sanitize(req.body.content),
            post: sanitize(req.body.post),
            user: sanitize(req.user.id),
            name: sanitize(user.name),
            avatar: sanitize(user.avatar),
        });

        // Save the comment
        await newComment.save();

        // Create a mail object
        let mail = {
            from: process.env.SMTP_FROM,
            to: process.env.SMTP_TO,
            subject: 'New comment',
            text: `A new comment has been posted on ${process.env.APP_NAME}.`,
            html: `<p>A new comment has been posted on ${process.env.APP_NAME}.</p>`,
        };

        // Send the email
        transporter.sendMail(mail, (err, data) => {
            // If there is an error
            if (err) {
                // Log the error
                console.log(err);
            } else {
                // Log the message
                console.log('Email sent');
            }
        });

        // Return the comment
        res.json(newComment);
    }
);