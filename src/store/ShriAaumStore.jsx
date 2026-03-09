import { useState, useEffect, useCallback } from "react";
import { getProducts, getBanners, createPaymentOrder, verifyPayment } from "../api";

const C = {
  red:"#A00404", redDark:"#7a0303",
  amber:"#FFB031", gold:"#EAB659", cream:"#FFEED4",
  green:"#004921", ivory:"#FFF9F0",
  text:"#1a0a00", text2:"#5a2a00", muted:"#9a7a5a",
  border:"rgba(234,182,89,.35)"
};
const fmt = n => "₹" + Number(n).toLocaleString("en-IN");
const disc = (o,c) => o>c ? Math.round(((o-c)/o)*100) : 0;

const CATS = [
  {id:"all",        label:"All",        icon:"🕉️"},
  {id:"rudraksha",  label:"Rudraksha",  icon:"📿"},
  {id:"puja-samagri",label:"Puja",      icon:"🪔"},
  {id:"prasadam",   label:"Prasadam",   icon:"🙏"},
  {id:"panchaloha", label:"Panchaloha", icon:"⚱️"},
  {id:"wellness",   label:"Wellness",   icon:"🌿"},
  {id:"wearables",  label:"Wearables",  icon:"💍"},
];

function Toast({toasts}){
  return(
    <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:9999,display:"flex",flexDirection:"column",gap:6,alignItems:"center",width:"90%",maxWidth:340,pointerEvents:"none"}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:t.type==="err"?C.redDark:C.green,color:C.cream,padding:"10px 16px",borderRadius:6,fontSize:12,fontFamily:"Montserrat,sans-serif",boxShadow:"0 4px 20px rgba(0,0,0,.3)",borderLeft:`3px solid ${C.amber}`,width:"100%",textAlign:"center"}}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

async function launchRazorpay({cart,ckData,onSuccess,onFail,addToast}){
  const subtotal=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const ship=subtotal>=999?0:99;
  const coupon=ckData.coupon==="AAUM10"?Math.round(subtotal*.1):0;
  const total=subtotal+ship-coupon;
  try{
    const order=await createPaymentOrder({amount:total,currency:"INR",receipt:`sa_${Date.now()}`});
    const opts={
      key:import.meta.env.VITE_RAZORPAY_KEY_ID||"",
      amount:order.amount,currency:order.currency||"INR",
      name:"Shri Aaum Sacred Store",description:"Temple-Blessed Products",
      order_id:order.id,
      prefill:{name:ckData.name,contact:ckData.phone,email:ckData.email||""},
      theme:{color:C.red},
      handler:async res=>{
        try{
          await verifyPayment({
            razorpay_order_id:res.razorpay_order_id,
            razorpay_payment_id:res.razorpay_payment_id,
            razorpay_signature:res.razorpay_signature,
            items:cart.map(i=>({productId:i._id,name:i.name,qty:i.qty,price:i.price})),
            customer:ckData,total
          });
          onSuccess();
        }catch{addToast("Payment verification failed","err");}
      },
      modal:{ondismiss:()=>addToast("Payment cancelled","err")}
    };
    const open=()=>new window.Razorpay(opts).open();
    if(window.Razorpay){open();}
    else{const s=document.createElement("script");s.src="https://checkout.razorpay.com/v1/checkout.js";s.onload=open;document.body.appendChild(s);}
  }catch(e){addToast(e.message||"Payment failed","err");onFail();}
}

