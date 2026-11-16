const express=require('express');const router=express.Router();const crypto=require('crypto');const path=require('path');const aws=require('../services/aws');const Cliente=require('../models/cliente');const Salao=require('../models/salao');const{hashPassword,verifyPassword,issueToken}=require('../auth/security');const{requireAuth}=require('../auth/middleware');
const validEmail=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x||'').trim());const emailFilter=x=>({email:{$regex:'^'+String(x).trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$',$options:'i'}});const validPassword=x=>typeof x==='string'&&x.length>=8&&x.length<=128&&/[A-Z]/.test(x)&&/[a-z]/.test(x)&&/\d/.test(x)&&/[^A-Za-z0-9]/.test(x);const publicUser=(u,role)=>({id:String(u._id),nome:u.nome,email:u.email,role});
router.post('/register/cliente',async(req,res)=>{
  try{
    const{nome,email,senha,telefone,dataNascimento,sexo,documento}=req.body||{};
    const documentoInformado=documento!==undefined&&documento!==null;
    const documentoValido=!documentoInformado||(['individual','corporation'].includes(documento?.tipo)&&typeof documento?.numero==='string'&&documento.numero.trim());
    if(typeof nome!=='string'||!nome.trim()||!validEmail(email)||!validPassword(senha)||!telefone||!dataNascimento||!['M','F'].includes(sexo)||!documentoValido)return res.status(400).json({error:true,message:'Preencha os dados obrigatórios e use uma senha com 8 caracteres, letra maiúscula, letra minúscula, número e caractere especial. O documento é opcional.'});
    const normalized=email.trim().toLowerCase();
    if(await Cliente.exists(emailFilter(normalized)))return res.status(409).json({error:true,message:'Já existe uma conta de cliente com este e-mail.'});
    const dadosCliente={nome:nome.trim(),email:normalized,senha:await hashPassword(senha),telefone:String(telefone).trim(),dataNascimento,sexo,status:'A'};
    if(documentoInformado)dadosCliente.documento={tipo:documento.tipo,numero:String(documento.numero).trim()};
    const user=await new Cliente(dadosCliente).save();
    return res.status(201).json({error:false,token:issueToken(user,'cliente'),usuario:publicUser(user,'cliente')});
  }catch(e){
    if(e.code===11000)return res.status(409).json({error:true,message:'Já existe uma conta com este e-mail.'});
    console.error('Erro ao cadastrar cliente:',e);
    return res.status(500).json({error:true,message:e.message});
  }
});
router.post('/register/salao',async(req,res)=>{
  try{
    const{nome,email,senha,telefone,foto,rua,cidade,uf,longitude,latitude}=req.body||{};
    const geoInformado=[longitude,latitude].some(valor=>valor!==undefined&&valor!==null&&String(valor).trim()!=='');
    const lng=Number(longitude),lat=Number(latitude);
    const geoValido=!geoInformado||(longitude!==undefined&&longitude!==null&&String(longitude).trim()!==''&&latitude!==undefined&&latitude!==null&&String(latitude).trim()!==''&&Number.isFinite(lng)&&lng>=-180&&lng<=180&&Number.isFinite(lat)&&lat>=-90&&lat<=90);
    if(typeof nome!=='string'||!nome.trim()||!validEmail(email)||!validPassword(senha)||!geoValido)return res.status(400).json({error:true,message:'Preencha nome e e-mail e use uma senha com 8 caracteres, letra maiúscula, letra minúscula, número e caractere especial. Se informar localização, forneça latitude e longitude válidas.'});
    const normalized=email.trim().toLowerCase();
    if(await Salao.exists(emailFilter(normalized)))return res.status(409).json({error:true,message:'Já existe uma conta de salão com este e-mail.'});
    let fotoUrl=typeof foto==='string'?foto.trim():'';
    const logo=req.files?.foto;
    if(logo){
      const extensoes={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
      const extensao=extensoes[logo.mimetype];
      if(!extensao)return res.status(400).json({error:true,message:'A logo precisa ser uma imagem JPG, PNG, WEBP ou GIF.'});
      if(!logo.data||logo.data.length>4*1024*1024)return res.status(400).json({error:true,message:'A logo deve ter no máximo 4 MB.'});
      const caminho=`saloes/logos/${crypto.randomUUID()}.${extensao}`;
      const upload=await aws.uploadToS3(logo,caminho);
      if(upload.error)return res.status(502).json({error:true,message:'Não foi possível enviar a logo. Tente novamente.'});
      fotoUrl=upload.message.Location;
    }
    const dadosSalao={nome:nome.trim(),email:normalized,senha:await hashPassword(senha),telefone:String(telefone||'').trim(),foto:fotoUrl||undefined};
    const ruaNormalizada=String(rua||'').trim(),cidadeNormalizada=String(cidade||'').trim(),ufNormalizada=String(uf||'').trim();
    if(ruaNormalizada||cidadeNormalizada||ufNormalizada)dadosSalao.endereco={rua:ruaNormalizada,cidade:cidadeNormalizada,uf:ufNormalizada};
    if(geoInformado)dadosSalao.geo={type:'Point',coordinates:[lng,lat]};
    const user=await new Salao(dadosSalao).save();
    return res.status(201).json({error:false,token:issueToken(user,'salao'),usuario:publicUser(user,'salao'),salaoId:String(user._id)});
  }catch(e){
    if(e.code===11000)return res.status(409).json({error:true,message:'Já existe uma conta com este e-mail.'});
    console.error('Erro ao cadastrar salão:',e);
    return res.status(500).json({error:true,message:e.message});
  }
});
router.post('/login',async(req,res)=>{try{const{email,senha,role}=req.body||{};if(!validEmail(email)||typeof senha!=='string'||!['cliente','salao'].includes(role))return res.status(400).json({error:true,message:'Informe e-mail, senha e tipo de conta.'});const Model=role==='salao'?Salao:Cliente,user=await Model.findOne(emailFilter(email));if(!user||user.status==='I')return res.status(401).json({error:true,message:'E-mail ou senha incorretos.'});const checked=await verifyPassword(senha,user.senha);if(!checked.valid)return res.status(401).json({error:true,message:'E-mail ou senha incorretos.'});if(checked.legacy){user.senha=await hashPassword(senha);await user.save()}return res.json({error:false,token:issueToken(user,role),usuario:publicUser(user,role),...(role==='salao'?{salaoId:String(user._id)}:{})})}catch(e){console.error('Erro ao autenticar:',e);return res.status(500).json({error:true,message:e.message})}});
router.get('/me',requireAuth,async(req,res)=>{try{const Model=req.auth.role==='salao'?Salao:Cliente,user=await Model.findById(req.auth.sub).select('nome email telefone foto');if(!user)return res.status(404).json({error:true,message:'Conta não encontrada.'});return res.json({error:false,usuario:publicUser(user,req.auth.role)})}catch(e){return res.status(500).json({error:true,message:e.message})}});
module.exports=router;
