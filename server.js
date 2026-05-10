const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt=require("bcrypt");
const pool =require("./db");

// replace app.use(cors()) with this
app.use(cors({
  origin: [
    'http://localhost:5173',           // local dev
    'https://node-server-production-c5a5.up.railway.app',      // production (update after Vercel deploy)
    'https://login-app-ivory-six.vercel.app'  // Vercel frontend
  ],
  credentials: true
}));
app.use(express.json());

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token - please login first" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.post("/api/register",async (req,res)=>{
  const {name, email, password}=req.body;
  if(!email || !password || !name){
    return res.status(400).json({error:"All fields are required"})
  }
  try{

    //check email already exist
     const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if(existing.rows.length>0){
      return res.status(409).json({error:"Email already Exist"})
    }

    //password hashing
    const hashPassword=await bcrypt.hash(password,10);
    const result=await pool.query(
      "INSERT INTO users (name,email,password) VALUES ($1,$2,$3) RETURNING id, name, email",
      [name,email,hashPassword]
    );
    res.status(201).json({
      message:"User registered successfully!",
      user:result.rows[0]
    })

  }catch(err){
    console.error("Registration failed", err);
    if (err.code === "23505") {
      return res.status(409).json({error:"Email already Exist"})
    }
    res.status(err.statusCode || 500).json({error:`Registration failed due to ${err.message}`})
  }
})

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if(!email || !password) return res.status(400).json({
    error:"Email and password both required"
  });

  try{
    const result= await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );
    if(result.rows.length==0) return res.status(401).json({
      error:"Invalid Email"
    });

    const user=result.rows[0];

    const passwordMatch=await bcrypt.compare(password,user.password);
    if(!passwordMatch) return res.status(401).json({
      error:"Invalid password"
    });
    // generate a token
    const token=jwt.sign({userId:user.id,email:user.email},process.env.JWT_SECRET,{expiresIn:"1h"});
    return res.status(200).json({
      message:"Login successful!",
      token,
      user:{id:user.id, name:user.name,email:user.email}
    })

  }catch(err){
    console.error(err);
    return res.status(500).json({error:"Login failed"})
  }
});

app.get('/api/profile', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch profile' });
  }
});

async function getData(name) {
  const response = await fetch(`https://restcountries.com/v3.1/name/${name}`);
  if (!response.ok) {
    const error = new Error(`country ${name} not found`);
    error.statusCode = 404;
    throw error;
  }
  const data = await response.json();
  return data[0];
}
app.get("/api/country/:name", verifyToken, async (req, res) => {
  const { name } = req.params;
  try {
    const data = await getData(name);
    res.json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});
app.get("/api/country/:name/capital", verifyToken, async (req, res) => {
  const { name } = req.params;
  try {
    const data = await getData(name);
    const capital = data.capital[0];
    const population = data.population;

    res.json({
      country: name,
      capital,
      population,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: `${err.message}` });
  }
});

app.get("/api/country/:name/summary", verifyToken, async (req, res) => {
  const { name } = req.params;
  try {
    const data = await getData(name);
    const capital = data?.capital?.[0];
    const population = data?.population;
    const currency = Object.values(data?.currencies || {})?.[0]?.name;
    const flag = data?.flags?.png;
    res.json({
      country: name,
      capital,
      population,
      currency,
      flag,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: `${err.message}` });
    console.error(err);
  }
});

// bottom of server.js — update this line
app.listen(process.env.PORT || 5000, () => 
  console.log(`Server running on port ${process.env.PORT || 5000}`)
);
