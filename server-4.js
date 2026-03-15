const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const OPTIMA_BASE = 'https://web.optimaeld.com';

app.use((req,res,next)=>{
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers','Content-Type,Authorization,X-Api-Key,X-API-Key');
  if(req.method==='OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

app.get('/health',(req,res)=>{
  res.json({status:'ok',time:new Date().toISOString()});
});

app.use(async(req,res)=>{
  const key = req.headers['x-api-key'] || req.headers['x-API-Key'] || '';
  const url = OPTIMA_BASE + req.originalUrl;
  console.log('Proxy:',req.method,url);
  try{
    const r = await fetch(url,{
      method: req.method,
      headers: {
        'X-Api-Key': key,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: req.method!=='GET' ? JSON.stringify(req.body) : undefined
    });
    const text = await r.text();
    console.log('Response:',r.status,text.slice(0,120));
    res.status(r.status).set('Content-Type','application/json').send(text);
  }catch(e){
    console.error('Error:',e.message);
    res.status(502).json({error:e.message});
  }
});

app.listen(PORT,()=>console.log('PROXY READY on port',PORT));
