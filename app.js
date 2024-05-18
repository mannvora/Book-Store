const express = require('express');
const mongoose = require('mongoose');
const app = express();
const authRoutes = require('./routes/authroutes');
const cookieParser = require('cookie-parser');
const { checkUser } = require('./middleware/authMiddleware');
const cors = require('cors');

app.set("view engine", "ejs");
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: `http://localhost:3000`,
}));


const dbURL = 'mongodb+srv://mannvora:Q2St724e9Sb1vlOb@cluster0.b9qww.mongodb.net/nodejs';

mongoose.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
.then((result) => {
    app.listen(5000);
    console.log("connected!!");
})
.catch((err) =>  {
    console.log(err);
});

app.use(authRoutes);

