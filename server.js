const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const OPTIMA = 'https://web.optimaeld.com';

app.use((req,res,next)=>{
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers','Content-Type,X-Api-Key');
  if(req.method==='OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

app.get('/health',(req,res)=>res.json({ok:true}));

app.use(async(req,res)=>{
  const key=req.headers['x-api-key']||'';
  const url=OPTIMA+req.originalUrl;
  console.log('->',url);
  try{
    const r=await fetch(url,{
      method:req.method,
      headers:{'X-Api-Key':key,'Accept':'application/json','Content-Type':'application/json'},
      body:req.method!=='GET'?JSON.stringify(req.body):undefined
    });
    const t=await r.text();
    console.log('<-',r.status,t.slice(0,80));
    res.status(r.status).set('Content-Type','application/json').send(t);
  }catch(e){
    res.status(502).json({error:e.message});
  }
});

app.listen(PORT,()=>console.log('PROXY READY port',PORT));
