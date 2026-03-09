import { useState, useEffect } from "react";
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
  {id:"all",       label:"All Products",   icon:"🕉️"},
  {id:"rudraksha", label:"Rudraksha",       icon:"📿"},
  {id:"puja-samagri",label:"Puja Samagri", icon:"🪔"},
  {id:"prasadam",  label:"Prasadam",        icon:"🙏"},
  {id:"panchaloha",label:"Panchaloha",      icon:"⚱️"},
  {id:"wellness",  label:"Wellness",        icon:"🌿"},
  {id:"wearables", label:"Wearables",       icon:"💍"},
];

function Toast({toasts}){
  return(
    <div style={{position:"fixed",bottom:22,right:22,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:t.type==="err"?C.redDark:C.green,color:C.cream,padding:"11px 18px",borderRadius:6,fontSize:12,fontFamily:"Montserrat,sans-serif",boxShadow:"0 4px 20px rgba(0,0,0,.3)",borderLeft:`3px solid ${C.amber}`,maxWidth:280}}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

async function launchRazorpay({cart,ckData,onSuccess,onFail,addToast}){
  const subtotal = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const ship = subtotal>=999?0:99;
  const coupon = ckData.coupon==="AAUM10"?Math.round(subtotal*.1):0;
  const total = subtotal+ship-coupon;
  try{
    const order = await createPaymentOrder({amount:total,currency:"INR",receipt:`sa_${Date.now()}`});
    const opts = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID||"",
      amount: order.amount, currency: order.currency||"INR",
      name:"Shri Aaum Sacred Store", description:"Temple-Blessed Products",
      order_id: order.id,
      prefill:{name:ckData.name,contact:ckData.phone,email:ckData.email||""},
      theme:{color:C.red},
      handler: async res => {
        try{
          await verifyPayment({
            razorpay_order_id:res.razorpay_order_id,
            razorpay_payment_id:res.razorpay_payment_id,
            razorpay_signature:res.razorpay_signature,
            items:cart.map(i=>({productId:i._id,name:i.name,qty:i.qty,price:i.price})),
            customer:ckData, total
          });
          onSuccess();
        }catch{ addToast("Payment verification failed","err"); }
      },
      modal:{ondismiss:()=>addToast("Payment cancelled","err")}
    };
    const open = () => new window.Razorpay(opts).open();
    if(window.Razorpay){ open(); }
    else{
      const s=document.createElement("script");
      s.src="https://checkout.razorpay.com/v1/checkout.js";
      s.onload=open; document.body.appendChild(s);
    }
  }catch(e){ addToast(e.message||"Payment failed","err"); onFail(); }
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

  useEffect(()=>{
    Promise.all([
      getProducts({limit:100}).catch(()=>({products:[]})),
      getBanners().catch(()=>({banners:[]}))
    ]).then(([pr,br])=>{
      setProducts(pr.products||pr||[]);
      const h=(br.banners||br||[]).find(b=>b.type==="hero"&&b.isActive);
      if(h?.title) setHeroTitle(h.title);
    }).finally(()=>setLoading(false));
  },[]);

  const addToast=(msg,type="ok")=>{
    const id=Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),2800);
  };

  const addCart=(id,qty=1)=>{
    const p=products.find(x=>x._id===id); if(!p) return;
    setCart(prev=>{
      const ex=prev.find(x=>x._id===id);
      return ex ? prev.map(x=>x._id===id?{...x,qty:x.qty+qty}:x) : [...prev,{...p,qty}];
    });
    addToast(`${p.name} added to cart ✓`);
  };
  const removeCart=id=>setCart(p=>p.filter(x=>x._id!==id));
  const changeQty=(id,q)=>{ if(q<1){removeCart(id);return;} setCart(p=>p.map(x=>x._id===id?{...x,qty:q}:x)); };
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const ship=cartTotal>=999?0:99;
  const couponAmt=ckData.coupon==="AAUM10"?Math.round(cartTotal*.1):0;
  const finalTotal=cartTotal+ship-couponAmt;

  const displayed=(()=>{
    const q=searchQ.toLowerCase();
    let list=products.filter(p=>{
      if(activeCat!=="all"&&p.category!==activeCat) return false;
      if(togFilter==="popular"&&!p.isPopular) return false;
      if(togFilter==="recommended"&&!p.isRecommended) return false;
      if(togFilter==="energized"&&!p.isEnergized) return false;
      if(q&&!p.name.toLowerCase().includes(q)&&!(p.description||"").toLowerCase().includes(q)) return false;
      return true;
    });
    if(sortVal==="price-asc") list=[...list].sort((a,b)=>a.price-b.price);
    if(sortVal==="price-desc") list=[...list].sort((a,b)=>b.price-a.price);
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
      try{ await createPaymentOrder({amount:finalTotal,currency:"INR",cod:true,
        items:cart.map(i=>({productId:i._id,name:i.name,qty:i.qty,price:i.price})),
        customer:ckData,total:finalTotal}); }catch{}
      setCkOpen(false);setCart([]);setCkData({});setCkStep(1);setSucOpen(true);setPaying(false);
    }
  };

  const inpStyle={width:"100%",padding:"11px 14px",border:`1.5px solid ${C.border}`,borderRadius:8,
    fontFamily:"Montserrat,sans-serif",fontSize:13,color:C.text,outline:"none",background:"#fff",marginBottom:14};
  const lblStyle={fontSize:11,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6,display:"block"};
  const btnRed={padding:"13px 26px",background:C.red,border:"none",borderRadius:6,color:C.cream,
    fontFamily:"Montserrat,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:".1em",textTransform:"uppercase"};
  const btnGhost={...btnRed,background:"transparent",border:`2px solid ${C.red}`,color:C.red};

  return(
    <div style={{minHeight:"100vh",fontFamily:"Montserrat,sans-serif",background:C.ivory}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.ivory}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${C.red};border-radius:3px}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes tick{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      `}</style>

      {/* ── TICKER ── */}
      <div style={{background:C.red,height:34,overflow:"hidden",display:"flex",alignItems:"center"}}>
        <div style={{whiteSpace:"nowrap",animation:"tick 55s linear infinite",display:"inline-block"}}>
          {[0,1,2,3].map(i=>(
            <span key={i} style={{color:C.cream,fontSize:10,fontWeight:600,letterSpacing:".09em",textTransform:"uppercase",paddingRight:60}}>
              🪔 Free shipping above ₹999 &nbsp;✦&nbsp; All idols temple-energized &nbsp;✦&nbsp; Authentic Panchaloha &nbsp;✦&nbsp; COD available pan-India &nbsp;✦&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ── NAV ── */}
      <nav style={{position:"sticky",top:0,zIndex:200,background:C.red,borderBottom:`3px solid ${C.amber}`}}>
        <div style={{maxWidth:1340,margin:"0 auto",padding:"0 28px",display:"flex",alignItems:"center",height:68,gap:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <img src="/logo.png" style={{width:46,height:46,objectFit:"contain"}} alt="Shri Aaum"/>
            <div>
              <div style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:22,fontWeight:700,letterSpacing:".02em"}}>Shri Aaum</div>
              <div style={{color:C.amber,fontSize:8,fontWeight:700,letterSpacing:".2em",textTransform:"uppercase"}}>Sacred Store</div>
            </div>
          </div>
          <div style={{flex:1,maxWidth:400,position:"relative"}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.amber,fontSize:13,pointerEvents:"none"}}>🔍</span>
            <input style={{width:"100%",padding:"8px 12px 8px 32px",background:"rgba(255,238,212,.12)",border:"1px solid rgba(255,176,49,.3)",borderRadius:6,color:C.cream,fontFamily:"Montserrat,sans-serif",fontSize:12,outline:"none"}} placeholder="Search sacred items…" value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:18,marginLeft:"auto"}}>
            {CATS.slice(1,5).map(c=>(
              <span key={c.id} style={{color:activeCat===c.id?C.amber:"rgba(255,238,212,.72)",fontSize:11,fontWeight:600,letterSpacing:".07em",textTransform:"uppercase",cursor:"pointer"}} onClick={()=>setActiveCat(c.id)}>
                {c.label.split(" ")[0]}
              </span>
            ))}
            <button style={{background:C.amber,border:"none",borderRadius:6,padding:"9px 18px",color:C.redDark,fontFamily:"Montserrat,sans-serif",fontSize:11,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:7}} onClick={()=>setCartOpen(true)}>
              🛒
              <span style={{background:C.red,color:C.cream,borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800}}>{cartCount}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{background:C.cream,padding:"64px 28px 52px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:"2%",bottom:"-10%",fontFamily:"Cormorant Garamond,serif",fontSize:500,color:"rgba(160,4,4,.04)",pointerEvents:"none",lineHeight:1,zIndex:0}}>ॐ</div>
        <div style={{maxWidth:1340,margin:"0 auto",display:"flex",alignItems:"center",gap:48,position:"relative",zIndex:1}}>
          <div style={{flex:1}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(160,4,4,.08)",border:"1px solid rgba(160,4,4,.18)",borderRadius:30,padding:"5px 14px",marginBottom:18}}>
              <span style={{color:C.red,fontSize:10,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase"}}>🕉️ Temple-Blessed Sacred Products</span>
            </div>
            <h1 style={{fontFamily:"Cormorant Garamond,serif",color:C.text,fontSize:"clamp(34px,4.5vw,58px)",lineHeight:1.1,marginBottom:14,fontWeight:700}}>
              {heroTitle.includes(",") ? <>{heroTitle.split(",")[0]},<br/><strong style={{color:C.red}}>{heroTitle.split(",").slice(1).join(",").trim()}</strong></> : heroTitle}
            </h1>
            <p style={{color:C.text2,fontSize:14,lineHeight:1.9,marginBottom:26,maxWidth:480}}>
              Authentic puja items, energized idols, and sacred malas — sourced directly from temple artisans and consecrated with Vedic rituals.
            </p>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <button style={btnRed} onClick={()=>document.getElementById("shopSec")?.scrollIntoView({behavior:"smooth"})}>Shop Sacred Items →</button>
              <button style={btnGhost} onClick={()=>setActiveCat("panchaloha")}>View Energized Idols</button>
            </div>
            <div style={{display:"flex",gap:36,marginTop:32,paddingTop:24,borderTop:`1px solid rgba(234,182,89,.4)`,flexWrap:"wrap"}}>
              {[["5,000+","Devotees"],["200+","Products"],["100%","Temple Sourced"],["14-day","Returns"]].map(([v,l])=>(
                <div key={l}><div style={{fontFamily:"Cormorant Garamond,serif",color:C.red,fontSize:28,fontWeight:700,lineHeight:1}}>{v}</div><div style={{color:C.text2,fontSize:10,marginTop:2,fontWeight:500}}>{l}</div></div>
              ))}
            </div>
          </div>
          <div style={{flexShrink:0,position:"relative",width:280,height:280,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{position:"absolute",inset:-10,borderRadius:"50%",border:"2px dashed rgba(234,182,89,.4)",animation:"spin 40s linear infinite"}}/>
            <img src="/logo.png" style={{width:220,height:220,objectFit:"contain",animation:"float 5s ease-in-out infinite",filter:"drop-shadow(0 8px 30px rgba(160,4,4,.3))"}} alt="Shri Aaum"/>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div style={{background:C.amber,padding:"11px 28px"}}>
        <div style={{maxWidth:1340,margin:"0 auto",display:"flex",justifyContent:"center",gap:36,flexWrap:"wrap"}}>
          {[["✦","Free Shipping above ₹999"],["🪔","All Idols Temple Energized"],["📿","100% Authentic Certified"],["↩","14-Day Easy Returns"],["💳","All Payment Methods"]].map(([i,t])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:7,color:C.redDark,fontSize:11,fontWeight:700,letterSpacing:".04em"}}><span>{i}</span><span>{t}</span></div>
          ))}
        </div>
      </div>

      {/* ── CATEGORY TABS ── */}
      <div style={{background:C.ivory,borderBottom:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1340,margin:"0 auto",padding:"0 28px",display:"flex",overflowX:"auto",gap:2}}>
          {CATS.map(c=>(
            <div key={c.id} style={{padding:"14px 18px",borderBottom:`3px solid ${activeCat===c.id?C.red:"transparent"}`,color:activeCat===c.id?C.red:C.muted,fontSize:11,fontWeight:activeCat===c.id?700:600,letterSpacing:".08em",textTransform:"uppercase",cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,transition:"all .15s"}} onClick={()=>{setActiveCat(c.id);document.getElementById("shopSec")?.scrollIntoView({behavior:"smooth"});}}>
              {c.icon} {c.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── SHOP GRID ── */}
      <div id="shopSec" style={{maxWidth:1340,margin:"0 auto",padding:"40px 28px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:28,color:C.text,fontWeight:700}}>
            {CATS.find(c=>c.id===activeCat)?.label} <em style={{color:C.red,fontStyle:"normal"}}>({displayed.length})</em>
          </div>
          <select value={sortVal} onChange={e=>setSortVal(e.target.value)} style={{padding:"7px 12px",border:`1px solid ${C.border}`,borderRadius:6,background:"#fff",color:C.text,fontFamily:"Montserrat,sans-serif",fontSize:12,outline:"none",cursor:"pointer"}}>
            <option value="default">Sort: Default</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:22,flexWrap:"wrap"}}>
          {[["all","All"],["popular","⭐ Popular"],["recommended","👍 Recommended"],["energized","🔱 Energized"]].map(([v,l])=>(
            <button key={v} style={{padding:"6px 16px",borderRadius:20,border:`1px solid ${togFilter===v?C.red:C.border}`,background:togFilter===v?C.red:"#fff",color:togFilter===v?C.cream:C.text2,fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:".04em"}} onClick={()=>setTogFilter(v)}>{l}</button>
          ))}
        </div>

        {loading ? (
          <div style={{textAlign:"center",padding:"56px 0",color:C.muted}}>
            <div style={{fontSize:48,animation:"float 2s infinite",marginBottom:12}}>🪔</div>
            <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:20,color:C.text2}}>Loading sacred items…</div>
          </div>
        ) : displayed.length===0 ? (
          <div style={{textAlign:"center",padding:"56px 0"}}>
            <div style={{fontSize:44}}>🔍</div>
            <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:20,color:C.text2,marginTop:12}}>No products found</div>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(268px,1fr))",gap:18}}>
            {displayed.map(p=>{
              const d=disc(p.originalPrice||p.price,p.price);
              return(
                <div key={p._id} style={{background:"#fff",borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`,boxShadow:"0 2px 10px rgba(160,4,4,.08)",display:"flex",flexDirection:"column",cursor:"pointer",transition:"transform .15s,box-shadow .15s"}}
                  onClick={()=>{setModProd(p);setMQty(1);}}>
                  <div style={{background:C.cream,padding:24,textAlign:"center",position:"relative",fontSize:60}}>
                    {p.badge&&<span style={{position:"absolute",top:10,left:10,fontSize:8,fontWeight:800,padding:"3px 8px",borderRadius:20,color:"#fff",textTransform:"uppercase",background:C.red,letterSpacing:".08em"}}>{p.badge}</span>}
                    <div style={{position:"absolute",top:10,right:10,display:"flex",gap:3}}>
                      {p.isPopular&&<span title="Popular">⭐</span>}
                      {p.isEnergized&&<span title="Energized">🔱</span>}
                    </div>
                    {p.image}
                    {p.stock===0&&<div style={{position:"absolute",bottom:8,right:8,background:"rgba(160,4,4,.85)",color:C.cream,fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:3}}>Out of Stock</div>}
                  </div>
                  <div style={{padding:16,flex:1,display:"flex",flexDirection:"column"}}>
                    <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:".12em",marginBottom:3,fontWeight:600}}>{CATS.find(c=>c.id===p.category)?.label||p.category}</div>
                    <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:16,fontWeight:700,color:C.text,lineHeight:1.3,marginBottom:5}}>{p.name}</div>
                    <div style={{fontSize:11,color:C.muted,lineHeight:1.6,flex:1,marginBottom:8}}>{(p.description||"").substring(0,85)}…</div>
                    {p.tags?.length>0&&(
                      <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:10}}>
                        {p.tags.slice(0,3).map(t=><span key={t} style={{background:C.cream,color:C.text2,fontSize:8,padding:"2px 7px",borderRadius:20,border:`1px solid rgba(234,182,89,.4)`,fontWeight:700,textTransform:"uppercase"}}>{t}</span>)}
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                      <div>
                        <div style={{fontSize:19,fontWeight:800,color:C.red,fontFamily:"Cormorant Garamond,serif"}}>{fmt(p.price)}</div>
                        {d>0&&<div><span style={{fontSize:10,color:"#bbb",textDecoration:"line-through",marginRight:3}}>{fmt(p.originalPrice)}</span><span style={{fontSize:9,color:C.green,fontWeight:700}}>{d}% off</span></div>}
                      </div>
                      <button disabled={p.stock===0} style={{padding:"8px 12px",borderRadius:6,background:C.amber,border:"none",color:C.redDark,fontFamily:"Montserrat,sans-serif",fontSize:9,fontWeight:800,cursor:p.stock===0?"not-allowed":"pointer",textTransform:"uppercase",letterSpacing:".07em",opacity:p.stock===0?.5:1}}
                        onClick={e=>{e.stopPropagation();addCart(p._id);}}>
                        {p.stock===0?"Sold Out":"Add to Cart"}
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
      <section style={{background:C.red,padding:"56px 28px"}}>
        <div style={{maxWidth:1340,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{color:C.amber,fontSize:9,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",marginBottom:10}}>Why Shri Aaum</div>
            <h2 style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:"clamp(26px,4vw,42px)",fontWeight:700}}>Divine Quality, Every Item</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:16}}>
            {[["🕍","Temple Certified","All energized products are certified with proper prana-pratishtha rituals."],
              ["🔬","Lab Tested Gems","Every gemstone and rudraksha bead is lab-certified for authenticity."],
              ["🚚","Pan-India Delivery","Fast, safe delivery. Free shipping above ₹999. COD available."],
              ["♻️","Easy Returns","14-day hassle-free returns on most products."],
              ["💬","Spiritual Guidance","Our pandits can guide you on the right product for your needs."],
              ["🏺","Artisan Crafted","Direct from 3rd-generation temple artisans across India."]
            ].map(([icon,h,p])=>(
              <div key={h} style={{background:"rgba(255,238,212,.07)",border:"1px solid rgba(255,176,49,.2)",borderRadius:10,padding:"22px 18px",textAlign:"center"}}>
                <div style={{fontSize:32,marginBottom:10}}>{icon}</div>
                <h3 style={{fontFamily:"Cormorant Garamond,serif",color:C.amber,fontSize:16,marginBottom:7}}>{h}</h3>
                <p style={{color:"rgba(255,238,212,.5)",fontSize:11,lineHeight:1.7}}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{background:C.redDark,padding:"44px 28px 20px"}}>
        <div style={{maxWidth:1340,margin:"0 auto"}}>
          <div style={{display:"flex",gap:40,flexWrap:"wrap",marginBottom:28,paddingBottom:24,borderBottom:"1px solid rgba(255,176,49,.15)"}}>
            <div style={{maxWidth:260}}>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
                <img src="/logo.png" style={{width:40,height:40,objectFit:"contain"}} alt="Shri Aaum"/>
                <span style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:20,fontWeight:700}}>Shri Aaum</span>
              </div>
              <p style={{color:"rgba(255,238,212,.38)",fontSize:11,lineHeight:1.8}}>Sacred products sourced from temple artisans and energized with Vedic rituals.</p>
              <div style={{color:C.amber,fontSize:11,fontStyle:"italic",marginTop:8,fontFamily:"Cormorant Garamond,serif"}}>"Sarve Bhavantu Sukhinah"</div>
            </div>
            {[["Shop",["Rudraksha","Puja Samagri","Panchaloha Idols","Wellness","Wearables"]],
              ["Support",["Track Order","Returns","FAQs","Contact Us"]],
              ["Company",["About Shri Aaum","Our Artisans","Temple Partners","Blog"]]
            ].map(([h,links])=>(
              <div key={h}>
                <h4 style={{color:C.amber,fontSize:8,fontWeight:700,letterSpacing:".2em",textTransform:"uppercase",marginBottom:12}}>{h}</h4>
                {links.map(l=><a key={l} href="#" style={{display:"block",color:"rgba(255,238,212,.35)",fontSize:11,marginBottom:7,textDecoration:"none"}}>{l}</a>)}
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,238,212,.2)",flexWrap:"wrap",gap:6}}>
            <span>© 2026 Shri Aaum Sacred Store. All rights reserved.</span>
            <span>Privacy · Terms · Shipping Policy</span>
          </div>
        </div>
      </footer>

      {/* ── CART DRAWER ── */}
      {cartOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:399,background:"rgba(0,0,0,.42)"}} onClick={()=>setCartOpen(false)}>
          <div style={{position:"absolute",top:0,right:0,bottom:0,width:370,background:C.ivory,display:"flex",flexDirection:"column",boxShadow:"-4px 0 28px rgba(0,0,0,.22)"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:C.red,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:20,fontWeight:700}}>Your Cart ({cartCount})</div>
              <button style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:28,height:28,color:C.cream,cursor:"pointer",fontSize:13}} onClick={()=>setCartOpen(false)}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:18}}>
              {cart.length===0?(
                <div style={{textAlign:"center",padding:56,color:C.muted}}>
                  <div style={{fontSize:44,marginBottom:10}}>🪔</div>
                  <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:18,color:C.text2}}>Your cart is empty</div>
                </div>
              ):cart.map(i=>(
                <div key={i._id} style={{display:"flex",gap:12,marginBottom:14,padding:12,background:"#fff",borderRadius:9,border:`1px solid ${C.border}`}}>
                  <div style={{width:52,height:52,background:C.cream,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{i.image}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:14,fontWeight:700,color:C.text,lineHeight:1.3,marginBottom:3}}>{i.name}</div>
                    <div style={{fontSize:13,fontWeight:800,color:C.red,fontFamily:"Cormorant Garamond,serif"}}>{fmt(i.price*i.qty)}</div>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginTop:7}}>
                      <div style={{display:"flex",alignItems:"center",border:`1px solid ${C.border}`,borderRadius:5,overflow:"hidden"}}>
                        <button onClick={()=>changeQty(i._id,i.qty-1)} style={{width:26,height:26,border:"none",background:"#f5f5f5",cursor:"pointer",fontSize:13}}>−</button>
                        <span style={{width:30,textAlign:"center",fontSize:12,fontWeight:700}}>{i.qty}</span>
                        <button onClick={()=>changeQty(i._id,i.qty+1)} style={{width:26,height:26,border:"none",background:"#f5f5f5",cursor:"pointer",fontSize:13}}>+</button>
                      </div>
                      <button onClick={()=>removeCart(i._id)} style={{fontSize:10,color:C.red,border:"none",background:"none",cursor:"pointer",fontWeight:600}}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cart.length>0&&(
              <div style={{padding:18,borderTop:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:12,color:C.muted}}><span>Subtotal</span><span>{fmt(cartTotal)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,fontSize:12,color:C.muted}}><span>Shipping</span><span>{ship===0?"Free":fmt(ship)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:16,fontSize:18,fontWeight:800,color:C.red,fontFamily:"Cormorant Garamond,serif"}}><span>Total</span><span>{fmt(cartTotal+ship)}</span></div>
                <button style={{...btnRed,width:"100%",padding:"13px 0"}} onClick={()=>{setCartOpen(false);setCkOpen(true);}}>Proceed to Checkout →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PRODUCT MODAL ── */}
      {modProd&&(()=>{
        const p=modProd; const d=disc(p.originalPrice||p.price,p.price);
        return(
          <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"rgba(26,10,0,.78)"}} onClick={()=>setModProd(null)}>
            <div style={{background:C.ivory,borderRadius:14,width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 28px 70px rgba(160,4,4,.42)"}} onClick={e=>e.stopPropagation()}>
              <div style={{background:C.red,padding:"24px 26px 22px",borderRadius:"14px 14px 0 0",position:"relative"}}>
                <button style={{position:"absolute",top:12,right:12,background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:30,height:30,color:C.cream,fontSize:14,cursor:"pointer"}} onClick={()=>setModProd(null)}>✕</button>
                <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                  <div style={{width:80,height:80,borderRadius:9,background:C.cream,border:"2px solid rgba(255,176,49,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,flexShrink:0}}>{p.image}</div>
                  <div style={{flex:1}}>
                    {p.badge&&<span style={{display:"inline-block",fontSize:8,fontWeight:800,padding:"2px 8px",borderRadius:20,color:"#fff",textTransform:"uppercase",background:"rgba(255,255,255,.25)",marginBottom:7,letterSpacing:".08em"}}>{p.badge}</span>}
                    <div style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:24,fontWeight:700,lineHeight:1.2}}>{p.name}</div>
                    {p.series&&<div style={{color:C.amber,fontSize:11,marginTop:4}}>Series: {p.series}</div>}
                  </div>
                </div>
              </div>
              <div style={{padding:24}}>
                <p style={{fontSize:13,color:C.text2,lineHeight:1.85,marginBottom:18}}>{p.description}</p>
                <div style={{background:C.cream,borderRadius:8,padding:12,marginBottom:18,fontSize:11}}>
                  {p.material&&<div><span style={{color:C.muted}}>Material: </span><span style={{fontWeight:700}}>{p.material}</span></div>}
                  {p.templeOrigin&&<div style={{marginTop:3}}><span style={{color:C.muted}}>Temple Origin: </span><span style={{fontWeight:700}}>{p.templeOrigin}</span></div>}
                  <div style={{marginTop:3}}><span style={{color:C.muted}}>Stock: </span><span style={{fontWeight:700,color:p.stock<5?C.red:C.green}}>{p.stock>0?`${p.stock} available`:"Out of stock"}</span></div>
                </div>
                {p.tags?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:18}}>{p.tags.map(t=><span key={t} style={{background:C.cream,color:C.text2,fontSize:8,padding:"2px 7px",borderRadius:20,border:`1px solid rgba(234,182,89,.4)`,fontWeight:700,textTransform:"uppercase"}}>{t}</span>)}</div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                  <div>
                    <div style={{fontSize:30,fontWeight:800,color:C.red,fontFamily:"Cormorant Garamond,serif"}}>{fmt(p.price)}</div>
                    {d>0&&<div><span style={{fontSize:11,color:"#bbb",textDecoration:"line-through",marginRight:3}}>{fmt(p.originalPrice)}</span><span style={{fontSize:10,color:C.green,fontWeight:700}}>{d}% off</span></div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",border:`1.5px solid ${C.border}`,borderRadius:6,overflow:"hidden"}}>
                    <button onClick={()=>setMQty(q=>Math.max(1,q-1))} style={{width:34,height:36,background:"#fff",border:"none",fontSize:16,cursor:"pointer"}}>−</button>
                    <span style={{width:38,textAlign:"center",fontWeight:700,fontSize:14}}>{mQty}</span>
                    <button onClick={()=>setMQty(q=>Math.min(p.stock,q+1))} style={{width:34,height:36,background:"#fff",border:"none",fontSize:16,cursor:"pointer"}}>+</button>
                  </div>
                </div>
                <button disabled={p.stock===0} style={{...btnRed,width:"100%",padding:"13px 0",fontSize:13,opacity:p.stock===0?.5:1}} onClick={()=>{addCart(p._id,mQty);setModProd(null);setCartOpen(true);}}>
                  {p.stock===0?"Out of Stock":`Add ${mQty} to Cart — ${fmt(p.price*mQty)}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── CHECKOUT ── */}
      {ckOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"rgba(26,10,0,.78)"}} onClick={()=>setCkOpen(false)}>
          <div style={{background:C.ivory,borderRadius:14,width:"100%",maxWidth:500,maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:C.red,padding:"22px 26px",borderRadius:"14px 14px 0 0",position:"relative"}}>
              <button style={{position:"absolute",top:12,right:12,background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:28,height:28,color:C.cream,fontSize:13,cursor:"pointer"}} onClick={()=>setCkOpen(false)}>✕</button>
              <div style={{color:C.amber,fontSize:9,fontWeight:700,letterSpacing:".15em",textTransform:"uppercase",marginBottom:5}}>Step {ckStep} of 3</div>
              <div style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:22,fontWeight:700}}>{["","Contact Details","Delivery Address","Payment"][ckStep]}</div>
              <div style={{display:"flex",gap:5,marginTop:12}}>
                {[1,2,3].map(s=><div key={s} style={{height:3,flex:1,borderRadius:2,background:s<=ckStep?C.amber:"rgba(255,255,255,.2)"}}/>)}
              </div>
            </div>
            <div style={{padding:24}}>
              {ckStep===1&&<>
                <label style={lblStyle}>Full Name *</label>
                <input style={inpStyle} value={ckData.name||""} onChange={e=>setCkData(p=>({...p,name:e.target.value}))} placeholder="Your full name"/>
                <label style={lblStyle}>Mobile Number *</label>
                <input style={inpStyle} value={ckData.phone||""} onChange={e=>setCkData(p=>({...p,phone:e.target.value}))} placeholder="+91 XXXXX XXXXX"/>
                <label style={lblStyle}>Email Address</label>
                <input style={inpStyle} value={ckData.email||""} onChange={e=>setCkData(p=>({...p,email:e.target.value}))} placeholder="your@email.com"/>
                <button style={{...btnRed,width:"100%"}} onClick={()=>{if(!ckData.name||!ckData.phone){addToast("Name and mobile required","err");return;}setCkStep(2);}}>Continue →</button>
              </>}
              {ckStep===2&&<>
                <label style={lblStyle}>Address Line *</label>
                <input style={inpStyle} value={ckData.addr||""} onChange={e=>setCkData(p=>({...p,addr:e.target.value}))} placeholder="House / Flat / Street"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><label style={lblStyle}>City *</label><input style={inpStyle} value={ckData.city||""} onChange={e=>setCkData(p=>({...p,city:e.target.value}))} placeholder="City"/></div>
                  <div><label style={lblStyle}>State *</label><input style={inpStyle} value={ckData.state||""} onChange={e=>setCkData(p=>({...p,state:e.target.value}))} placeholder="State"/></div>
                </div>
                <label style={lblStyle}>Pincode *</label>
                <input style={inpStyle} value={ckData.pin||""} onChange={e=>setCkData(p=>({...p,pin:e.target.value}))} placeholder="6-digit pincode"/>
                <label style={lblStyle}>Coupon Code</label>
                <input style={inpStyle} value={ckData.coupon||""} onChange={e=>setCkData(p=>({...p,coupon:e.target.value.toUpperCase()}))} placeholder="Try AAUM10 for 10% off"/>
                {couponAmt>0&&<div style={{color:C.green,fontSize:12,fontWeight:700,marginTop:-10,marginBottom:12}}>✓ Coupon applied — saving {fmt(couponAmt)}</div>}
                <div style={{display:"flex",gap:10}}>
                  <button style={{...btnGhost,flex:.5,padding:"12px 0"}} onClick={()=>setCkStep(1)}>← Back</button>
                  <button style={{...btnRed,flex:1,padding:"12px 0"}} onClick={()=>{if(!ckData.addr||!ckData.city||!ckData.pin){addToast("Fill all address fields","err");return;}setCkStep(3);}}>Continue →</button>
                </div>
              </>}
              {ckStep===3&&<>
                <div style={{background:C.cream,borderRadius:8,padding:12,marginBottom:16,fontSize:11}}>
                  <div style={{fontWeight:700,color:C.text2,marginBottom:7,textTransform:"uppercase",letterSpacing:".06em"}}>Order Summary</div>
                  {cart.map(i=><div key={i._id} style={{display:"flex",justifyContent:"space-between",marginBottom:3,color:C.text}}><span>{i.name} × {i.qty}</span><span style={{fontWeight:600}}>{fmt(i.price*i.qty)}</span></div>)}
                  <div style={{borderTop:`1px solid ${C.border}`,paddingTop:7,marginTop:7}}>
                    <div style={{display:"flex",justifyContent:"space-between",color:C.muted,marginBottom:2}}><span>Shipping</span><span>{ship===0?"Free":fmt(ship)}</span></div>
                    {couponAmt>0&&<div style={{display:"flex",justifyContent:"space-between",color:C.green,marginBottom:2}}><span>Coupon</span><span>−{fmt(couponAmt)}</span></div>}
                    <div style={{display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:16,color:C.red,marginTop:4,fontFamily:"Cormorant Garamond,serif"}}><span>Total</span><span>{fmt(finalTotal)}</span></div>
                  </div>
                </div>
                <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>Payment Method</div>
                {[["razorpay","💳 Pay Online — UPI, Cards, Net Banking"],["cod","💵 Cash on Delivery"]].map(([v,l])=>(
                  <div key={v} style={{border:`1.5px solid ${ckData.payMethod===v?C.red:C.border}`,borderRadius:8,padding:"11px 14px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:9,fontSize:13,background:ckData.payMethod===v?"rgba(160,4,4,.05)":"#fff"}} onClick={()=>setCkData(p=>({...p,payMethod:v}))}>
                    <input type="radio" readOnly checked={ckData.payMethod===v} style={{accentColor:C.red}}/>{l}
                  </div>
                ))}
                <div style={{display:"flex",gap:10,marginTop:14}}>
                  <button style={{...btnGhost,flex:.5,padding:"12px 0"}} onClick={()=>setCkStep(2)}>← Back</button>
                  <button disabled={paying} style={{...btnRed,flex:1,padding:"12px 0",opacity:paying?.7:1}} onClick={placeOrder}>{paying?"Processing…":`Place Order · ${fmt(finalTotal)}`}</button>
                </div>
                <div style={{textAlign:"center",marginTop:10,fontSize:9,color:C.muted}}>🔒 Secured by Razorpay · PCI-DSS Compliant</div>
              </>}
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {sucOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"rgba(26,10,0,.78)"}} onClick={()=>setSucOpen(false)}>
          <div style={{background:C.ivory,borderRadius:14,width:"100%",maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div style={{background:C.red,padding:"28px 26px",borderRadius:"14px 14px 0 0",textAlign:"center"}}>
              <div style={{fontSize:60,marginBottom:8}}>🙏</div>
              <div style={{fontFamily:"Cormorant Garamond,serif",color:C.cream,fontSize:26,fontWeight:700}}>Order Placed!</div>
              <div style={{color:"rgba(255,238,212,.7)",fontSize:12,marginTop:5}}>Jai Shri Ram · Divine blessings on your purchase</div>
            </div>
            <div style={{padding:26,textAlign:"center"}}>
              <p style={{color:C.text2,fontSize:13,lineHeight:1.85,marginBottom:22}}>Your order has been placed successfully. You'll receive a WhatsApp confirmation shortly. Your sacred items will be delivered with care.</p>
              <button style={{...btnRed,width:"100%"}} onClick={()=>setSucOpen(false)}>Continue Shopping</button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts}/>
    </div>
  );
}