export default function ShriAaumStore(){
  const [products,setProducts]=useState([]);
  const [heroTitle,setHeroTitle]=useState("Sacred Products, Temple Blessed");
  const [loading,setLoading]=useState(true);
  const [activeCat,setActiveCat]=useState("all");
  const [togFilter,setTogFilter]=useState("all");
  const [searchQ,setSearchQ]=useState("");
  const [sortVal,setSortVal]=useState("default");
  const [cart,setCart]=useState([]);
  const [cartOpen,setCartOpen]=useState(false);
  const [modProd,setModProd]=useState(null);
  const [mQty,setMQty]=useState(1);
  const [ckOpen,setCkOpen]=useState(false);
  const [ckStep,setCkStep]=useState(1);
  const [ckData,setCkData]=useState({});
  const [paying,setPaying]=useState(false);
  const [sucOpen,setSucOpen]=useState(false);
  const [toasts,setToasts]=useState([]);
  const [menuOpen,setMenuOpen]=useState(false);

  useEffect(()=>{
    Promise.all([
      getProducts({limit:100}).catch(()=>({products:[]})),
      getBanners().catch(()=>({banners:[]}))
    ]).then(([pr,br])=>{
      setProducts(pr.products||pr||[]);
      const h=(br.banners||br||[]).find(b=>b.type==="hero"&&b.isActive);
      if(h?.title)setHeroTitle(h.title);
    }).finally(()=>setLoading(false));
  },[]);

  const addToast=useCallback((msg,type="ok")=>{
    const id=Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),2500);
  },[]);

  const addCart=(id,qty=1)=>{
    const p=products.find(x=>x._id===id);if(!p)return;
    setCart(prev=>{
      const ex=prev.find(x=>x._id===id);
      return ex?prev.map(x=>x._id===id?{...x,qty:x.qty+qty}:x):[...prev,{...p,qty}];
    });
    addToast(`${p.name} added ✓`);
  };
  const removeCart=id=>setCart(p=>p.filter(x=>x._id!==id));
  const changeQty=(id,q)=>{if(q<1){removeCart(id);return;}setCart(p=>p.map(x=>x._id===id?{...x,qty:q}:x));};
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const ship=cartTotal>=999?0:99;
  const couponAmt=ckData.coupon==="AAUM10"?Math.round(cartTotal*.1):0;
  const finalTotal=cartTotal+ship-couponAmt;

  const displayed=(()=>{
    const q=searchQ.toLowerCase();
    let list=products.filter(p=>{
      if(activeCat!=="all"&&p.category!==activeCat)return false;
      if(togFilter==="popular"&&!p.isPopular)return false;
      if(togFilter==="recommended"&&!p.isRecommended)return false;
      if(togFilter==="energized"&&!p.isEnergized)return false;
      if(q&&!p.name.toLowerCase().includes(q)&&!(p.description||"").toLowerCase().includes(q))return false;
      return true;
    });
    if(sortVal==="price-asc")list=[...list].sort((a,b)=>a.price-b.price);
    if(sortVal==="price-desc")list=[...list].sort((a,b)=>b.price-a.price);
    return list;
  })();

  const placeOrder=async()=>{
    if(!ckData.payMethod){addToast("Select a payment method","err");return;}
    setPaying(true);
    if(ckData.payMethod==="razorpay"){
      await launchRazorpay({cart,ckData,addToast,
        onSuccess:()=>{setCkOpen(false);setCart([]);setCkData({});setCkStep(1);setSucOpen(true);setPaying(false);},
        onFail:()=>setPaying(false)
      });
    }else{
      try{await createPaymentOrder({amount:finalTotal,currency:"INR",cod:true,
        items:cart.map(i=>({productId:i._id,name:i.name,qty:i.qty,price:i.price})),
        customer:ckData,total:finalTotal});}catch{}
      setCkOpen(false);setCart([]);setCkData({});setCkStep(1);setSucOpen(true);setPaying(false);
    }
  };

  const inp={width:"100%",padding:"12px 14px",border:`1.5px solid ${C.border}`,borderRadius:8,
    fontFamily:"Montserrat,sans-serif",fontSize:14,color:C.text,outline:"none",background:"#fff",
    marginBottom:14,WebkitAppearance:"none"};
  const lbl={fontSize:11,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6,display:"block"};
  const btnR={padding:"14px 20px",background:C.red,border:"none",borderRadius:8,color:C.cream,
    fontFamily:"Montserrat,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:".06em",
    textTransform:"uppercase",WebkitTapHighlightColor:"transparent"};
  const btnG={...btnR,background:"transparent",border:`2px solid ${C.red}`,color:C.red};

  return(
    <div style={{minHeight:"100vh",fontFamily:"Montserrat,sans-serif",background:C.ivory,overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        body{background:${C.ivory};overflow-x:hidden}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${C.red};border-radius:3px}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes tick{to{transform:translateX(-50%)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .cat-scroll::-webkit-scrollbar{display:none}
        input,select,textarea{font-size:16px !important}
      `}</style>

      {/* ── TICKER ── */}
      <div style={{background:C.red,height:32,overflow:"hidden",display:"flex",alignItems:"center"}}>
        <div style={{whiteSpace:"nowrap",animation:"tick 50s linear infinite",display:"inline-block"}}>
          {[0,1,2,3].map(i=>(
            <span key={i} style={{color:C.cream,fontSize:10,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",paddingRight:48}}>
              🪔 Free shipping ₹999+ &nbsp;✦&nbsp; Temple-energized idols &nbsp;✦&nbsp; Authentic Panchaloha &nbsp;✦&nbsp; COD pan-India &nbsp;✦&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ── NAV ── */}
      <nav style={{position:"sticky",top:0,zIndex:200,background:C.red,borderBottom:`3px solid ${C.amber}`,boxShadow:"0 2px 12px rgba(0,0,0,.2)"}}>
        <div style={{maxWidth:1340,margin:"0 auto",padding:"0 16px",display:"flex",alignItems:"center",height:60,gap:10}}>
          {/* Logo + brand */}
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <img src="/logo.png" style={{width:42,height:42,objectFit:"cover",borderRadius:"50%",border:`2px solid rgba(255,176,49,.5)`}} alt="Shri Aaum"/>
            <div>
              <div style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:19,fontWeight:700,lineHeight:1}}>Shri Aaum</div>
              <div style={{color:C.amber,fontSize:8,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase"}}>Sacred Store</div>
            </div>
          </div>

          {/* Search — hidden on very small screens */}
          <div style={{flex:1,maxWidth:360,position:"relative",display:"none"}} className="desktop-search">
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.amber,fontSize:13,pointerEvents:"none"}}>🔍</span>
            <input style={{width:"100%",padding:"8px 12px 8px 30px",background:"rgba(255,238,212,.12)",border:"1px solid rgba(255,176,49,.3)",borderRadius:6,color:C.cream,fontFamily:"Montserrat,sans-serif",fontSize:12,outline:"none"}} placeholder="Search sacred items…" value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
          </div>

          <div style={{flex:1}}/>

          {/* Desktop nav links */}
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            {CATS.slice(1,5).map(c=>(
              <span key={c.id} style={{color:activeCat===c.id?C.amber:"rgba(255,238,212,.72)",fontSize:11,fontWeight:600,letterSpacing:".07em",textTransform:"uppercase",cursor:"pointer",display:"none"}} className="desktop-link" onClick={()=>setActiveCat(c.id)}>
                {c.label}
              </span>
            ))}
          </div>

          {/* Cart button */}
          <button style={{background:C.amber,border:"none",borderRadius:6,padding:"9px 14px",color:C.redDark,fontFamily:"Montserrat,sans-serif",fontSize:11,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:6,flexShrink:0}} onClick={()=>setCartOpen(true)}>
            🛒
            <span style={{background:C.red,color:C.cream,borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800}}>{cartCount}</span>
          </button>
        </div>

        {/* Mobile search bar below nav */}
        <div style={{padding:"8px 16px 10px",borderTop:"1px solid rgba(255,176,49,.15)"}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.amber,fontSize:13,pointerEvents:"none"}}>🔍</span>
            <input style={{width:"100%",padding:"9px 12px 9px 30px",background:"rgba(255,238,212,.12)",border:"1px solid rgba(255,176,49,.25)",borderRadius:6,color:C.cream,fontFamily:"Montserrat,sans-serif",fontSize:14,outline:"none"}} placeholder="Search sacred items…" value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{background:C.cream,padding:"32px 16px 28px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:"-5%",top:"10%",fontFamily:"Cormorant Garamond,serif",fontSize:280,color:"rgba(160,4,4,.05)",pointerEvents:"none",lineHeight:1}}>ॐ</div>
        <div style={{maxWidth:1340,margin:"0 auto",display:"flex",alignItems:"center",gap:24,position:"relative",zIndex:1}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(160,4,4,.08)",border:"1px solid rgba(160,4,4,.18)",borderRadius:30,padding:"4px 12px",marginBottom:14}}>
              <span style={{color:C.red,fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase"}}>🕉️ Temple-Blessed Sacred Products</span>
            </div>
            <h1 style={{fontFamily:"Cormorant Garamond,serif",color:C.text,fontSize:"clamp(28px,7vw,58px)",lineHeight:1.1,marginBottom:12,fontWeight:700}}>
              {heroTitle.includes(",")?<>{heroTitle.split(",")[0]},<br/><strong style={{color:C.red}}>{heroTitle.split(",").slice(1).join(",").trim()}</strong></>:heroTitle}
            </h1>
            <p style={{color:C.text2,fontSize:13,lineHeight:1.8,marginBottom:20,maxWidth:480}}>
              Authentic puja items, energized idols, and sacred malas — sourced directly from temple artisans.
            </p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button style={{...btnR,padding:"12px 20px",fontSize:12}} onClick={()=>document.getElementById("shopSec")?.scrollIntoView({behavior:"smooth"})}>Shop Now →</button>
              <button style={{...btnG,padding:"12px 20px",fontSize:12}} onClick={()=>{setActiveCat("panchaloha");document.getElementById("shopSec")?.scrollIntoView({behavior:"smooth"});}}>View Idols</button>
            </div>
          </div>
          {/* Hero logo — visible only on larger screens */}
          <div style={{flexShrink:0,display:"none"}} className="hero-logo">
            <div style={{position:"relative",width:220,height:220,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{position:"absolute",inset:-8,borderRadius:"50%",border:"2px dashed rgba(234,182,89,.35)",animation:"spin 40s linear infinite"}}/>
              <img src="/logo.png" style={{width:180,height:180,objectFit:"contain",animation:"float 5s ease-in-out infinite"}} alt="Shri Aaum"/>
            </div>
          </div>
        </div>
        {/* Stats row */}
        <div style={{maxWidth:1340,margin:"22px auto 0",display:"flex",gap:24,flexWrap:"wrap",borderTop:`1px solid rgba(234,182,89,.35)`,paddingTop:18}}>
          {[["5,000+","Devotees"],["200+","Products"],["100%","Temple Sourced"],["14-day","Returns"]].map(([v,l])=>(
            <div key={l}><div style={{fontFamily:"Cormorant Garamond,serif",color:C.red,fontSize:22,fontWeight:700,lineHeight:1}}>{v}</div><div style={{color:C.text2,fontSize:10,marginTop:2,fontWeight:500}}>{l}</div></div>
          ))}
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div style={{background:C.amber,padding:"10px 16px",overflowX:"auto"}}>
        <div style={{display:"flex",gap:24,whiteSpace:"nowrap",justifyContent:"center",flexWrap:"nowrap"}}>
          {[["✦","Free Shipping ₹999+"],["🪔","Temple Energized"],["📿","100% Authentic"],["↩","14-Day Returns"]].map(([i,t])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:5,color:C.redDark,fontSize:10,fontWeight:700,letterSpacing:".03em",flexShrink:0}}><span>{i}</span><span>{t}</span></div>
          ))}
        </div>
      </div>

      {/* ── CATEGORY TABS ── */}
      <div style={{background:C.ivory,borderBottom:`1px solid ${C.border}`,position:"sticky",top:96,zIndex:100}}>
        <div className="cat-scroll" style={{display:"flex",overflowX:"auto",padding:"0 8px",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
          {CATS.map(c=>(
            <div key={c.id} style={{padding:"12px 14px",borderBottom:`3px solid ${activeCat===c.id?C.red:"transparent"}`,color:activeCat===c.id?C.red:C.muted,fontSize:11,fontWeight:activeCat===c.id?700:600,letterSpacing:".06em",textTransform:"uppercase",cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5,flexShrink:0,transition:"color .15s"}}
              onClick={()=>{setActiveCat(c.id);document.getElementById("shopSec")?.scrollIntoView({behavior:"smooth"});}}>
              <span style={{fontSize:14}}>{c.icon}</span>{c.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── SHOP GRID ── */}
      <div id="shopSec" style={{maxWidth:1340,margin:"0 auto",padding:"24px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:10,flexWrap:"wrap",padding:"0 4px"}}>
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:22,color:C.text,fontWeight:700}}>
            {CATS.find(c=>c.id===activeCat)?.label} <em style={{color:C.red,fontStyle:"normal",fontSize:18}}>({displayed.length})</em>
          </div>
          <select value={sortVal} onChange={e=>setSortVal(e.target.value)} style={{padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,background:"#fff",color:C.text,fontFamily:"Montserrat,sans-serif",fontSize:12,outline:"none",cursor:"pointer",WebkitAppearance:"none",paddingRight:24}}>
            <option value="default">Default</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
          </select>
        </div>

        {/* Toggle filters - scrollable */}
        <div style={{display:"flex",gap:6,marginBottom:18,overflowX:"auto",padding:"0 4px 4px",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
          {[["all","All"],["popular","⭐ Popular"],["recommended","👍 Recommended"],["energized","🔱 Energized"]].map(([v,l])=>(
            <button key={v} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${togFilter===v?C.red:C.border}`,background:togFilter===v?C.red:"#fff",color:togFilter===v?C.cream:C.text2,fontSize:10,fontWeight:600,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}} onClick={()=>setTogFilter(v)}>{l}</button>
          ))}
        </div>

        {/* Product grid - 2 cols mobile, 3-4 desktop */}
        {loading?(
          <div style={{textAlign:"center",padding:"48px 0",color:C.muted}}>
            <div style={{fontSize:44,animation:"float 2s infinite",marginBottom:10}}>🪔</div>
            <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:18,color:C.text2}}>Loading sacred items…</div>
          </div>
        ):displayed.length===0?(
          <div style={{textAlign:"center",padding:"48px 0"}}>
            <div style={{fontSize:40}}>🔍</div>
            <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:18,color:C.text2,marginTop:10}}>No products found</div>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
            {displayed.map(p=>{
              const d=disc(p.originalPrice||p.price,p.price);
              return(
                <div key={p._id} style={{background:"#fff",borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`,boxShadow:"0 1px 8px rgba(160,4,4,.08)",display:"flex",flexDirection:"column",cursor:"pointer"}}
                  onClick={()=>{setModProd(p);setMQty(1);}}>
                  {/* Product image area */}
                  <div style={{background:C.cream,padding:"16px 10px 12px",textAlign:"center",position:"relative",fontSize:52}}>
                    {p.badge&&<span style={{position:"absolute",top:6,left:6,fontSize:7,fontWeight:800,padding:"2px 6px",borderRadius:20,color:"#fff",textTransform:"uppercase",background:C.red,letterSpacing:".06em"}}>{p.badge}</span>}
                    {(p.isPopular||p.isEnergized)&&(
                      <div style={{position:"absolute",top:6,right:6,display:"flex",gap:2,fontSize:11}}>
                        {p.isPopular&&<span>⭐</span>}
                        {p.isEnergized&&<span>🔱</span>}
                      </div>
                    )}
                    {p.image}
                    {p.stock===0&&<div style={{position:"absolute",bottom:6,right:6,background:"rgba(160,4,4,.85)",color:C.cream,fontSize:7,fontWeight:700,padding:"2px 5px",borderRadius:3}}>Sold Out</div>}
                  </div>
                  {/* Card body */}
                  <div style={{padding:"10px 10px 12px",flex:1,display:"flex",flexDirection:"column"}}>
                    <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:".1em",marginBottom:2,fontWeight:600}}>{CATS.find(c=>c.id===p.category)?.label||p.category}</div>
                    <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:14,fontWeight:700,color:C.text,lineHeight:1.3,marginBottom:4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.name}</div>
                    <div style={{flex:1}}/>
                    {p.tags?.length>0&&(
                      <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:8}}>
                        {p.tags.slice(0,2).map(t=><span key={t} style={{background:C.cream,color:C.text2,fontSize:7,padding:"1px 5px",borderRadius:20,border:`1px solid rgba(234,182,89,.4)`,fontWeight:700,textTransform:"uppercase"}}>{t}</span>)}
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:4}}>
                      <div>
                        <div style={{fontSize:16,fontWeight:800,color:C.red,fontFamily:"Cormorant Garamond,serif",lineHeight:1}}>{fmt(p.price)}</div>
                        {d>0&&<div style={{fontSize:9,color:C.green,fontWeight:700,marginTop:1}}>{d}% off</div>}
                      </div>
                      <button disabled={p.stock===0} style={{padding:"7px 10px",borderRadius:6,background:C.amber,border:"none",color:C.redDark,fontFamily:"Montserrat,sans-serif",fontSize:8,fontWeight:800,cursor:p.stock===0?"not-allowed":"pointer",textTransform:"uppercase",letterSpacing:".05em",opacity:p.stock===0?.5:1,flexShrink:0,WebkitTapHighlightColor:"transparent"}}
                        onClick={e=>{e.stopPropagation();addCart(p._id);}}>
                        + Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── WHY SECTION ── */}
      <section style={{background:C.red,padding:"44px 16px"}}>
        <div style={{maxWidth:1340,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:26}}>
            <div style={{color:C.amber,fontSize:9,fontWeight:700,letterSpacing:".16em",textTransform:"uppercase",marginBottom:8}}>Why Shri Aaum</div>
            <h2 style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:"clamp(22px,5vw,40px)",fontWeight:700}}>Divine Quality, Every Item</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
            {[["🕍","Temple Certified","Certified with prana-pratishtha rituals."],
              ["🔬","Lab Tested","Every bead/gemstone lab-certified."],
              ["🚚","Fast Delivery","Free shipping above ₹999. COD available."],
              ["♻️","Easy Returns","14-day hassle-free returns."],
              ["💬","Guidance","Pandits guide you to the right product."],
              ["🏺","Artisan Made","Direct from 3rd-gen temple artisans."]
            ].map(([icon,h,p])=>(
              <div key={h} style={{background:"rgba(255,238,212,.07)",border:"1px solid rgba(255,176,49,.2)",borderRadius:10,padding:"18px 14px",textAlign:"center"}}>
                <div style={{fontSize:26,marginBottom:8}}>{icon}</div>
                <h3 style={{fontFamily:"Cormorant Garamond,serif",color:C.amber,fontSize:14,marginBottom:5}}>{h}</h3>
                <p style={{color:"rgba(255,238,212,.5)",fontSize:10,lineHeight:1.6}}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{background:C.redDark,padding:"36px 16px 100px"}}>
        <div style={{maxWidth:1340,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <img src="/logo.png" style={{width:40,height:40,objectFit:"cover",borderRadius:"50%"}} alt="Shri Aaum"/>
            <div>
              <div style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:18,fontWeight:700}}>Shri Aaum</div>
              <div style={{color:"rgba(255,238,212,.4)",fontSize:9,marginTop:1,fontStyle:"italic",fontFamily:"Cormorant Garamond,serif"}}>"Sarve Bhavantu Sukhinah"</div>
            </div>
          </div>
          <p style={{color:"rgba(255,238,212,.35)",fontSize:11,lineHeight:1.8,marginBottom:20,maxWidth:320}}>Sacred products sourced from temple artisans, energized with Vedic rituals.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
            {[["Shop",["Rudraksha","Puja Samagri","Panchaloha","Wellness","Wearables"]],
              ["Support",["Track Order","Returns","FAQs","Contact"]]
            ].map(([h,links])=>(
              <div key={h}>
                <h4 style={{color:C.amber,fontSize:8,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",marginBottom:10}}>{h}</h4>
                {links.map(l=><a key={l} href="#" style={{display:"block",color:"rgba(255,238,212,.32)",fontSize:11,marginBottom:6,textDecoration:"none"}}>{l}</a>)}
              </div>
            ))}
          </div>
          <div style={{borderTop:"1px solid rgba(255,176,49,.12)",paddingTop:16,fontSize:10,color:"rgba(255,238,212,.2)"}}>
            © 2026 Shri Aaum Sacred Store · Privacy · Terms · Shipping
          </div>
        </div>
      </footer>

      {/* ── MOBILE BOTTOM NAV ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:300,background:C.red,borderTop:`2px solid ${C.amber}`,display:"flex",justifyContent:"space-around",padding:"8px 0 12px",boxShadow:"0 -4px 20px rgba(0,0,0,.25)"}}>
        {[
          {icon:"🏠",label:"Home",action:()=>window.scrollTo({top:0,behavior:"smooth"})},
          {icon:"🔍",label:"Search",action:()=>document.querySelector("input[placeholder*='Search']")?.focus()},
          {icon:"📿",label:"Shop",action:()=>document.getElementById("shopSec")?.scrollIntoView({behavior:"smooth"})},
          {icon:`🛒${cartCount>0?` ${cartCount}`:""}`,label:"Cart",action:()=>setCartOpen(true)},
        ].map(({icon,label,action})=>(
          <button key={label} style={{background:"none",border:"none",color:C.cream,display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",padding:"4px 8px",fontSize:11,fontFamily:"Montserrat,sans-serif",fontWeight:600,letterSpacing:".04em",opacity:.85}} onClick={action}>
            <span style={{fontSize:20}}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ── CART DRAWER (slides up on mobile) ── */}
      {cartOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:399,background:"rgba(0,0,0,.45)",animation:"fadeIn .2s ease"}} onClick={()=>setCartOpen(false)}>
          <div style={{position:"absolute",bottom:0,left:0,right:0,background:C.ivory,borderRadius:"16px 16px 0 0",maxHeight:"85vh",display:"flex",flexDirection:"column",animation:"slideUp .25s ease",boxShadow:"0 -8px 40px rgba(0,0,0,.3)"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:C.red,padding:"16px 20px",borderRadius:"16px 16px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:20,fontWeight:700}}>Your Cart ({cartCount})</div>
              <button style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:30,height:30,color:C.cream,cursor:"pointer",fontSize:14}} onClick={()=>setCartOpen(false)}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px",WebkitOverflowScrolling:"touch"}}>
              {cart.length===0?(
                <div style={{textAlign:"center",padding:48,color:C.muted}}>
                  <div style={{fontSize:40,marginBottom:10}}>🪔</div>
                  <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:18,color:C.text2}}>Your cart is empty</div>
                </div>
              ):cart.map(i=>(
                <div key={i._id} style={{display:"flex",gap:10,marginBottom:12,padding:12,background:"#fff",borderRadius:9,border:`1px solid ${C.border}`}}>
                  <div style={{width:48,height:48,background:C.cream,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{i.image}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:13,fontWeight:700,color:C.text,lineHeight:1.3,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.name}</div>
                    <div style={{fontSize:14,fontWeight:800,color:C.red,fontFamily:"Cormorant Garamond,serif"}}>{fmt(i.price*i.qty)}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
                      <div style={{display:"flex",alignItems:"center",border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden"}}>
                        <button onClick={()=>changeQty(i._id,i.qty-1)} style={{width:28,height:28,border:"none",background:"#f5f5f5",cursor:"pointer",fontSize:14,fontWeight:700}}>−</button>
                        <span style={{width:32,textAlign:"center",fontSize:13,fontWeight:700}}>{i.qty}</span>
                        <button onClick={()=>changeQty(i._id,i.qty+1)} style={{width:28,height:28,border:"none",background:"#f5f5f5",cursor:"pointer",fontSize:14,fontWeight:700}}>+</button>
                      </div>
                      <button onClick={()=>removeCart(i._id)} style={{fontSize:10,color:C.red,border:"none",background:"none",cursor:"pointer",fontWeight:700}}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cart.length>0&&(
              <div style={{padding:"14px 16px 24px",borderTop:`1px solid ${C.border}`,background:"#fff"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12,color:C.muted}}><span>Subtotal</span><span>{fmt(cartTotal)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,fontSize:12,color:C.muted}}><span>Shipping</span><span>{ship===0?"Free":fmt(ship)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,fontSize:20,fontWeight:800,color:C.red,fontFamily:"Cormorant Garamond,serif"}}><span>Total</span><span>{fmt(cartTotal+ship)}</span></div>
                <button style={{...btnR,width:"100%",padding:"14px 0"}} onClick={()=>{setCartOpen(false);setCkOpen(true);}}>Proceed to Checkout →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PRODUCT MODAL (bottom sheet on mobile) ── */}
      {modProd&&(()=>{
        const p=modProd;const d=disc(p.originalPrice||p.price,p.price);
        return(
          <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end",background:"rgba(26,10,0,.75)",animation:"fadeIn .2s ease"}} onClick={()=>setModProd(null)}>
            <div style={{background:C.ivory,borderRadius:"16px 16px 0 0",width:"100%",maxHeight:"90vh",overflowY:"auto",animation:"slideUp .25s ease"}} onClick={e=>e.stopPropagation()}>
              <div style={{background:C.red,padding:"20px 20px 18px",borderRadius:"16px 16px 0 0",position:"relative"}}>
                <button style={{position:"absolute",top:12,right:12,background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:30,height:30,color:C.cream,fontSize:14,cursor:"pointer"}} onClick={()=>setModProd(null)}>✕</button>
                <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:72,height:72,borderRadius:10,background:C.cream,border:"2px solid rgba(255,176,49,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,flexShrink:0}}>{p.image}</div>
                  <div style={{flex:1,minWidth:0}}>
                    {p.badge&&<span style={{display:"inline-block",fontSize:7,fontWeight:800,padding:"2px 7px",borderRadius:20,color:"#fff",textTransform:"uppercase",background:"rgba(255,255,255,.25)",marginBottom:6,letterSpacing:".07em"}}>{p.badge}</span>}
                    <div style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:20,fontWeight:700,lineHeight:1.2}}>{p.name}</div>
                    {p.series&&<div style={{color:C.amber,fontSize:11,marginTop:3}}>Series: {p.series}</div>}
                  </div>
                </div>
              </div>
              <div style={{padding:"20px 20px 32px"}}>
                <p style={{fontSize:13,color:C.text2,lineHeight:1.8,marginBottom:16}}>{p.description}</p>
                {p.material&&<div style={{background:C.cream,borderRadius:7,padding:10,marginBottom:14,fontSize:11}}>
                  <span style={{color:C.muted}}>Material: </span><span style={{fontWeight:700}}>{p.material}</span>
                  {p.templeOrigin&&<><br/><span style={{color:C.muted}}>Origin: </span><span style={{fontWeight:700}}>{p.templeOrigin}</span></>}
                  <br/><span style={{color:C.muted}}>Stock: </span><span style={{fontWeight:700,color:p.stock<5?C.red:C.green}}>{p.stock>0?`${p.stock} available`:"Out of stock"}</span>
                </div>}
                {p.tags?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>{p.tags.map(t=><span key={t} style={{background:C.cream,color:C.text2,fontSize:8,padding:"2px 7px",borderRadius:20,border:`1px solid rgba(234,182,89,.4)`,fontWeight:700,textTransform:"uppercase"}}>{t}</span>)}</div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:28,fontWeight:800,color:C.red,fontFamily:"Cormorant Garamond,serif"}}>{fmt(p.price)}</div>
                    {d>0&&<div><span style={{fontSize:11,color:"#bbb",textDecoration:"line-through",marginRight:3}}>{fmt(p.originalPrice)}</span><span style={{fontSize:10,color:C.green,fontWeight:700}}>{d}% off</span></div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",border:`1.5px solid ${C.border}`,borderRadius:7,overflow:"hidden"}}>
                    <button onClick={()=>setMQty(q=>Math.max(1,q-1))} style={{width:36,height:38,background:"#fff",border:"none",fontSize:18,cursor:"pointer",fontWeight:700}}>−</button>
                    <span style={{width:40,textAlign:"center",fontWeight:700,fontSize:15}}>{mQty}</span>
                    <button onClick={()=>setMQty(q=>Math.min(p.stock,q+1))} style={{width:36,height:38,background:"#fff",border:"none",fontSize:18,cursor:"pointer",fontWeight:700}}>+</button>
                  </div>
                </div>
                <button disabled={p.stock===0} style={{...btnR,width:"100%",padding:"14px 0",fontSize:13,opacity:p.stock===0?.5:1}} onClick={()=>{addCart(p._id,mQty);setModProd(null);setCartOpen(true);}}>
                  {p.stock===0?"Out of Stock":`Add ${mQty} to Cart — ${fmt(p.price*mQty)}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── CHECKOUT (full screen on mobile) ── */}
      {ckOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:600,background:C.ivory,overflowY:"auto",WebkitOverflowScrolling:"touch",animation:"fadeIn .2s ease"}}>
          {/* Checkout header */}
          <div style={{background:C.red,padding:"16px 20px",position:"sticky",top:0,zIndex:10}}>
            <button style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:30,height:30,color:C.cream,fontSize:14,cursor:"pointer",marginBottom:10}} onClick={()=>setCkOpen(false)}>✕</button>
            <div style={{color:C.amber,fontSize:9,fontWeight:700,letterSpacing:".15em",textTransform:"uppercase",marginBottom:4}}>Step {ckStep} of 3</div>
            <div style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:22,fontWeight:700}}>{["","Contact Details","Delivery Address","Payment"][ckStep]}</div>
            <div style={{display:"flex",gap:5,marginTop:12}}>
              {[1,2,3].map(s=><div key={s} style={{height:3,flex:1,borderRadius:2,background:s<=ckStep?C.amber:"rgba(255,255,255,.2)"}}/>)}
            </div>
          </div>
          <div style={{padding:"24px 20px 80px"}}>
            {ckStep===1&&<>
              <label style={lbl}>Full Name *</label>
              <input style={inp} value={ckData.name||""} onChange={e=>setCkData(p=>({...p,name:e.target.value}))} placeholder="Your full name"/>
              <label style={lbl}>Mobile Number *</label>
              <input style={inp} type="tel" value={ckData.phone||""} onChange={e=>setCkData(p=>({...p,phone:e.target.value}))} placeholder="+91 XXXXX XXXXX"/>
              <label style={lbl}>Email Address</label>
              <input style={inp} type="email" value={ckData.email||""} onChange={e=>setCkData(p=>({...p,email:e.target.value}))} placeholder="your@email.com"/>
              <button style={{...btnR,width:"100%",marginTop:4}} onClick={()=>{if(!ckData.name||!ckData.phone){addToast("Name and mobile required","err");return;}setCkStep(2);}}>Continue →</button>
            </>}
            {ckStep===2&&<>
              <label style={lbl}>Address Line *</label>
              <input style={inp} value={ckData.addr||""} onChange={e=>setCkData(p=>({...p,addr:e.target.value}))} placeholder="House / Flat / Street / Area"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={lbl}>City *</label><input style={inp} value={ckData.city||""} onChange={e=>setCkData(p=>({...p,city:e.target.value}))} placeholder="City"/></div>
                <div><label style={lbl}>State *</label><input style={inp} value={ckData.state||""} onChange={e=>setCkData(p=>({...p,state:e.target.value}))} placeholder="State"/></div>
              </div>
              <label style={lbl}>Pincode *</label>
              <input style={inp} type="tel" value={ckData.pin||""} onChange={e=>setCkData(p=>({...p,pin:e.target.value}))} placeholder="6-digit pincode"/>
              <label style={lbl}>Coupon Code</label>
              <input style={inp} value={ckData.coupon||""} onChange={e=>setCkData(p=>({...p,coupon:e.target.value.toUpperCase()}))} placeholder="Try AAUM10 for 10% off"/>
              {couponAmt>0&&<div style={{color:C.green,fontSize:12,fontWeight:700,marginTop:-10,marginBottom:12}}>✓ Saving {fmt(couponAmt)}</div>}
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button style={{...btnG,flex:.5,padding:"13px 0"}} onClick={()=>setCkStep(1)}>← Back</button>
                <button style={{...btnR,flex:1,padding:"13px 0"}} onClick={()=>{if(!ckData.addr||!ckData.city||!ckData.pin){addToast("Fill all address fields","err");return;}setCkStep(3);}}>Continue →</button>
              </div>
            </>}
            {ckStep===3&&<>
              <div style={{background:C.cream,borderRadius:8,padding:14,marginBottom:18,fontSize:12}}>
                <div style={{fontWeight:700,color:C.text2,marginBottom:8,textTransform:"uppercase",letterSpacing:".06em",fontSize:10}}>Order Summary</div>
                {cart.map(i=><div key={i._id} style={{display:"flex",justifyContent:"space-between",marginBottom:4,color:C.text,fontSize:13}}><span style={{flex:1,marginRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.name} × {i.qty}</span><span style={{fontWeight:600,flexShrink:0}}>{fmt(i.price*i.qty)}</span></div>)}
                <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,marginTop:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",color:C.muted,marginBottom:3}}><span>Shipping</span><span>{ship===0?"Free":fmt(ship)}</span></div>
                  {couponAmt>0&&<div style={{display:"flex",justifyContent:"space-between",color:C.green,marginBottom:3}}><span>Coupon</span><span>−{fmt(couponAmt)}</span></div>}
                  <div style={{display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:18,color:C.red,marginTop:6,fontFamily:"Cormorant Garamond,serif"}}><span>Total</span><span>{fmt(finalTotal)}</span></div>
                </div>
              </div>
              <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:".1em",marginBottom:10}}>Payment Method</div>
              {[["razorpay","💳 Pay Online — UPI, Cards, Net Banking"],["cod","💵 Cash on Delivery (COD)"]].map(([v,l])=>(
                <div key={v} style={{border:`1.5px solid ${ckData.payMethod===v?C.red:C.border}`,borderRadius:8,padding:"13px 14px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:13,background:ckData.payMethod===v?"rgba(160,4,4,.05)":"#fff"}} onClick={()=>setCkData(p=>({...p,payMethod:v}))}>
                  <input type="radio" readOnly checked={ckData.payMethod===v} style={{accentColor:C.red,width:16,height:16}}/>{l}
                </div>
              ))}
              <div style={{display:"flex",gap:10,marginTop:16}}>
                <button style={{...btnG,flex:.5,padding:"13px 0"}} onClick={()=>setCkStep(2)}>← Back</button>
                <button disabled={paying} style={{...btnR,flex:1,padding:"13px 0",opacity:paying?.7:1}} onClick={placeOrder}>{paying?"Processing…":`Place Order · ${fmt(finalTotal)}`}</button>
              </div>
              <div style={{textAlign:"center",marginTop:12,fontSize:9,color:C.muted}}>🔒 Secured by Razorpay · PCI-DSS Compliant</div>
            </>}
          </div>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {sucOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:700,display:"flex",alignItems:"flex-end",background:"rgba(26,10,0,.75)",animation:"fadeIn .2s ease"}} onClick={()=>setSucOpen(false)}>
          <div style={{background:C.ivory,borderRadius:"16px 16px 0 0",width:"100%",animation:"slideUp .25s ease",paddingBottom:40}} onClick={e=>e.stopPropagation()}>
            <div style={{background:C.red,padding:"28px 24px",borderRadius:"16px 16px 0 0",textAlign:"center"}}>
              <div style={{fontSize:56,marginBottom:8}}>🙏</div>
              <div style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:26,fontWeight:700}}>Order Placed!</div>
              <div style={{color:"rgba(255,238,212,.7)",fontSize:12,marginTop:5}}>Jai Shri Ram · Divine blessings</div>
            </div>
            <div style={{padding:"24px 24px 0",textAlign:"center"}}>
              <p style={{color:C.text2,fontSize:13,lineHeight:1.8,marginBottom:22}}>Your order is confirmed. You'll receive a WhatsApp update shortly. Your sacred items will be delivered with care and devotion.</p>
              <button style={{...btnR,width:"100%"}} onClick={()=>setSucOpen(false)}>Continue Shopping</button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts}/>
    </div>
  );
}
