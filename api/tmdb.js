const ALLOWED=[/^tv\/popular$/, /^movie\/popular$/, /^search\/tv$/, /^search\/movie$/, /^tv\/\d+$/, /^movie\/\d+$/, /^tv\/\d+\/season\/\d+$/, /^tv\/\d+\/watch\/providers$/, /^movie\/\d+\/watch\/providers$/, /^tv\/\d+\/videos$/, /^movie\/\d+\/videos$/];
const PARAMS=new Set(["language","page","query","include_adult","region"]);
export default async function handler(req,res){
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Méthode non autorisée."});}
  const token=process.env.TMDB_TOKEN;
  if(!token)return res.status(500).json({error:"TMDB_TOKEN n'est pas configuré dans Vercel."});
  const raw=typeof req.query.path==="string"?req.query.path:"";
  const path=raw.replace(/^\/+|\/+$/g,"");
  if(!ALLOWED.some(r=>r.test(path)))return res.status(400).json({error:"Chemin API non autorisé."});
  const url=new URL("https://api.themoviedb.org/3/"+path);
  for(const key of PARAMS){const value=req.query[key];if(typeof value==="string"&&value.length<=500)url.searchParams.set(key,value);}
  try{
    const upstream=await fetch(url.toString(),{headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
    const body=await upstream.text();res.status(upstream.status);res.setHeader("Content-Type","application/json; charset=utf-8");return res.send(body);
  }catch{return res.status(502).json({error:"Impossible de joindre TMDB."});}
}
