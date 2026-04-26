'use strict';

// La web completa se exporta como string HTML.
// Fastify la sirve directamente desde GET /
// Esto simplifica el despliegue con aaPanel Node Project — un solo proceso,
// sin archivos estáticos que configurar.

module.exports = /* html */`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NeXoNetwork — Open Online Services</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<style>
:root{--red:#E4000F;--rd:#B8000C;--rs:#FFF0F1;--blu:#0AB9E6;--bd:#0890B8;--bs:#E5F8FD;--gb:#F5F5F5;--gm:#D1D1D1;--gd:#2C2C2C;--wh:#FFF;--tx:#1A1A1A;--tm:#888;--rlg:16px;--rmd:10px;--rsm:6px;--font:'M PLUS Rounded 1c',system-ui,sans-serif;}
*{margin:0;padding:0;box-sizing:border-box;}html{scroll-behavior:smooth;}
body{font-family:var(--font);background:var(--wh);color:var(--tx);overflow-x:hidden;}
::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:var(--gb);}::-webkit-scrollbar-thumb{background:var(--red);border-radius:3px;}

/* NAV */
.nav{position:fixed;top:0;left:0;right:0;z-index:900;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);border-bottom:3px solid var(--red);display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:62px;transition:box-shadow .2s;}
.nav.scrolled{box-shadow:0 4px 20px rgba(0,0,0,.1);}
.nl{display:flex;align-items:center;gap:10px;text-decoration:none;}
.lm{width:36px;height:36px;border-radius:50%;background:var(--red);display:flex;align-items:center;justify-content:center;}
.lm svg{width:20px;height:20px;fill:white;}
.lt{font-size:18px;font-weight:900;color:var(--red);letter-spacing:-.5px;}
.nav-links{display:flex;gap:2px;}
.nla{padding:8px 14px;border-radius:var(--rmd);font-size:13px;font-weight:700;color:var(--tm);text-decoration:none;transition:all .15s;border:none;background:none;cursor:pointer;}
.nla:hover{background:var(--gb);color:var(--tx);}
.ncta{padding:9px 18px;background:var(--red);color:white;border:none;border-radius:var(--rmd);font-family:var(--font);font-weight:800;font-size:13px;cursor:pointer;transition:background .15s;}
.ncta:hover{background:var(--rd);}

/* HERO */
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:90px 2rem 4rem;position:relative;overflow:hidden;}
.hbg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 15%,rgba(228,0,15,.06),transparent 70%),radial-gradient(ellipse 50% 40% at 85% 85%,rgba(10,185,230,.06),transparent 70%);}
.jdl{position:absolute;left:-55px;top:50%;transform:translateY(-50%);width:100px;height:280px;background:var(--red);border-radius:50px 14px 14px 50px;opacity:.05;}
.jdr{position:absolute;right:-55px;top:50%;transform:translateY(-50%);width:100px;height:280px;background:var(--blu);border-radius:14px 50px 50px 14px;opacity:.05;}
.hbadge{display:inline-flex;align-items:center;gap:8px;background:var(--rs);border:1.5px solid rgba(228,0,15,.2);border-radius:20px;padding:5px 14px;margin-bottom:1.5rem;font-size:11px;font-weight:800;color:var(--red);letter-spacing:.5px;text-transform:uppercase;position:relative;z-index:1;}
.bdot{width:7px;height:7px;border-radius:50%;background:var(--red);animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
.hero h1{font-size:clamp(38px,7vw,80px);font-weight:900;line-height:1.0;letter-spacing:-2px;position:relative;z-index:1;margin-bottom:1.2rem;}
.hero p{font-size:clamp(14px,1.8vw,18px);color:var(--tm);max-width:520px;line-height:1.65;position:relative;z-index:1;margin-bottom:2.5rem;font-weight:500;}
.hbtns{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;position:relative;z-index:1;}
.bpr{padding:12px 28px;background:var(--red);color:white;border:none;border-radius:var(--rlg);font-family:var(--font);font-weight:800;font-size:15px;cursor:pointer;transition:all .15s;text-decoration:none;display:inline-flex;align-items:center;gap:7px;}
.bpr:hover{background:var(--rd);transform:translateY(-1px);}
.bsc{padding:12px 28px;background:white;color:var(--tx);border:2px solid var(--gm);border-radius:var(--rlg);font-family:var(--font);font-weight:800;font-size:15px;cursor:pointer;transition:all .15s;text-decoration:none;display:inline-flex;align-items:center;gap:7px;}
.bsc:hover{border-color:var(--blu);color:var(--blu);transform:translateY(-1px);}

/* CONSOLE MOCKUP */
.cw{position:relative;z-index:1;margin-top:3rem;width:100%;max-width:620px;}
.cf{background:#1e1e1e;border-radius:18px;padding:13px;box-shadow:0 28px 70px rgba(0,0,0,.28),0 0 0 1.5px rgba(255,255,255,.05);position:relative;}
.cs{background:#0a0a0a;border-radius:9px;overflow:hidden;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:1.5rem;background:linear-gradient(135deg,#0f0f23,#12193a);}
.csl{font-size:24px;font-weight:900;color:white;letter-spacing:-1px;}
.csl span{color:var(--red);}
.csp{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;}
.cpp{padding:4px 11px;border-radius:20px;font-size:10px;font-weight:800;display:flex;align-items:center;gap:4px;}
.cpp.on{background:rgba(34,197,94,.2);color:#4ade80;}
.cpp.bl{background:rgba(10,185,230,.2);color:var(--blu);}
.cpp.gr{background:rgba(255,255,255,.08);color:rgba(255,255,255,.55);}
.jcl{position:absolute;top:50%;transform:translateY(-50%);left:-46px;width:40px;height:175px;background:var(--red);border-radius:20px 7px 7px 20px;}
.jcr{position:absolute;top:50%;transform:translateY(-50%);right:-46px;width:40px;height:175px;background:var(--blu);border-radius:7px 20px 20px 7px;}
@media(max-width:700px){.jcl,.jcr,.jdl,.jdr{display:none;}}

/* DIVIDER */
.jcd{height:4px;background:linear-gradient(90deg,var(--red) 50%,var(--blu) 50%);}

/* STATS BAR */
.sbar{background:var(--gd);color:white;padding:1.25rem 2rem;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:0;}
.si{display:flex;flex-direction:column;align-items:center;padding:0 2rem;border-right:1px solid rgba(255,255,255,.1);}
.si:last-child{border:none;}
.sn{font-size:30px;font-weight:900;line-height:1;}
.sn.r{color:var(--red);}.sn.b{color:var(--blu);}.sn.g{color:#4ade80;}.sn.y{color:#fbbf24;}
.sl{font-size:10px;font-weight:700;color:rgba(255,255,255,.4);margin-top:3px;text-transform:uppercase;letter-spacing:1px;}

/* SECTIONS */
section{padding:4.5rem 2rem;}
.cnt{max-width:1080px;margin:0 auto;}
.slbl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--red);margin-bottom:.6rem;}
.stit{font-size:clamp(24px,4vw,40px);font-weight:900;line-height:1.1;letter-spacing:-1px;margin-bottom:.9rem;}
.ssub{font-size:15px;color:var(--tm);max-width:480px;line-height:1.6;font-weight:500;margin-bottom:2.5rem;}

/* FEATURES */
.fbg{background:var(--gb);}
.fg{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px;}
.fc{background:white;border-radius:var(--rlg);padding:1.5rem;border:1.5px solid transparent;transition:all .2s;}
.fc:hover{border-color:var(--red);transform:translateY(-2px);box-shadow:0 8px 24px rgba(228,0,15,.07);}
.fi{width:44px;height:44px;border-radius:var(--rmd);margin-bottom:.9rem;display:flex;align-items:center;justify-content:center;}
.fi.r{background:var(--rs);}.fi.b{background:var(--bs);}.fi.g{background:#f0fdf4;}.fi.a{background:#fffbeb;}
.fi svg{width:22px;height:22px;}
.fi.r svg{fill:var(--red);}.fi.b svg{fill:var(--blu);}.fi.g svg{fill:#16a34a;}.fi.a svg{fill:#d97706;}
.fc h3{font-size:16px;font-weight:800;margin-bottom:.4rem;}
.fc p{font-size:13px;color:var(--tm);line-height:1.6;font-weight:500;}

/* API */
.apibg{background:var(--gd);}
.apibg .slbl{color:var(--blu);}
.apibg .stit{color:white;}
.apibg .ssub{color:rgba(255,255,255,.4);}
.epg{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:9px;}
.ep{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:var(--rmd);padding:.8rem 1rem;}
.em{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;font-family:monospace;margin-bottom:.35rem;}
.em.g{background:rgba(34,197,94,.15);color:#4ade80;}
.em.b{background:rgba(10,185,230,.15);color:var(--blu);}
.em.y{background:rgba(251,191,36,.15);color:#fbbf24;}
.em.r2{background:rgba(228,0,15,.15);color:#f87171;}
.ep-p{font-family:monospace;font-size:12px;color:white;font-weight:700;margin-bottom:.15rem;}
.ep-d{font-size:11px;color:rgba(255,255,255,.38);font-weight:500;}

/* COMPAT */
.cg{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:12px;}
.cc{border-radius:var(--rlg);padding:1.25rem;text-align:center;border:2px solid var(--gm);transition:all .2s;}
.cc:hover{border-color:var(--red);transform:translateY(-2px);}
.ci{font-size:28px;margin-bottom:.6rem;}
.cn{font-size:14px;font-weight:800;margin-bottom:.2rem;}
.cd{font-size:11px;color:var(--tm);font-weight:500;}
.cb{display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:800;margin-top:.4rem;}
.cb.y{background:#f0fdf4;color:#16a34a;}.cb.w{background:#fffbeb;color:#d97706;}.cb.s{background:var(--gb);color:var(--tm);}

/* CTA */
.ctas{background:var(--red);color:white;text-align:center;padding:4.5rem 2rem;}
.ctas h2{font-size:clamp(24px,5vw,46px);font-weight:900;margin-bottom:.9rem;letter-spacing:-1px;}
.ctas p{font-size:16px;opacity:.8;max-width:440px;margin:0 auto 2.25rem;font-weight:500;line-height:1.6;}
.bw{padding:12px 32px;background:white;color:var(--red);border:none;border-radius:var(--rlg);font-family:var(--font);font-weight:900;font-size:15px;cursor:pointer;transition:all .15s;text-decoration:none;display:inline-block;}
.bw:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.2);}
.bo{padding:12px 32px;background:transparent;color:white;border:2px solid rgba(255,255,255,.4);border-radius:var(--rlg);font-family:var(--font);font-weight:800;font-size:15px;cursor:pointer;transition:all .15s;text-decoration:none;display:inline-block;margin-left:10px;}
.bo:hover{border-color:white;background:rgba(255,255,255,.1);}

/* ══ PLANES ══ */
#plans{background:var(--gb);}
.plans-head{text-align:center;margin-bottom:2.5rem;}
.plans-head .ptag{font-size:10px;font-weight:800;color:var(--red);text-transform:uppercase;letter-spacing:2px;margin-bottom:.6rem;}
.plans-head h2{font-size:clamp(26px,4vw,42px);font-weight:900;letter-spacing:-.5px;margin-bottom:.75rem;}
.plans-head p{font-size:14px;color:var(--tm);max-width:500px;margin:0 auto;line-height:1.6;}
.pbill{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:2.5rem;}
.pbill span{font-size:13px;font-weight:700;color:var(--tm);}
.ptog{width:46px;height:26px;background:var(--gm);border-radius:13px;cursor:pointer;position:relative;transition:background .2s;border:none;padding:0;}
.ptog.on{background:var(--red);}
.ptogk{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:white;transition:transform .2s;box-shadow:0 1px 4px rgba(0,0,0,.2);}
.ptog.on .ptogk{transform:translateX(20px);}
.psave{background:rgba(34,197,94,.15);color:#16a34a;border:1px solid rgba(34,197,94,.3);font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;}
.pgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:18px;align-items:start;}
.pc{background:white;border-radius:var(--rlg);padding:1.75rem;border:2px solid var(--gm);transition:all .2s;position:relative;}
.pc:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.1);border-color:var(--red);}
.pc.hot{border-color:var(--red);box-shadow:0 0 0 3px rgba(228,0,15,.12);transform:translateY(-6px);}
.pc.hot:hover{transform:translateY(-10px);box-shadow:0 0 0 3px rgba(228,0,15,.12),0 16px 40px rgba(228,0,15,.15);}
.pop-tag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--red);color:white;font-size:10px;font-weight:900;padding:3px 14px;border-radius:20px;white-space:nowrap;letter-spacing:.5px;text-transform:uppercase;}
.pico{font-size:2rem;margin-bottom:.75rem;}
.pname{font-size:17px;font-weight:900;margin-bottom:.3rem;}
.ptag2{font-size:12px;color:var(--tm);line-height:1.5;margin-bottom:1.25rem;}
.pprice{margin-bottom:1.5rem;}
.pprice .amount{font-size:42px;font-weight:900;line-height:1;}
.pprice .cur{font-size:20px;font-weight:700;color:var(--tm);vertical-align:top;padding-top:6px;display:inline-block;}
.pprice .per{font-size:12px;color:var(--tm);margin-top:4px;}
.pprice .pyr{display:none;}
.yearly .pprice .pmo{display:none;}
.yearly .pprice .pyr{display:block;}
.pdiv{height:1px;background:var(--gb);margin:1.25rem 0;}
.pfl{list-style:none;display:flex;flex-direction:column;gap:8px;margin-bottom:1.5rem;}
.pfl li{display:flex;align-items:flex-start;gap:8px;font-size:13px;line-height:1.45;}
.pchk{width:17px;height:17px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;margin-top:1px;}
.pchk.y{background:rgba(34,197,94,.15);color:#16a34a;}
.pchk.n{background:var(--gb);color:var(--gm);}
.pfl li.off span.pl{color:var(--gm);}
.pcta{display:block;width:100%;padding:11px;border-radius:var(--rmd);font-family:var(--font);font-size:13px;font-weight:800;text-align:center;cursor:pointer;border:2px solid var(--gm);background:white;color:var(--tx);transition:all .15s;text-decoration:none;}
.pcta:hover{border-color:var(--red);color:var(--red);}
.pcta.red{background:var(--red);color:white;border-color:var(--red);}
.pcta.red:hover{background:var(--rd);border-color:var(--rd);}
.pnote{text-align:center;font-size:11px;color:var(--tm);margin-top:6px;}
/* Compare table */
.ctbl-wrap{margin-top:3.5rem;overflow-x:auto;}
.ctbl-wrap h3{font-size:18px;font-weight:900;margin-bottom:1.25rem;text-align:center;}
.ctbl{width:100%;border-collapse:collapse;font-size:13px;}
.ctbl th,.ctbl td{padding:10px 16px;text-align:center;border-bottom:1px solid var(--gb);}
.ctbl th{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--tm);background:var(--gb);}
.ctbl th:first-child,.ctbl td:first-child{text-align:left;font-weight:700;color:var(--tx);}
.ctbl tr:hover td{background:var(--gb);}
.ctbl .ck{color:#16a34a;font-size:15px;font-weight:900;}
.ctbl .cx{color:var(--gm);font-size:15px;}
/* FAQ */
.pfaq{margin-top:3.5rem;}
.pfaq h3{font-size:18px;font-weight:900;margin-bottom:1.25rem;text-align:center;}
.fqg{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;}
.fqi{background:white;border-radius:var(--rmd);padding:1.1rem 1.25rem;border:1.5px solid var(--gb);}
.fqi h4{font-size:13px;font-weight:800;margin-bottom:.4rem;}
.fqi p{font-size:12px;color:var(--tm);line-height:1.6;}

/* ══ ROADMAP ══ */
#roadmap{background:white;}
.rdhead{text-align:center;margin-bottom:2.5rem;}
.rdhead .rtag{font-size:10px;font-weight:800;color:var(--red);text-transform:uppercase;letter-spacing:2px;margin-bottom:.6rem;}
.rdhead h2{font-size:clamp(24px,4vw,38px);font-weight:900;letter-spacing:-.5px;margin-bottom:.75rem;}
.rdhead p{font-size:14px;color:var(--tm);max-width:520px;margin:0 auto;line-height:1.6;}
/* progress bar global */
.gbar-wrap{background:var(--gb);border-radius:8px;height:10px;margin-bottom:2.5rem;overflow:hidden;}
.gbar{height:100%;border-radius:8px;background:linear-gradient(90deg,var(--red),var(--blu));transition:width .8s ease;}
.gbar-label{text-align:center;font-size:12px;font-weight:800;color:var(--tm);margin-bottom:.5rem;}
/* category grid */
.rdgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.25rem;}
.rdc{background:var(--gb);border-radius:var(--rlg);padding:1.5rem;border:2px solid transparent;transition:border-color .2s;}
.rdc:hover{border-color:var(--gm);}
.rdchead{display:flex;align-items:center;gap:10px;margin-bottom:1.1rem;}
.rdcico{width:36px;height:36px;border-radius:var(--rmd);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;}
.rdcico.red{background:var(--rs);}
.rdcico.blu{background:var(--bs);}
.rdcico.grn{background:rgba(34,197,94,.12);}
.rdcico.pur{background:rgba(168,85,247,.1);}
.rdcico.yel{background:rgba(251,191,36,.12);}
.rdcico.gry{background:var(--gb);}
.rdctitle{font-size:14px;font-weight:900;}
.rdcsub{font-size:11px;color:var(--tm);font-weight:600;}
/* mini progress bar per category */
.mbar-wrap{background:white;border-radius:4px;height:6px;margin-bottom:1rem;overflow:hidden;}
.mbar{height:100%;border-radius:4px;transition:width .6s ease;}
.mbar.red{background:var(--red);}
.mbar.blu{background:var(--blu);}
.mbar.grn{background:#22c55e;}
.mbar.pur{background:#a855f7;}
.mbar.yel{background:#f59e0b;}
/* item list */
.rditems{display:flex;flex-direction:column;gap:6px;}
.rdi{display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.45;}
.rdibadge{width:18px;height:18px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;flex-shrink:0;margin-top:1px;}
.rdibadge.done{background:rgba(34,197,94,.15);color:#16a34a;}
.rdibadge.wip{background:rgba(251,191,36,.2);color:#d97706;}
.rdibadge.todo{background:var(--gb);color:var(--gm);}
.rdilabel{color:var(--tx);}
.rdilabel.dim{color:var(--tm);}
/* legend */
.rdlegend{display:flex;align-items:center;justify-content:center;gap:1.5rem;flex-wrap:wrap;margin-bottom:2rem;font-size:12px;color:var(--tm);}
.rdlegend span{display:flex;align-items:center;gap:5px;font-weight:700;}
.ll{width:14px;height:14px;border-radius:3px;display:inline-block;}
.ll.done{background:rgba(34,197,94,.2);border:1px solid #22c55e;}
.ll.wip{background:rgba(251,191,36,.2);border:1px solid #f59e0b;}
.ll.todo{background:var(--gb);border:1px solid var(--gm);}
/* version badge */
.vbadge{display:inline-flex;align-items:center;gap:6px;background:var(--rs);border:1.5px solid rgba(228,0,15,.2);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:800;color:var(--red);letter-spacing:.3px;margin-bottom:1rem;}
/* switch section */
.sw-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:1.5rem;}
.sw-step{background:var(--gb);border-radius:var(--rmd);padding:1.1rem;position:relative;}
.sw-step .snum{width:26px;height:26px;border-radius:50%;background:var(--red);color:white;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;margin-bottom:.6rem;}
.sw-step h4{font-size:13px;font-weight:800;margin-bottom:.3rem;}
.sw-step p{font-size:12px;color:var(--tm);line-height:1.5;}
.sw-step .stag{display:inline-block;font-size:9px;font-weight:800;padding:2px 7px;border-radius:10px;margin-bottom:.5rem;text-transform:uppercase;}
.stag.done{background:rgba(34,197,94,.15);color:#16a34a;}
.stag.wip{background:rgba(251,191,36,.2);color:#d97706;}
.stag.todo{background:var(--gb);color:var(--tm);}

/* FOOTER */
footer{background:var(--gd);color:rgba(255,255,255,.5);padding:2.5rem 2rem 2rem;}
.fi2{max-width:1080px;margin:0 auto;}
.ft{display:flex;justify-content:space-between;flex-wrap:wrap;gap:2rem;margin-bottom:2rem;}
.fb h4{font-size:18px;font-weight:900;color:var(--red);}
.fb p{font-size:12px;margin-top:.4rem;max-width:240px;line-height:1.6;}
.fl h4{font-size:10px;font-weight:800;color:white;text-transform:uppercase;letter-spacing:1px;margin-bottom:.6rem;}
.fl a{display:block;font-size:12px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:.3rem;font-weight:500;transition:color .15s;}
.fl a:hover{color:white;}
.fb2{border-top:1px solid rgba(255,255,255,.08);padding-top:1.25rem;display:flex;justify-content:space-between;flex-wrap:wrap;gap:.75rem;}

/* ══ APP OVERLAY ══ */
.app-ov{display:none;position:fixed;inset:0;background:white;z-index:1000;overflow-y:auto;}
.app-ov.open{display:block;}

/* APP NAV */
.anav{background:white;border-bottom:3px solid var(--red);display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;height:60px;position:sticky;top:0;z-index:100;}
.alinks{display:flex;gap:3px;}
.alink{padding:7px 12px;border-radius:var(--rmd);font-size:12px;font-weight:800;color:var(--tm);cursor:pointer;border:none;background:transparent;transition:all .15s;font-family:var(--font);}
.alink:hover{background:var(--gb);color:var(--tx);}
.alink.active{background:var(--rs);color:var(--red);}
.acnt{max-width:1080px;margin:0 auto;padding:1.75rem;}
.apg{display:none;}.apg.active{display:block;}
.jcs{height:4px;background:linear-gradient(90deg,var(--red) 50%,var(--blu) 50%);border-radius:2px;margin-bottom:1.75rem;}
.ph{font-size:23px;font-weight:900;margin-bottom:1.25rem;letter-spacing:-.5px;}
.ph span{color:var(--red);}

/* STAT CARDS */
.sgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:12px;margin-bottom:1.75rem;}
.sc{background:white;border-radius:var(--rlg);padding:1.1rem 1.3rem;box-shadow:0 2px 10px rgba(0,0,0,.07);border-left:4px solid var(--red);}
.sc.b{border-left-color:var(--blu);}.sc.g{border-left-color:#22c55e;}.sc.a{border-left-color:#f59e0b;}
.scl{font-size:10px;font-weight:800;color:var(--tm);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;}
.scv{font-size:28px;font-weight:900;color:var(--tx);line-height:1;}
.scs{font-size:11px;color:var(--tm);margin-top:3px;}

/* SERVER CARDS */
.svgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-bottom:1.25rem;}
.svc{background:white;border-radius:var(--rlg);padding:1.1rem 1.3rem;box-shadow:0 2px 10px rgba(0,0,0,.07);}
.svh{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;}
.svn{font-size:14px;font-weight:800;}
.spill{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;display:flex;align-items:center;gap:4px;}
.spill.on{background:#f0fdf4;color:#16a34a;}.spill.off{background:var(--rs);color:var(--rd);}
.sdot{width:6px;height:6px;border-radius:50%;}
.sdot.on{background:#22c55e;}.sdot.off{background:var(--red);}
.bw2{height:4px;background:var(--gb);border-radius:3px;margin:7px 0 3px;overflow:hidden;}
.bar2{height:100%;border-radius:3px;transition:width .5s;}
.bar2.lo{background:#22c55e;}.bar2.mi{background:#f59e0b;}.bar2.hi{background:var(--red);}

/* PROFILE */
.ptc{background:white;border-radius:var(--rlg);padding:1.5rem;box-shadow:0 2px 10px rgba(0,0,0,.07);display:flex;align-items:center;gap:1.25rem;margin-bottom:1.25rem;}
.avlg{width:72px;height:72px;border-radius:50%;background:var(--red);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:22px;flex-shrink:0;border:3px solid var(--rs);overflow:hidden;position:relative;cursor:pointer;transition:filter .15s;}
.avlg:hover{filter:brightness(.85);}
.avlg img{width:100%;height:100%;object-fit:cover;border-radius:50%;}
.avlg .av-cam{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;border-radius:50%;opacity:0;transition:opacity .15s;font-size:18px;}
.avlg:hover .av-cam{opacity:1;}
/* nav avatar pequeño */
.nav-av-wrap{width:32px;height:32px;border-radius:50%;background:var(--red);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:11px;cursor:pointer;overflow:hidden;flex-shrink:0;}
.nav-av-wrap img{width:100%;height:100%;object-fit:cover;border-radius:50%;}
.pn{font-size:20px;font-weight:900;}
.pnid{font-size:11px;color:var(--tm);font-weight:700;margin-top:2px;}
.ponl{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;color:#16a34a;background:#f0fdf4;padding:2px 9px;border-radius:20px;margin-top:5px;}
.sbox{background:white;border-radius:var(--rlg);padding:1.25rem;box-shadow:0 2px 10px rgba(0,0,0,.07);margin-bottom:1.1rem;}
.sbox h3{font-size:14px;font-weight:800;margin-bottom:.9rem;padding-bottom:.65rem;border-bottom:2px solid var(--gb);}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
@media(max-width:580px){.fr{grid-template-columns:1fr;}}
.fg2{display:flex;flex-direction:column;gap:4px;}
.lbl{font-size:10px;font-weight:800;color:var(--tm);text-transform:uppercase;letter-spacing:.8px;}
.inp{padding:9px 12px;border:2px solid var(--gm);border-radius:var(--rmd);font-family:var(--font);font-size:13px;color:var(--tx);background:white;outline:none;transition:border .15s;width:100%;}
.inp:focus{border-color:var(--red);}
select.inp{cursor:pointer;}
.sr{display:flex;justify-content:flex-end;margin-top:.9rem;}
.bsv{padding:9px 22px;background:var(--red);color:white;border:none;border-radius:var(--rmd);font-family:var(--font);font-weight:800;font-size:13px;cursor:pointer;transition:background .15s;}
.bsv:hover{background:var(--rd);}
.bor{padding:9px 16px;background:white;color:var(--red);border:2px solid var(--red);border-radius:var(--rmd);font-family:var(--font);font-weight:800;font-size:13px;cursor:pointer;transition:all .15s;}
.bor:hover{background:var(--rs);}

/* FRIENDS */
.fbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:10px;}
.far{display:flex;gap:8px;}
.fi4{padding:8px 12px;border:2px solid var(--gm);border-radius:var(--rmd);font-family:var(--font);font-size:12px;color:var(--tx);background:white;outline:none;transition:border .15s;min-width:190px;}
.fi4:focus{border-color:var(--blu);}
.fgrd{display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:10px;}
.fcard{background:white;border-radius:var(--rlg);padding:.85rem 1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);display:flex;align-items:center;gap:9px;}
.avmd{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:13px;flex-shrink:0;overflow:hidden;position:relative;}
.avmd img{width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;}
.fn{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fst{font-size:11px;color:var(--tm);margin-top:1px;}.fst.ig{color:#16a34a;font-weight:700;}
.bism{padding:4px 8px;border:1.5px solid var(--gm);border-radius:var(--rsm);background:white;font-family:var(--font);font-size:10px;font-weight:800;cursor:pointer;transition:all .15s;color:var(--tx);}
.bism:hover{border-color:var(--red);color:var(--red);background:var(--rs);}
.emp{text-align:center;padding:2.5rem 1rem;color:var(--tm);}
.emp svg{width:40px;height:40px;margin-bottom:.6rem;opacity:.2;}
.emp p{font-size:13px;font-weight:800;}

/* ADMIN */
.abar{display:flex;gap:9px;margin-bottom:1.25rem;flex-wrap:wrap;}
.sfi{flex:1;min-width:200px;padding:9px 12px;border:2px solid var(--gm);border-radius:var(--rmd);font-family:var(--font);font-size:13px;color:var(--tx);outline:none;transition:border .15s;}
.sfi:focus{border-color:var(--red);}
.tbox{background:white;border-radius:var(--rlg);box-shadow:0 2px 10px rgba(0,0,0,.07);overflow:hidden;overflow-x:auto;}
table{width:100%;border-collapse:collapse;min-width:600px;}
th{padding:10px 14px;text-align:left;font-size:10px;font-weight:800;color:var(--tm);text-transform:uppercase;letter-spacing:.8px;background:var(--gb);border-bottom:2px solid var(--gm);}
td{padding:11px 14px;font-size:12px;border-bottom:1px solid var(--gb);vertical-align:middle;}
tr:last-child td{border-bottom:none;}tr:hover td{background:var(--gb);}
.pill{padding:2px 9px;border-radius:20px;font-size:10px;font-weight:800;}
.pill.ac{background:#f0fdf4;color:#16a34a;}.pill.bn{background:var(--rs);color:var(--rd);}.pill.adm{background:var(--bs);color:var(--bd);}

/* SISTEMA (update desde Forgejo) */
.sys-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:1.1rem;}
@media(max-width:700px){.sys-grid{grid-template-columns:1fr;}}
.sys-card{background:white;border-radius:var(--rlg);padding:1.25rem;box-shadow:0 2px 10px rgba(0,0,0,.07);}
.sys-card h4{font-size:13px;font-weight:800;margin-bottom:.9rem;padding-bottom:.6rem;border-bottom:2px solid var(--gb);}
.sys-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px;}
.sys-row .key{color:var(--tm);font-weight:700;}
.sys-row .val{font-weight:800;font-family:monospace;font-size:11px;}
.log-box{background:#0f0f1a;border-radius:var(--rmd);padding:1rem;font-family:monospace;font-size:11px;color:#a8b4c8;line-height:1.7;max-height:280px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;}
.update-btn{width:100%;padding:12px;background:var(--red);color:white;border:none;border-radius:var(--rmd);font-family:var(--font);font-weight:900;font-size:14px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px;}
.update-btn:hover{background:var(--rd);}
.update-btn:disabled{opacity:.5;cursor:not-allowed;}
.update-btn.success{background:#15803d;}
.sys-badge{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:800;}
.sys-badge.ok{background:#f0fdf4;color:#16a34a;}
.sys-badge.err{background:var(--rs);color:var(--rd);}
.sys-badge.dev{background:var(--bs);color:var(--bd);}

/* AUTH OVERLAY */
.awrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;background:var(--gb);}
.acard{background:white;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.12);padding:2.25rem;width:100%;max-width:400px;}
.abrand{text-align:center;margin-bottom:1.75rem;}
.aci{width:60px;height:60px;background:var(--red);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 11px;}
.aci svg{width:34px;height:34px;fill:white;}
.abrand h1{font-size:20px;font-weight:900;color:var(--red);}
.abrand p{font-size:12px;color:var(--tm);margin-top:3px;font-weight:500;}
.atabs{display:flex;background:var(--gb);border-radius:var(--rmd);padding:3px;margin-bottom:1.25rem;}
.atab{flex:1;padding:7px;border-radius:calc(var(--rmd) - 2px);border:none;background:transparent;font-family:var(--font);font-weight:800;font-size:13px;color:var(--tm);cursor:pointer;transition:all .15s;}
.atab.active{background:white;color:var(--red);box-shadow:0 2px 8px rgba(0,0,0,.08);}
.aform{display:flex;flex-direction:column;gap:12px;}
.aform.hidden{display:none;}
.apirow{display:flex;gap:7px;background:var(--bs);border:1.5px solid var(--blu);border-radius:var(--rmd);padding:8px 11px;align-items:center;margin-bottom:3px;}
.apirow span{font-size:10px;font-weight:800;color:var(--bd);white-space:nowrap;}
.apirow input{flex:1;border:1.5px solid var(--blu);border-radius:4px;padding:4px 7px;font-family:var(--font);font-size:11px;outline:none;}
.bapi{padding:4px 11px;background:var(--blu);color:white;border:none;border-radius:4px;font-family:var(--font);font-weight:800;font-size:11px;cursor:pointer;}
.amsg{font-size:12px;text-align:center;padding:8px;border-radius:var(--rsm);display:none;font-weight:700;}
.amsg.error{background:var(--rs);color:var(--rd);display:block;}
.amsg.success{background:#f0fdf4;color:#15803d;display:block;}
.bfull{width:100%;padding:12px;background:var(--red);color:white;border:none;border-radius:var(--rmd);font-family:var(--font);font-weight:900;font-size:15px;cursor:pointer;transition:background .15s;}
.bfull:hover{background:var(--rd);}
.blnk{background:none;border:none;font-family:var(--font);font-size:12px;color:var(--tm);cursor:pointer;padding:3px;margin-top:2px;}

/* STATUS PÚBLICO */
.pub-svc{background:white;border-radius:var(--rlg);padding:1rem 1.2rem;box-shadow:0 2px 8px rgba(0,0,0,.06);display:flex;align-items:center;gap:10px;}
.pub-icon{font-size:20px;flex-shrink:0;}
.pub-info{flex:1;min-width:0;}
.pub-name{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pub-desc{font-size:11px;color:var(--tm);font-weight:500;}
.pub-stat{display:flex;align-items:center;gap:5px;flex-shrink:0;}
.pub-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.pub-dot.on{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.5);}
.pub-dot.off{background:var(--red);animation:pulse 2s infinite;}
.pub-svc.game-svc{border-left:3px solid var(--red);}
.pub-lat{font-size:10px;font-weight:800;color:var(--tm);}

/* TOAST */
.toast{position:fixed;bottom:1.75rem;right:1.75rem;padding:11px 17px;background:var(--gd);color:white;border-radius:var(--rmd);font-size:13px;font-weight:800;z-index:9999;transform:translateY(60px);opacity:0;transition:all .25s cubic-bezier(.34,1.56,.64,1);box-shadow:0 8px 24px rgba(0,0,0,.2);}
.toast.show{transform:translateY(0);opacity:1;}
.toast.success{background:#15803d;}.toast.error{background:var(--rd);}

/* MODAL */
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:3000;display:none;align-items:center;justify-content:center;padding:1rem;}
.mbg.open{display:flex;}
.mbox{background:white;border-radius:var(--rlg);padding:1.75rem;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.2);}
.mbox h3{font-size:16px;font-weight:900;margin-bottom:1.1rem;}
.macts{display:flex;gap:9px;justify-content:flex-end;margin-top:1.1rem;}
.bdng{padding:9px 17px;background:var(--red);color:white;border:none;border-radius:var(--rmd);font-family:var(--font);font-weight:800;font-size:13px;cursor:pointer;}
.bcnc{padding:9px 17px;background:white;color:var(--tx);border:2px solid var(--gm);border-radius:var(--rmd);font-family:var(--font);font-weight:700;font-size:13px;cursor:pointer;}

/* CHAT */
.chat-wrap{display:flex;height:calc(100vh - 148px);min-height:320px;border:2px solid var(--gm);border-radius:var(--rlg);overflow:hidden;}
.chat-sidebar{width:230px;min-width:150px;border-right:2px solid var(--gb);display:flex;flex-direction:column;background:var(--gb);}
.chat-sb-hdr{padding:.65rem 1rem;font-size:12px;font-weight:900;color:var(--tx);border-bottom:2px solid var(--gm);display:flex;justify-content:space-between;align-items:center;}
.chat-room-item{padding:.65rem 1rem;cursor:pointer;border-bottom:1px solid rgba(0,0,0,.06);transition:background .12s;display:flex;flex-direction:column;gap:2px;border-left:3px solid transparent;}
.chat-room-item:hover{background:rgba(255,255,255,.7);}
.chat-room-item.active{background:var(--wh);border-left-color:var(--red);}
.chat-room-name{font-size:13px;font-weight:800;color:var(--tx);display:flex;align-items:center;gap:5px;}
.chat-room-preview{font-size:11px;color:var(--tm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.chat-badge{background:var(--red);color:white;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:900;line-height:1.4;}
.chat-main{flex:1;display:flex;flex-direction:column;min-width:0;background:var(--wh);}
.chat-hdr{padding:.7rem 1rem;border-bottom:2px solid var(--gb);font-size:14px;font-weight:900;color:var(--tx);display:flex;align-items:center;gap:7px;}
.chat-msgs{flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.45rem;}
.chat-msg{display:flex;flex-direction:column;max-width:70%;word-break:break-word;}
.chat-msg.mine{align-self:flex-end;align-items:flex-end;}
.chat-msg.theirs{align-self:flex-start;}
.chat-bubble{padding:.55rem .9rem;border-radius:var(--rlg);font-size:14px;line-height:1.5;}
.chat-msg.mine .chat-bubble{background:var(--red);color:white;border-bottom-right-radius:4px;}
.chat-msg.theirs .chat-bubble{background:var(--gb);color:var(--tx);border-bottom-left-radius:4px;}
.chat-meta{font-size:10px;color:var(--tm);margin-top:2px;}
.chat-bar{padding:.65rem 1rem;border-top:2px solid var(--gb);display:flex;gap:8px;background:var(--wh);}
.chat-inp{flex:1;padding:.55rem .85rem;border:2px solid var(--gm);border-radius:var(--rmd);font-family:var(--font);font-size:14px;outline:none;transition:border-color .15s;}
.chat-inp:focus{border-color:var(--red);}
.chat-send{padding:.55rem 1.1rem;background:var(--red);color:white;border:none;border-radius:var(--rmd);font-family:var(--font);font-weight:800;font-size:13px;cursor:pointer;transition:background .15s;}
.chat-send:hover{background:var(--rd);}
.chat-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--tm);font-size:14px;font-weight:700;gap:.6rem;}
</style>
</head>
<body>

<!-- ─── LANDING NAV ─── -->
<nav class="nav" id="lnav">
  <a class="nl" href="#">
    <div class="lm"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg></div>
    <div class="lt">NeXoNetwork</div>
  </a>
  <div class="nav-links">
    <a class="nla" href="#feat">Características</a>
    <a class="nla" href="#api2">API</a>
    <a class="nla" href="#compat">Compatibilidad</a>
    <a class="nla" href="#plans">Planes</a>
    <a class="nla" href="#roadmap">Progreso</a>
    <a class="nla" href="/emulator" target="_blank">Emulador</a>
  </div>
  <button class="ncta" onclick="openApp()">Portal →</button>
</nav>

<!-- ─── HERO ─── -->
<section class="hero">
  <div class="hbg"></div><div class="jdl"></div><div class="jdr"></div>
  <div class="hbadge" id="hero-badge"><span class="bdot"></span>Comprobando servidores...</div>
  <h1><span style="color:var(--red);">Online gaming</span><br><span>sin límites.</span><br><span style="color:var(--blu);">Open source.</span></h1>
  <p>Reemplazo open source de Nintendo Switch Online. Compatible con NeXoEmulator y el protocolo RaptorNetwork. Cuentas, amigos, presencia — todo bajo tu control.</p>
  <div class="hbtns">
    <button class="bpr" onclick="openApp()"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>Crear cuenta</button>
    <a class="bsc" href="https://github.com/Jous99/NeXo-Server" target="_blank"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.929.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>GitHub</a>
  </div>
  <div class="cw">
    <div class="cf">
      <div class="jcl"></div>
      <div class="cs">
        <div class="csl">NeXo<span>Network</span></div>
        <div class="csp">
          <div class="cpp on"><span style="width:5px;height:5px;border-radius:50%;background:#4ade80;display:inline-block;"></span>Accounts Online</div>
          <div class="cpp bl"><span style="width:5px;height:5px;border-radius:50%;background:var(--blu);display:inline-block;"></span>Friends Online</div>
          <div class="cpp gr">v1.0.0 · Protocol 1</div>
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,.3);font-weight:700;margin-top:5px;">nexonetwork.space — Open Switch Online Replacement</div>
      </div>
      <div class="jcr"></div>
    </div>
  </div>
</section>

<div class="jcd"></div>
<div class="sbar">
  <div class="si"><div class="sn r">100%</div><div class="sl">Open Source</div></div>
  <div class="si"><div class="sn b">/api/v1</div><div class="sl">Compatible Raptor</div></div>
  <div class="si"><div class="sn g">GPL-2</div><div class="sl">Licencia libre</div></div>
  <div class="si"><div class="sn y">Fastify</div><div class="sl">Node.js + MySQL</div></div>
</div>
<div class="jcd"></div>

<!-- FEATURES -->
<section class="fbg" id="feat">
  <div class="cnt">
    <div class="slbl">Características</div>
    <div class="stit">Todo lo que necesitas<br>para jugar online.</div>
    <div class="fg">
      <div class="fc"><div class="fi r"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div><h3>Cuentas & Auth</h3><p>Registro, login con JWT + refresh tokens. NexoID único. Compatible con <code style="background:var(--gb);padding:1px 5px;border-radius:3px;font-size:11px;color:var(--red);">/api/v1/user/authenticate</code>.</p></div>
      <div class="fc"><div class="fi b"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div><h3>Lista de amigos</h3><p>Solicitudes, aceptar, rechazar, bloquear. Estado online visible desde el emulador en tiempo real.</p></div>
      <div class="fc"><div class="fi g"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg></div><h3>Presencia en juego</h3><p>El emulador reporta qué juego está activo. Tus amigos ven tu estado: online, in_game o desconectado.</p></div>
      <div class="fc"><div class="fi a"><svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg></div><h3>Panel de admin</h3><p>Gestión de usuarios, ban/unban, stats globales. Y actualizaciones del servidor desde la web sin tocar SSH.</p></div>
      <div class="fc"><div class="fi r"><svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg></div><h3>Sesiones seguras</h3><p>Access token 15min + refresh 30 días. Stored hashed (SHA-256). Logout global de todas las sesiones.</p></div>
      <div class="fc"><div class="fi b"><svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/></svg></div><h3>Arquitectura modular</h3><p>Cada juego que necesite servidor propio se añade como módulo independiente sin tocar el resto.</p></div>
    </div>
  </div>
</section>

<!-- API -->
<section class="apibg" id="api2">
  <div class="cnt">
    <div class="slbl">API Reference</div>
    <div class="stit">Endpoints disponibles.</div>
    <div class="ssub"><code style="color:var(--blu);background:rgba(255,255,255,.08);padding:2px 7px;border-radius:3px;font-size:12px;">/api/v1/*</code> para el emulador. El resto para la web.</div>
    <div class="epg">
      <div class="ep"><span class="em b">GET</span><div class="ep-p">/api/v1/server/info</div><div class="ep-d">Info y MOTD</div></div>
      <div class="ep"><span class="em g">POST</span><div class="ep-p">/api/v1/user/authenticate</div><div class="ep-d">Login emulador</div></div>
      <div class="ep"><span class="em g">POST</span><div class="ep-p">/api/v1/user/register</div><div class="ep-d">Registro</div></div>
      <div class="ep"><span class="em b">GET</span><div class="ep-p">/api/v1/friends</div><div class="ep-d">Amigos con estado</div></div>
      <div class="ep"><span class="em g">POST</span><div class="ep-p">/api/v1/presence</div><div class="ep-d">Estado en juego</div></div>
      <div class="ep"><span class="em g">POST</span><div class="ep-p">/auth/login</div><div class="ep-d">Login web</div></div>
      <div class="ep"><span class="em g">POST</span><div class="ep-p">/auth/register</div><div class="ep-d">Registro web</div></div>
      <div class="ep"><span class="em y">PATCH</span><div class="ep-p">/profile/me</div><div class="ep-d">Editar perfil</div></div>
      <div class="ep"><span class="em b">GET</span><div class="ep-p">/admin/users</div><div class="ep-d">Listar usuarios</div></div>
      <div class="ep"><span class="em g">POST</span><div class="ep-p">/admin/users/:id/ban</div><div class="ep-d">Banear usuario</div></div>
      <div class="ep"><span class="em b">GET</span><div class="ep-p">/admin/system/status</div><div class="ep-d">Estado del servidor</div></div>
      <div class="ep"><span class="em g">POST</span><div class="ep-p">/admin/system/update</div><div class="ep-d">Pull desde Forgejo</div></div>
      <div class="ep"><span class="em b">GET</span><div class="ep-p">/admin/system/logs</div><div class="ep-d">Logs de actualización</div></div>
      <div class="ep"><span class="em b">GET</span><div class="ep-p">/health</div><div class="ep-d">Health check</div></div>
    </div>
  </div>
</section>

<div class="jcd"></div>

<!-- STATUS PÚBLICO -->
<section id="status-pub" style="background:var(--gb);padding:3.5rem 2rem;">
  <div class="cnt">
    <div class="slbl">Estado en tiempo real</div>
    <div class="stit" style="margin-bottom:.5rem;">Estado de los servidores</div>
    <p style="font-size:14px;color:var(--tm);margin-bottom:1.75rem;font-weight:500;">Comprobando disponibilidad de todos los servicios y módulos de juego...</p>
    <div id="pub-svgrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:11px;margin-bottom:1rem;"></div>
    <p style="font-size:11px;color:var(--tm);text-align:right;" id="pub-lcheck">Comprobando...</p>
  </div>
</section>

<!-- COMPAT -->
<section id="compat">
  <div class="cnt">
    <div class="slbl">Compatibilidad</div>
    <div class="stit">¿Con qué funciona?</div>
    <div class="cg">
      <div class="cc"><div class="ci">🦕</div><div class="cn">NeXoEmulator</div><div class="cd">Emulador Yuzu con red integrada</div><span class="cb y">Compatible</span></div>
      <div class="cc"><div class="ci">🦅</div><div class="cn">RaptorNetwork</div><div class="cd">Protocolo /api/v1 completo</div><span class="cb y">Compatible</span></div>
      <div class="cc"><div class="ci">🐧</div><div class="cn">Linux / VPS</div><div class="cd">aaPanel + Node Project</div><span class="cb y">Soportado</span></div>
      <div class="cc"><div class="ci">🃏</div><div class="cn">Matchmaking</div><div class="cd">Salas de juego</div><span class="cb w">En desarrollo</span></div>
      <div class="cc"><div class="ci">💬</div><div class="cn">Chat</div><div class="cd">Mensajería entre amigos</div><span class="cb s">Próximamente</span></div>
    </div>
  </div>
</section>

<!-- ══ PLANES ══ -->
<section id="plans">
  <div class="cnt">
    <div class="plans-head">
      <p class="ptag">Planes & Precios</p>
      <h2>Elige tu plan de <span style="color:var(--red)">NeXo Network</span></h2>
      <p>Empieza gratis y actualiza cuando quieras. Todos los planes incluyen acceso al emulador y a los servidores online de nexonetwork.space.</p>
    </div>

    <!-- Toggle mensual/anual -->
    <div class="pbill">
      <span>Mensual</span>
      <button class="ptog" id="ptog" onclick="togglePBill()"><div class="ptogk"></div></button>
      <span>Anual <span class="psave">Ahorra 20%</span></span>
    </div>

    <!-- Tarjetas -->
    <div class="pgrid" id="pgrid">

      <!-- FREE -->
      <div class="pc">
        <div class="pico">⭐</div>
        <div class="pname" style="color:var(--blu)">Free</div>
        <p class="ptag2">Todo lo que necesitas para jugar online.<br>Sin tarjeta de crédito.</p>
        <div class="pprice">
          <div class="pmo">
            <span class="cur">€</span><span class="amount">0</span>
            <p class="per">Para siempre gratis</p>
          </div>
          <div class="pyr">
            <span class="cur">€</span><span class="amount">0</span>
            <p class="per">Para siempre gratis</p>
          </div>
        </div>
        <div class="pdiv"></div>
        <ul class="pfl">
          <li><span class="pchk y">✓</span><span class="pl">Acceso online completo al emulador</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Lista de amigos ilimitada</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Notificaciones en tiempo real</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Todos los juegos compatibles con NeXo</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Estadísticas de partidas</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Badge ⭐ Free en el perfil</span></li>
        </ul>
        <button class="pcta" onclick="openApp()">Crear cuenta gratis</button>
        <p class="pnote">Sin límite de tiempo</p>
      </div>

      <!-- PRO -->
      <div class="pc hot">
        <div class="pop-tag">⚡ Más popular</div>
        <div class="pico">💎</div>
        <div class="pname" style="color:var(--red)">Pro</div>
        <p class="ptag2">Todo lo de Free más extras exclusivos que no afectan al juego.</p>
        <div class="pprice">
          <div class="pmo">
            <span class="cur">€</span><span class="amount" style="color:var(--red)">4<span style="font-size:24px">.99</span></span>
            <p class="per">por mes, facturado mensualmente</p>
          </div>
          <div class="pyr">
            <span class="cur">€</span><span class="amount" style="color:var(--red)">3<span style="font-size:24px">.99</span></span>
            <p class="per">por mes · <strong style="color:#16a34a">€47.88/año</strong> (ahorra €12)</p>
          </div>
        </div>
        <div class="pdiv"></div>
        <ul class="pfl">
          <li><span class="pchk y">✓</span><span class="pl">Todo lo del plan Free</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Badge 💎 Pro exclusivo en el perfil</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Acceso anticipado a betas de nuevos juegos</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Color de nombre personalizado en el perfil</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Canal VIP exclusivo en Discord</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Soporte por email prioritario</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Tu nombre en la sección Supporters de la web</span></li>
        </ul>
        <button class="pcta red" onclick="alert('Próximamente — sistema de pago en desarrollo')">Obtener Pro</button>
        <p class="pnote">Cancela cuando quieras</p>
      </div>

      <!-- PATRON -->
      <div class="pc">
        <div class="pico">👑</div>
        <div class="pname" style="color:#a855f7">Patron</div>
        <p class="ptag2">Para quienes quieren apoyar el proyecto y dejar huella en NeXo Network.</p>
        <div class="pprice">
          <div class="pmo">
            <span class="cur">€</span><span class="amount" style="color:#a855f7">9<span style="font-size:24px">.99</span></span>
            <p class="per">por mes, facturado mensualmente</p>
          </div>
          <div class="pyr">
            <span class="cur">€</span><span class="amount" style="color:#a855f7">7<span style="font-size:24px">.99</span></span>
            <p class="per">por mes · <strong style="color:#16a34a">€95.88/año</strong> (ahorra €24)</p>
          </div>
        </div>
        <div class="pdiv"></div>
        <ul class="pfl">
          <li><span class="pchk y">✓</span><span class="pl">Todo lo del plan Pro</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Badge 👑 Patron animado en el perfil</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Tu nombre en los créditos del proyecto</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Voto en nuevas características del servidor</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Acceso a canales privados del equipo</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Mención en changelogs y actualizaciones</span></li>
          <li><span class="pchk y">✓</span><span class="pl">Apoyas directamente el servidor ❤️</span></li>
        </ul>
        <button class="pcta" style="border-color:#a855f7;color:#a855f7;" onclick="alert('Próximamente — contacta por Discord')">Ser Patron</button>
        <p class="pnote">Gracias por apoyar el proyecto</p>
      </div>

    </div><!-- /pgrid -->

    <!-- Tabla comparativa -->
    <div class="ctbl-wrap">
      <h3>Comparativa de planes</h3>
      <table class="ctbl">
        <thead>
          <tr>
            <th>Característica</th>
            <th style="color:var(--blu)">⭐ Free</th>
            <th style="color:var(--red)">💎 Pro</th>
            <th style="color:#a855f7">👑 Patron</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Acceso online al emulador</td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Amigos ilimitados</td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Notificaciones en tiempo real</td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Todos los juegos compatibles</td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Estadísticas de partidas</td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Badge en el perfil</td><td>⭐ Free</td><td>💎 Pro</td><td>👑 Patron</td></tr>
          <tr><td>Acceso anticipado a betas</td><td><span class="cx">✗</span></td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Color de nombre personalizado</td><td><span class="cx">✗</span></td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Canal VIP en Discord</td><td><span class="cx">✗</span></td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Nombre en Supporters</td><td><span class="cx">✗</span></td><td><span class="ck">✓</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Nombre en créditos del proyecto</td><td><span class="cx">✗</span></td><td><span class="cx">✗</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Voto en nuevas características</td><td><span class="cx">✗</span></td><td><span class="cx">✗</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Canales privados del equipo</td><td><span class="cx">✗</span></td><td><span class="cx">✗</span></td><td><span class="ck">✓</span></td></tr>
          <tr><td>Soporte</td><td>Comunidad</td><td>Email prioritario</td><td>Equipo directo</td></tr>
          <tr><td><strong>Precio mensual</strong></td><td><strong style="color:var(--blu)">Gratis</strong></td><td><strong style="color:var(--red)">€4.99/mes</strong></td><td><strong style="color:#a855f7">€9.99/mes</strong></td></tr>
        </tbody>
      </table>
    </div>

    <!-- FAQ -->
    <div class="pfaq">
      <h3>Preguntas frecuentes</h3>
      <div class="fqg">
        <div class="fqi"><h4>¿El plan Free incluye todo el online?</h4><p>Sí. El plan Free tiene acceso completo al emulador online: amigos ilimitados, todos los juegos, notificaciones y estadísticas. Sin restricciones de juego.</p></div>
        <div class="fqi"><h4>¿Qué diferencia al Pro del Free?</h4><p>El Pro añade extras exclusivos que no afectan al juego: badge Pro, acceso a betas, color de nombre personalizado, canal VIP en Discord y soporte prioritario.</p></div>
        <div class="fqi"><h4>¿Cómo cancelo mi suscripción?</h4><p>Puedes cancelar en cualquier momento desde tu panel de usuario. Seguirás teniendo acceso hasta el final del período facturado.</p></div>
        <div class="fqi"><h4>¿Cómo se actualiza mi badge en el emulador?</h4><p>El badge se actualiza al reconectar. Si lo cambiaste hace poco, cierra sesión en NexoEmu y vuelve a conectar.</p></div>
        <div class="fqi"><h4>¿Qué métodos de pago aceptáis?</h4><p>Próximamente tarjeta de crédito/débito y PayPal. El sistema de pagos está en desarrollo activo.</p></div>
        <div class="fqi"><h4>¿Qué es el plan Patron?</h4><p>Es para quienes quieren apoyar directamente el proyecto. Obtienes el badge 👑, nombre en créditos, voto en nuevas funciones y acceso a canales privados del equipo.</p></div>
      </div>
    </div>

  </div>
</section>

<!-- ══ ROADMAP / PROGRESO ══ -->
<section id="roadmap">
  <div class="cnt">
    <div class="rdhead">
      <p class="rtag">Estado del desarrollo</p>
      <div class="vbadge"><span>●</span> v0.8.0-alpha — En desarrollo activo</div>
      <h2>Progreso de <span style="color:var(--red)">NeXo Network</span></h2>
      <p>Seguimiento en tiempo real de todo lo que está implementado, en desarrollo o pendiente — tanto para el emulador como para la Switch real.</p>
    </div>

    <!-- Barra de progreso global -->
    <p class="gbar-label">Progreso global del proyecto — 57%</p>
    <div class="gbar-wrap"><div class="gbar" style="width:57%"></div></div>

    <!-- Leyenda -->
    <div class="rdlegend">
      <span><span class="ll done"></span>Implementado</span>
      <span><span class="ll wip"></span>En progreso</span>
      <span><span class="ll todo"></span>Pendiente</span>
    </div>

    <!-- Grid de categorías -->
    <div class="rdgrid">

      <!-- 🔐 Autenticación -->
      <div class="rdc">
        <div class="rdchead">
          <div class="rdcico red">🔐</div>
          <div><div class="rdctitle">Autenticación & Cuentas</div><div class="rdcsub">Login, tokens, Nintendo auth</div></div>
        </div>
        <div class="mbar-wrap"><div class="mbar red" style="width:86%"></div></div>
        <div class="rditems">
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Login con usuario y contraseña</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Registro de cuenta nueva</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Refresh automático de token JWT</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">dauth — device_auth_token (Switch)</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">aauth — application_auth_token (Switch)</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">BAAS Login — token de usuario NPLN</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Nintendo Accounts /connect/1.0.0/api/token</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Planes de suscripción (Free/Pro/Patron)</span></div>
          <div class="rdi"><span class="rdibadge wip">⚡</span><span class="rdilabel">OAuth2 completo para Nintendo accounts</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">Verificación de email</span></div>
        </div>
      </div>

      <!-- 👥 Social -->
      <div class="rdc">
        <div class="rdchead">
          <div class="rdcico blu">👥</div>
          <div><div class="rdctitle">Social</div><div class="rdcsub">Amigos, chat DMs, presencia</div></div>
        </div>
        <div class="mbar-wrap"><div class="mbar blu" style="width:72%"></div></div>
        <div class="rditems">
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Ver lista de amigos (emulador)</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Enviar solicitud de amistad</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Aceptar / rechazar solicitudes</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Presencia online (qué juego juegas)</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Estado offline / online / in_game</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Chat DM en tiempo real (WebSocket)</span></div>
          <div class="rdi"><span class="rdibadge wip">⚡</span><span class="rdilabel">Nintendo friends HTTP API (Switch real)</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">Invitaciones a partida</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">NEX Friends protocol (Switch OS nativa)</span></div>
        </div>
      </div>

      <!-- 🔔 Notificaciones -->
      <div class="rdc">
        <div class="rdchead">
          <div class="rdcico grn">🔔</div>
          <div><div class="rdctitle">Notificaciones</div><div class="rdcsub">WebSocket, push, tiempo real</div></div>
        </div>
        <div class="mbar-wrap"><div class="mbar grn" style="width:78%"></div></div>
        <div class="rditems">
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">WebSocket en tiempo real</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Toast: amigo conectado</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Toast: solicitud de amistad recibida</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Toast: amigo empieza a jugar</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Toast: nuevo mensaje de chat</span></div>
          <div class="rdi"><span class="rdibadge wip">⚡</span><span class="rdilabel">BCAT — noticias del juego en Switch</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">Push notifications nativas Switch</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">Historial de notificaciones</span></div>
        </div>
      </div>

      <!-- 🎮 Online en juegos -->
      <div class="rdc">
        <div class="rdchead">
          <div class="rdcico red">🎮</div>
          <div><div class="rdctitle">Online en Juegos</div><div class="rdcsub">SMM2, matchmaking, DataStore</div></div>
        </div>
        <div class="mbar-wrap"><div class="mbar red" style="width:28%"></div></div>
        <div class="rditems">
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Redirección DNS automática (emulador)</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">URL rewrites Nintendo → NeXo</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">SMM2 — endpoints REST (subir/bajar niveles)</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Estado por título (qué juegos tienen online)</span></div>
          <div class="rdi"><span class="rdibadge wip">⚡</span><span class="rdilabel">SMM2 DataStore protocolo Nintendo</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">NPLN gRPC (matchmaking moderno)</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">NEX / Rendez-Vous (protocolo legado)</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">Salas de juego multijugador</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">Leaderboards / rankings</span></div>
        </div>
      </div>

      <!-- 🌐 Infraestructura -->
      <div class="rdc">
        <div class="rdchead">
          <div class="rdcico yel">🌐</div>
          <div><div class="rdctitle">Infraestructura</div><div class="rdcsub">Servidor, SSL, base de datos</div></div>
        </div>
        <div class="mbar-wrap"><div class="mbar yel" style="width:55%"></div></div>
        <div class="rditems">
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Servidor Node.js + Fastify</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Base de datos MySQL</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Routing por subdominio automático</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">nexonetwork.space en producción</span></div>
          <div class="rdi"><span class="rdibadge wip">⚡</span><span class="rdilabel">CA propia + HTTPS compatible Switch</span></div>
          <div class="rdi"><span class="rdibadge wip">⚡</span><span class="rdilabel">Generación automática de certificados SSL</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">Panel de administración web</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">Monitoreo / métricas del servidor</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">Sistema de pagos (Stripe/PayPal)</span></div>
        </div>
      </div>

      <!-- 🕹️ Switch Real -->
      <div class="rdc">
        <div class="rdchead">
          <div class="rdcico pur">🕹️</div>
          <div><div class="rdctitle">Switch Real (CFW)</div><div class="rdcsub">Atmosphere, DNS, certificados</div></div>
        </div>
        <div class="mbar-wrap"><div class="mbar pur" style="width:35%"></div></div>
        <div class="rditems">
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">dauth / aauth stubs (device & app token)</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">BAAS stub (token de usuario NPLN)</span></div>
          <div class="rdi"><span class="rdibadge done">✓</span><span class="rdilabel">Nintendo Accounts stub (token exchange)</span></div>
          <div class="rdi"><span class="rdibadge wip">⚡</span><span class="rdilabel">CA raíz + certificado SSL compatible Switch</span></div>
          <div class="rdi"><span class="rdibadge wip">⚡</span><span class="rdilabel">Nintendo friends HTTP API</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">Guía de DNS personalizado (Pi-hole / router)</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">NEX Friends protocol completo</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">NPLN gRPC completo</span></div>
          <div class="rdi"><span class="rdibadge todo">·</span><span class="rdilabel dim">Online en juegos reales (NEX/NPLN)</span></div>
        </div>
      </div>

    </div><!-- /rdgrid -->

    <!-- Guía de conexión Switch real -->
    <div style="margin-top:3rem;background:var(--gb);border-radius:var(--rlg);padding:2rem;">
      <h3 style="font-size:18px;font-weight:900;margin-bottom:.5rem;">🕹️ Cómo conectar tu Switch modificada</h3>
      <p style="font-size:13px;color:var(--tm);margin-bottom:1.5rem;">Pasos necesarios para que una Switch con Atmosphere se conecte a nexonetwork.space</p>
      <div class="sw-steps">
        <div class="sw-step">
          <div class="snum">1</div>
          <span class="stag done">Disponible</span>
          <h4>Instalar CFW</h4>
          <p>Atmosphere 1.x en tu Switch. Necesario para instalar certificados personalizados y redirigir el tráfico SSL.</p>
        </div>
        <div class="sw-step">
          <div class="snum">2</div>
          <span class="stag wip">En progreso</span>
          <h4>Certificado SSL propio</h4>
          <p>Generar una CA raíz y un certificado que cubra <code style="font-size:10px;background:white;padding:1px 4px;border-radius:3px;">*.nintendo.net</code> y <code style="font-size:10px;background:white;padding:1px 4px;border-radius:3px;">*.nexonetwork.space</code>. Instalar en <code style="font-size:10px;background:white;padding:1px 4px;border-radius:3px;">SD:/atmosphere/config/ssl/</code></p>
        </div>
        <div class="sw-step">
          <div class="snum">3</div>
          <span class="stag todo">Pendiente guía</span>
          <h4>DNS personalizado</h4>
          <p>Configurar el router o usar Pi-hole para redirigir los dominios de Nintendo a la IP de nexonetwork.space.</p>
        </div>
        <div class="sw-step">
          <div class="snum">4</div>
          <span class="stag done">Implementado</span>
          <h4>Auth completa</h4>
          <p>dauth, aauth y BAAS ya están implementados. Tu Switch puede obtener todos los tokens necesarios para el online.</p>
        </div>
        <div class="sw-step">
          <div class="snum">5</div>
          <span class="stag wip">En progreso</span>
          <h4>Lista de amigos</h4>
          <p>Implementando la Nintendo friends HTTP API para que la lista de amigos funcione en la Switch real.</p>
        </div>
        <div class="sw-step">
          <div class="snum">6</div>
          <span class="stag todo">Futuro</span>
          <h4>Online en juegos</h4>
          <p>Requiere NEX/Rendez-Vous y NPLN gRPC. Son los protocolos más complejos del ecosistema Switch.</p>
        </div>
      </div>
    </div>

  </div>
</section>

<!-- CTA -->
<section class="ctas">
  <div class="cnt">
    <h2>¿Listo para conectar?</h2>
    <p>Crea tu cuenta, configura el emulador y empieza a jugar online.</p>
    <button class="bw" onclick="openApp()">Crear cuenta →</button>
    <a class="bo" href="https://github.com/Jous99/NeXo-Server" target="_blank">Ver el código</a>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="fi2">
    <div class="ft">
      <div class="fb"><h4>NeXoNetwork</h4><p style="font-size:12px;margin-top:.4rem;line-height:1.6;">Infraestructura open source para el ecosistema NeXo. Proyecto educativo, no afiliado con Nintendo.</p></div>
      <div class="fl"><h4>Proyecto</h4><a href="https://github.com/Jous99/NeXo-Server" target="_blank">NeXo-Server</a><a href="https://github.com/Jous99/NeXo-Emu" target="_blank">NeXo-Emu</a><a href="https://forgejo.joustech.space/NeXo/NeXoNetwork-Server" target="_blank">Forgejo</a></div>
      <div class="fl"><h4>Portal</h4><a href="#" onclick="openApp();return false;">Crear cuenta</a><a href="#" onclick="openApp();return false;">Iniciar sesión</a><a href="#plans">Planes</a><a href="#" onclick="openApp();return false;">Estado servidores</a></div>
    </div>
    <div class="fb2"><p style="font-size:11px;">© 2026 NeXo Team · GPL-2.0 · Proyecto educativo · No afiliado con Nintendo</p><div style="display:flex;gap:10px;"><a href="https://github.com/Jous99/NeXo-Server" target="_blank" style="color:rgba(255,255,255,.35);font-size:11px;font-weight:700;text-decoration:none;">GitHub</a><a href="https://forgejo.joustech.space" target="_blank" style="color:rgba(255,255,255,.35);font-size:11px;font-weight:700;text-decoration:none;">Forgejo</a></div></div>
  </div>
</footer>

<!-- ══ APP OVERLAY ══ -->
<div class="app-ov" id="app-ov">

  <!-- AUTH -->
  <div id="app-auth" class="awrap">
    <div class="acard">
      <div class="abrand">
        <div class="aci"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg></div>
        <h1>NeXoNetwork</h1><p>Open Nintendo Switch Online Replacement</p>
      </div>
      <div class="apirow">
        <span>API:</span>
        <input type="text" id="api-url" placeholder="https://nexonetwork.space">
        <button class="bapi" onclick="saveApi()">OK</button>
      </div>
      <div class="atabs">
        <button class="atab active" onclick="swTab('login')">Iniciar sesión</button>
        <button class="atab" onclick="swTab('register')">Registrarse</button>
      </div>
      <form class="aform" id="f-login" onsubmit="doLogin(event)">
        <div><label class="lbl">Usuario / Email / NexoID</label><input class="inp" type="text" id="li" placeholder="usuario o email" required></div>
        <div><label class="lbl">Contraseña</label><input class="inp" type="password" id="lp" placeholder="••••••••" required></div>
        <div class="amsg" id="lmsg"></div>
        <button class="bfull" type="submit" id="lbtn">Entrar</button>
        <button type="button" class="blnk" onclick="closeApp()">← Volver a la web</button>
      </form>
      <form class="aform hidden" id="f-reg" onsubmit="doReg(event)">
        <div><label class="lbl">Nombre de usuario</label><input class="inp" type="text" id="ru" placeholder="mi_usuario" required></div>
        <div><label class="lbl">Email</label><input class="inp" type="email" id="re" placeholder="tu@email.com" required></div>
        <div><label class="lbl">Apodo</label><input class="inp" type="text" id="rn" placeholder="Jugador NeXo"></div>
        <div><label class="lbl">Contraseña</label><input class="inp" type="password" id="rp" placeholder="Mínimo 8 caracteres" required></div>
        <div class="amsg" id="rmsg"></div>
        <button class="bfull" type="submit">Crear cuenta</button>
        <button type="button" class="blnk" onclick="closeApp()">← Volver a la web</button>
      </form>
    </div>
  </div>

  <!-- DASHBOARD NAV -->
  <nav class="anav" id="app-nav" style="display:none;">
    <a class="nl" href="#" onclick="closeApp();return false;" style="text-decoration:none;">
      <div class="lm"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg></div>
      <div class="lt">NeXoNetwork</div>
    </a>
    <div class="alinks">
      <button class="alink active" onclick="showP('status')">Estado</button>
      <button class="alink" onclick="showP('profile')">Perfil</button>
      <button class="alink" onclick="showP('friends')">Amigos</button>
      <button class="alink" id="chat-navbtn" onclick="showP('chat')">Chat</button>
      <button class="alink" id="admbtn" style="display:none;" onclick="showP('admin')">Usuarios</button>
      <button class="alink" id="sysbtn" style="display:none;" onclick="showP('sistema')">Sistema</button>
    </div>
    <div style="display:flex;align-items:center;gap:9px;">
      <div class="nav-av-wrap" id="nav-av" onclick="showP('profile')">NX</div>
      <button style="padding:6px 12px;background:white;color:var(--red);border:2px solid var(--red);border-radius:var(--rmd);font-family:var(--font);font-weight:800;font-size:12px;cursor:pointer;" onclick="doLogout()">Salir</button>
    </div>
  </nav>

  <!-- DASHBOARD CONTENT -->
  <div class="acnt" id="app-cnt" style="display:none;">

    <!-- STATUS -->
    <div class="apg active" id="apg-status">
      <div class="jcs"></div>
      <div class="ph">Estado de <span>Servidores</span></div>
      <div class="sgrid">
        <div class="sc"><div class="scl">Online ahora</div><div class="scv" id="s-on">—</div><div class="scs">jugadores</div></div>
        <div class="sc b"><div class="scl">Total cuentas</div><div class="scv" id="s-tot">—</div><div class="scs">registradas</div></div>
        <div class="sc g"><div class="scl">Servicios activos</div><div class="scv" id="s-up">—</div><div class="scs" id="s-total">de 9</div></div>
        <div class="sc a"><div class="scl">Latencia media</div><div class="scv" id="s-lat">—</div><div class="scs">ms</div></div>
      </div>
      <div class="ph" style="font-size:16px;margin-bottom:.9rem;">Servicios</div>
      <div class="svgrid" id="svgrid"></div>
      <p style="font-size:11px;color:var(--tm);text-align:right;" id="lcheck">Comprobando...</p>
    </div>

    <!-- PROFILE -->
    <div class="apg" id="apg-profile">
      <div class="jcs"></div>
      <!-- Input de archivo oculto -->
      <input type="file" id="av-file-input" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none" onchange="onAvatarFileChosen(this)">

      <div class="ptc">
        <div class="avlg" id="pav" onclick="document.getElementById('av-file-input').click()" title="Cambiar foto de perfil">
          <span id="pav-initials">NX</span>
          <span class="av-cam">📷</span>
        </div>
        <div>
          <div class="pn" id="pname">Cargando...</div>
          <div class="pnid" id="pnexoid">NXID-...</div>
          <div class="ponl"><span style="width:6px;height:6px;border-radius:50%;background:#22c55e;display:inline-block;"></span>En línea</div>
          <div style="font-size:11px;color:var(--tm);margin-top:4px;">Haz clic en la foto para cambiarla</div>
        </div>
      </div>
      <div class="sbox"><h3>Información de perfil</h3>
        <div class="fr">
          <div class="fg2"><label class="lbl">Apodo</label><input class="inp" id="p-nick" placeholder="Tu apodo"></div>
          <div class="fg2"><label class="lbl">Idioma</label><input class="inp" id="p-lang" placeholder="es"></div>
        </div>
        <div class="sr"><button class="bsv" onclick="saveProf()">Guardar cambios</button></div>
      </div>
      <div class="sbox"><h3>Cambiar contraseña</h3>
        <div class="fr">
          <div class="fg2"><label class="lbl">Contraseña actual</label><input class="inp" type="password" id="p-cur"></div>
          <div class="fg2"><label class="lbl">Nueva contraseña</label><input class="inp" type="password" id="p-new"></div>
        </div>
        <div class="sr"><button class="bsv" onclick="changePass()">Cambiar</button></div>
      </div>
      <div class="sbox"><h3>Estado de presencia</h3>
        <div class="fr">
          <div class="fg2"><label class="lbl">Estado</label><select class="inp" id="p-st"><option value="online">En línea</option><option value="in_game">Jugando</option><option value="offline">Desconectado</option></select></div>
          <div class="fg2"><label class="lbl">Juego actual</label><input class="inp" id="p-gm" placeholder="The Legend of Zelda..."></div>
        </div>
        <div class="sr"><button class="bsv" onclick="savePresence()">Actualizar</button></div>
      </div>
      <div class="sbox"><h3>Sesión</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="bor" onclick="doLogout()">Cerrar esta sesión</button>
          <button class="bor" onclick="logoutAll()">Cerrar todas las sesiones</button>
        </div>
      </div>
    </div>

    <!-- FRIENDS -->
    <div class="apg" id="apg-friends">
      <div class="jcs"></div>
      <div class="fbar">
        <div class="ph" style="margin:0;">Mis <span>Amigos</span></div>
        <div class="far"><input class="fi4" type="text" id="fadd" placeholder="NexoID del amigo..."><button class="bsv" onclick="addFriend()">+ Añadir</button></div>
      </div>
      <div id="psec" style="margin-bottom:1.25rem;display:none;">
        <div style="font-size:11px;font-weight:800;color:var(--tm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.65rem;">Solicitudes pendientes</div>
        <div class="fgrd" id="pgrid"></div>
      </div>
      <div style="font-size:11px;font-weight:800;color:var(--tm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.65rem;">Amigos</div>
      <div class="fgrd" id="fgrid"><div class="emp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg><p>Sin amigos aún</p></div></div>
    </div>

    <!-- CHAT -->
    <div class="apg" id="apg-chat">
      <div class="jcs"></div>
      <div class="fbar" style="margin-bottom:1rem;">
        <div class="ph" style="margin:0;">Mensajes <span>Directos</span></div>
        <div class="far"><button class="bsv" onclick="chatNewDm()">+ Nueva conversación</button></div>
      </div>
      <div class="chat-wrap">
        <div class="chat-sidebar">
          <div class="chat-sb-hdr">
            <span>Conversaciones</span>
          </div>
          <div id="chat-rooms-list" style="flex:1;overflow-y:auto;"></div>
        </div>
        <div class="chat-main" id="chat-main">
          <div class="chat-empty" id="chat-empty">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="currentColor" style="opacity:.25"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            <p>Selecciona una conversación<br>o inicia una nueva</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ADMIN USUARIOS -->
    <div class="apg" id="apg-admin">
      <div class="jcs"></div>
      <div class="ph">Gestión de <span>Usuarios</span></div>
      <div class="abar">
        <input class="sfi" type="text" placeholder="Buscar usuario, email o NexoID..." id="asrch" oninput="filterU()">
        <button class="bsv" onclick="loadAdmin()">Actualizar</button>
      </div>
      <div class="tbox"><table>
        <thead><tr><th>Usuario</th><th>NexoID</th><th>Email</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr></thead>
        <tbody id="atbody"><tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--tm);">Cargando...</td></tr></tbody>
      </table></div>
    </div>

    <!-- SISTEMA -->
    <div class="apg" id="apg-sistema">
      <div class="jcs"></div>
      <div class="ph">Sistema & <span>Actualizaciones</span></div>

      <div class="sys-grid">
        <!-- Estado del servidor -->
        <div class="sys-card">
          <h4>Estado del servidor</h4>
          <div class="sys-row"><span class="key">Versión</span><span class="val" id="sys-ver">—</span></div>
          <div class="sys-row"><span class="key">Node.js</span><span class="val" id="sys-node">—</span></div>
          <div class="sys-row"><span class="key">Uptime</span><span class="val" id="sys-uptime">—</span></div>
          <div class="sys-row"><span class="key">Memoria RAM</span><span class="val" id="sys-mem">—</span></div>
          <div class="sys-row"><span class="key">Entorno</span><span class="val" id="sys-env">—</span></div>
          <div style="margin-top:.9rem;padding-top:.9rem;border-top:2px solid var(--gb);">
            <div style="font-size:11px;font-weight:800;color:var(--tm);text-transform:uppercase;letter-spacing:.8px;margin-bottom:.6rem;">Git</div>
            <div class="sys-row"><span class="key">Commit</span><span class="val" id="sys-hash">—</span></div>
            <div class="sys-row"><span class="key">Rama</span><span class="val" id="sys-branch">—</span></div>
            <div class="sys-row"><span class="key">Último commit</span><span class="val" id="sys-cmsg" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">—</span></div>
            <div class="sys-row"><span class="key">Fecha</span><span class="val" id="sys-cdate">—</span></div>
          </div>
          <div class="sr" style="margin-top:.9rem;">
            <button class="bsv" onclick="loadSysStatus()" style="background:var(--blu);">Refrescar</button>
          </div>
        </div>

        <!-- Actualizar desde Forgejo -->
        <div class="sys-card">
          <h4>Actualizar desde Forgejo</h4>
          <p style="font-size:12px;color:var(--tm);line-height:1.6;margin-bottom:1rem;">Descarga el código más reciente desde el repositorio Forgejo y reinicia el servidor automáticamente. El proceso tardará unos segundos.</p>
          <div style="background:var(--gb);border-radius:var(--rmd);padding:.75rem;margin-bottom:1rem;font-size:11px;color:var(--tm);">
            <div style="font-weight:800;color:var(--tx);margin-bottom:4px;">Lo que hace este botón:</div>
            <div>1. <code style="font-size:10px;">git pull origin main</code></div>
            <div style="margin-top:2px;">2. <code style="font-size:10px;">npm install</code> (si cambió package.json)</div>
            <div style="margin-top:2px;">3. <code style="font-size:10px;">pm2 restart nexo-server</code></div>
          </div>
          <button class="update-btn" id="update-btn" onclick="doUpdate()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            Actualizar servidor
          </button>
          <div id="update-msg" style="margin-top:.75rem;font-size:12px;text-align:center;display:none;font-weight:700;"></div>
        </div>
      </div>

      <!-- Logs de actualización -->
      <div class="sys-card">
        <h4 style="display:flex;justify-content:space-between;align-items:center;">
          Logs de actualización
          <button class="bsv" onclick="loadLogs()" style="font-size:11px;padding:5px 12px;">Refrescar</button>
        </h4>
        <div class="log-box" id="log-box">Cargando logs...</div>
      </div>
    </div>

  </div><!-- /app-cnt -->
</div><!-- /app-ov -->

<!-- FRIEND PICKER MODAL (nueva conversación de chat) -->
<div class="mbg" id="fp-mod" onclick="if(event.target===this)closeFriendPicker()">
  <div class="mbox" style="max-width:360px;">
    <h3 style="margin-bottom:.9rem;">💬 Nueva conversación</h3>
    <div id="fp-list" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:.5rem;">
      <div style="text-align:center;padding:1.5rem;color:var(--tm);">Cargando amigos...</div>
    </div>
    <div class="macts"><button class="bcnc" onclick="closeFriendPicker()">Cancelar</button></div>
  </div>
</div>

<!-- BAN MODAL -->
<div class="mbg" id="bmod">
  <div class="mbox">
    <h3>Banear usuario</h3>
    <div class="fg2"><label class="lbl">Motivo</label><input class="inp" type="text" id="breason" placeholder="Especifica el motivo..."></div>
    <div class="macts"><button class="bcnc" onclick="closeMod()">Cancelar</button><button class="bdng" onclick="confirmBan()">Confirmar ban</button></div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
// ─── CONFIG ──────────────────────────────────────────────────────────────────
const AK = 'nexo_api';
// Usa el mismo origen que sirve la página — funciona sin tocar nada en producción
let API = localStorage.getItem(AK) || window.location.origin;
let AT  = localStorage.getItem('nexo_at') || '';
let RT  = localStorage.getItem('nexo_rt') || '';
let CU  = JSON.parse(localStorage.getItem('nexo_cu') || 'null');
let banTarget = null, allUsers = [];
let chatWs = null, chatCurrentRoom = null, chatRooms = [], chatFriendNames = {};

document.getElementById('api-url').value = API;
window.addEventListener('scroll', () =>
  document.getElementById('lnav').classList.toggle('scrolled', scrollY > 20)
);

// ─── STATUS PÚBLICO (landing page, sin login) ─────────────────────────────────
async function loadPublicStatus() {
  const g = document.getElementById('pub-svgrid');
  if (!g) return;

  // Placeholder con animación de carga
  g.innerHTML = SVCS.map(() =>
    \`<div class="pub-svc" style="opacity:.4;"><div class="pub-icon">⏳</div><div class="pub-info"><div class="pub-name" style="background:var(--gm);height:12px;border-radius:4px;width:80%;"></div><div class="pub-desc" style="background:var(--gb);height:9px;border-radius:4px;width:60%;margin-top:5px;"></div></div></div>\`
  ).join('');

  const results = await Promise.all(SVCS.map(async s => {
    let ok = false, lat = 0;
    try {
      const t = Date.now();
      const r = await fetch(API + s.ep, { method: 'GET', signal: AbortSignal.timeout(5000) });
      lat = Date.now() - t;
      ok = r.status < 500;
    } catch (_) {}
    return { ...s, ok, lat };
  }));

  g.innerHTML = results.map(s => {
    const dotClass = s.ok ? 'on' : 'off';
    const gameClass = s.game ? ' game-svc' : '';
    const latTxt = s.ok ? \`<span class="pub-lat">\${s.lat}ms</span>\` : '';
    return \`<div class="pub-svc\${gameClass}">
      <div class="pub-icon">\${s.icon || '🔴'}</div>
      <div class="pub-info">
        <div class="pub-name">\${s.name}</div>
        <div class="pub-desc">\${s.desc}</div>
      </div>
      <div class="pub-stat">
        \${latTxt}
        <div class="pub-dot \${dotClass}"></div>
      </div>
    </div>\`;
  }).join('');

  const up = results.filter(r => r.ok).length;
  document.getElementById('pub-lcheck').textContent =
    \`\${up}/\${SVCS.length} servicios activos · Verificado: \${new Date().toLocaleTimeString('es-ES')}\`;

  // Actualizar badge del hero
  const badge = document.getElementById('hero-badge');
  if (badge) {
    const allUp = up === SVCS.length;
    const smm2 = results.find(r => r.game && r.ok);
    if (allUp) {
      badge.innerHTML = \`<span class="bdot"></span>Todos los servidores online — \${up}/\${SVCS.length}\`;
    } else if (smm2) {
      badge.innerHTML = \`<span class="bdot"></span>\${up}/\${SVCS.length} servicios activos · SMM2 ✓\`;
    } else {
      badge.innerHTML = \`<span class="bdot" style="background:var(--red);"></span>\${up}/\${SVCS.length} servicios activos\`;
    }
  }
}

// Cargar estado público al arrancar (sin esperar login)
loadPublicStatus();

function saveApi() {
  API = document.getElementById('api-url').value.trim().replace(/\\/$/, '');
  localStorage.setItem(AK, API);
  toast('URL guardada', 'success');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const h = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (AT) h['Authorization'] = 'Bearer ' + AT;
  try {
    const r = await fetch(API + path, { ...opts, headers: h });
    let d;
    try { d = await r.json(); } catch { d = { ok: false, error: 'Respuesta inválida del servidor' }; }
    return { ok: r.ok, status: r.status, data: d };
  } catch (err) {
    // Error de red real (CORS, servidor caído, sin conexión)
    const msg = err.message || 'Sin conexión con el servidor';
    return { ok: false, status: 0, data: { ok: false, error: 'Error de red: ' + msg } };
  }
}
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3500);
}
function initials(n) { return (n || 'NX').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }
function setMsg(id, msg, type) { const e = document.getElementById(id); e.textContent = msg; e.className = 'amsg ' + type; }
function fmtUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d > 0 ? d + 'd ' + h + 'h' : h > 0 ? h + 'h ' + m + 'm' : m + 'm';
}

// ─── LANDING ─────────────────────────────────────────────────────────────────
function openApp() {
  document.getElementById('app-ov').classList.add('open');
  document.body.style.overflow = 'hidden';
  if (AT && CU) enterDash();
}
function closeApp() {
  document.getElementById('app-ov').classList.remove('open');
  document.body.style.overflow = '';
}

// ─── AUTH TABS ────────────────────────────────────────────────────────────────
function swTab(tab) {
  document.querySelectorAll('.atab').forEach((b, i) => b.classList.toggle('active', (i === 0) === (tab === 'login')));
  document.getElementById('f-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('f-reg').classList.toggle('hidden', tab === 'login');
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function doLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('lbtn');
  btn.textContent = 'Entrando...'; btn.disabled = true;
  setMsg('lmsg', '', '');

  const { ok, data } = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      login:    document.getElementById('li').value.trim(),
      password: document.getElementById('lp').value,
    }),
  });

  btn.textContent = 'Entrar'; btn.disabled = false;

  if (!ok) {
    setMsg('lmsg', data.error || 'Error al iniciar sesión', 'error');
    return;
  }

  const d = data.data;
  AT = d.access_token;
  RT = d.refresh_token;
  CU = { nexo_id: d.nexo_id, nickname: d.nickname };
  localStorage.setItem('nexo_at', AT);
  localStorage.setItem('nexo_rt', RT);
  localStorage.setItem('nexo_cu', JSON.stringify(CU));
  enterDash();
}

// ─── REGISTER ────────────────────────────────────────────────────────────────
async function doReg(e) {
  e.preventDefault();
  setMsg('rmsg', '', '');

  const username = document.getElementById('ru').value.trim();
  const email    = document.getElementById('re').value.trim();
  const password = document.getElementById('rp').value;
  const nickname = document.getElementById('rn').value.trim() || undefined;

  const { ok, data } = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, nickname }),
  });

  if (!ok) {
    setMsg('rmsg', data.error || 'Error al registrarse', 'error');
    return;
  }

  setMsg('rmsg', '¡Cuenta creada! Inicia sesión.', 'success');
  setTimeout(() => swTab('login'), 1500);
}

async function doLogout() {
  await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: RT }) });
  clearSess();
}
async function logoutAll() {
  await apiFetch('/auth/logout-all', { method: 'POST' });
  toast('Sesiones cerradas', 'success');
  clearSess();
}
function clearSess() {
  AT = ''; RT = ''; CU = null;
  ['nexo_at', 'nexo_rt', 'nexo_cu'].forEach(k => localStorage.removeItem(k));
  document.getElementById('app-nav').style.display = 'none';
  document.getElementById('app-cnt').style.display = 'none';
  document.getElementById('app-auth').style.display = 'flex';
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function enterDash() {
  document.getElementById('app-auth').style.display = 'none';
  document.getElementById('app-nav').style.display  = 'flex';
  document.getElementById('app-cnt').style.display  = 'block';
  if (CU) {
    const navEl = document.getElementById('nav-av');
    if (CU.avatar_url) {
      const img = document.createElement('img');
      img.src = CU.avatar_url;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
      navEl.innerHTML = '';
      navEl.appendChild(img);
    } else {
      navEl.textContent = initials(CU.nickname);
    }
  }
  showP('status');
  loadProf();
}
function showP(p) {
  document.querySelectorAll('.apg').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.alink').forEach(b => b.classList.remove('active'));
  document.getElementById('apg-' + p)?.classList.add('active');
  const m = { status: 0, profile: 1, friends: 2, chat: 3, admin: 4, sistema: 5 };
  document.querySelectorAll('.alink')[m[p]]?.classList.add('active');
  if (p === 'status')  loadStatus();
  if (p === 'friends') loadFriends();
  if (p === 'chat')    initChat();
  if (p === 'admin')   loadAdmin();
  if (p === 'sistema') { loadSysStatus(); loadLogs(); }
}

// ─── STATUS ───────────────────────────────────────────────────────────────────
const SVCS = [
  { name: 'Core / Health',      ep: '/health',                icon: '🔴', desc: 'Servidor principal' },
  { name: 'Accounts Service',   ep: '/api/v1/server/info',    icon: '👤', desc: 'Cuentas y autenticación' },
  { name: 'Auth / Sessions',    ep: '/auth/login',            icon: '🔑', desc: 'JWT, refresh tokens' },
  { name: 'Friends Service',    ep: '/friends',               icon: '👥', desc: 'Lista de amigos' },
  { name: 'Presence',           ep: '/profile/me',            icon: '🟢', desc: 'Estado en juego' },
  { name: 'Notifications',      ep: '/api/v1/notification',   icon: '🔔', desc: 'WebSocket notificaciones' },
  { name: 'Config / Rewrites',  ep: '/api/v1/rewrites',       icon: '⚙️', desc: 'Configuración del emulador' },
  { name: 'BCAT',               ep: '/api/v1/bcat',           icon: '📦', desc: 'Entrega de contenido' },
  { name: 'Mario Maker 2 ⭐',   ep: '/api/v1/smm2/rankings', icon: '🍄', desc: 'Módulo juego SMM2', game: true },
];
async function loadStatus() {
  const g = document.getElementById('svgrid'); g.innerHTML = '';
  let up = 0; const t0 = Date.now();

  // Separar servicios base de módulos de juego
  const coreSvcs  = SVCS.filter(s => !s.game);
  const gameSvcs  = SVCS.filter(s => s.game);

  const checkSvc = async (s) => {
    let ok = false, lat = 0;
    try {
      const t = Date.now();
      const r = await fetch(API + s.ep, { method: 'GET', signal: AbortSignal.timeout(5000) });
      lat = Date.now() - t;
      ok = r.status < 500;
    } catch (_) {}
    return { ...s, ok, lat };
  };

  // Comprobar todos en paralelo
  const results = await Promise.all(SVCS.map(checkSvc));
  up = results.filter(r => r.ok).length;

  // Renderizar servicios base
  if (coreSvcs.length) {
    g.innerHTML += \`<div style="grid-column:1/-1;font-size:12px;font-weight:800;color:var(--tm);text-transform:uppercase;letter-spacing:1px;margin-bottom:-4px;">Servicios base</div>\`;
    results.filter(r => !r.game).forEach(s => {
      g.innerHTML += renderSvc(s);
    });
  }

  // Renderizar módulos de juego
  if (gameSvcs.length) {
    g.innerHTML += \`<div style="grid-column:1/-1;font-size:12px;font-weight:800;color:var(--tm);text-transform:uppercase;letter-spacing:1px;margin-top:8px;margin-bottom:-4px;">Módulos de juego</div>\`;
    results.filter(r => r.game).forEach(s => {
      g.innerHTML += renderSvc(s, true);
    });
  }

  const gl = Date.now() - t0;
  document.getElementById('s-up').textContent  = up + '/' + SVCS.length;
  document.getElementById('s-lat').textContent = Math.round(gl / SVCS.length);
  document.getElementById('lcheck').textContent = 'Verificado: ' + new Date().toLocaleTimeString('es-ES');
  // Actualizar el texto "de N" dinámicamente
  const sTotal = document.getElementById('s-total');
  if (sTotal) sTotal.textContent = 'de ' + SVCS.length;

  const { ok, data } = await apiFetch('/admin/stats');
  if (ok) {
    document.getElementById('s-on').textContent  = data.data.online_users;
    document.getElementById('s-tot').textContent = data.data.total_users;
  }
}

function renderSvc(s, isGame = false) {
  const latTxt = s.ok ? s.lat + 'ms' : '—';
  const pill   = s.ok ? 'on' : 'off';
  const label  = s.ok ? 'Online' : 'Offline';
  const dot    = s.ok ? 'on'    : 'off';
  const border = isGame && s.ok ? 'border-top:3px solid var(--red);' : '';
  return \`<div class="svc" style="\${border}">
    <div class="svh">
      <div class="svn">\${s.icon ? s.icon + ' ' : ''}\${s.name}</div>
      <div class="spill \${pill}"><span class="sdot \${dot}"></span>\${label}</div>
    </div>
    <div style="font-size:11px;color:var(--tm);margin-bottom:5px;">\${s.desc}</div>
    <div style="font-size:12px;color:var(--tm);">Latencia: <b>\${latTxt}</b></div>
  </div>\`;
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

// Aplica una URL de avatar al círculo grande y al nav
function applyAvatar(url) {
  const pavEl   = document.getElementById('pav');
  const navEl   = document.getElementById('nav-av');
  const initEl  = document.getElementById('pav-initials');

  if (url) {
    // Crear/actualizar imagen en el avatar grande
    let img = pavEl.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = 'avatar';
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;';
      pavEl.insertBefore(img, pavEl.firstChild);
    }
    img.src = url;
    if (initEl) initEl.style.display = 'none';

    // Nav pequeño
    let nimg = navEl.querySelector('img');
    if (!nimg) {
      nimg = document.createElement('img');
      nimg.alt = 'av';
      navEl.innerHTML = '';
      navEl.appendChild(nimg);
    }
    nimg.src = url;
    nimg.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
  } else {
    // Sin avatar → mostrar iniciales
    const img = pavEl.querySelector('img');
    if (img) img.remove();
    if (initEl) initEl.style.display = '';
    // Nav: limpiar imagen
    const nimg = navEl.querySelector('img');
    if (nimg) nimg.remove();
  }
}

async function loadProf() {
  const { ok, data } = await apiFetch('/profile/me');
  if (!ok) return;
  const p = data.data;
  const ini = initials(p.nickname);
  if (document.getElementById('pav-initials')) document.getElementById('pav-initials').textContent = ini;
  if (!document.getElementById('nav-av').querySelector('img')) document.getElementById('nav-av').textContent = ini;
  document.getElementById('pname').textContent   = p.nickname;
  document.getElementById('pnexoid').textContent = p.nexo_id;
  document.getElementById('p-nick').value = p.nickname || '';
  document.getElementById('p-lang').value = p.lang     || '';
  if (p.status)     document.getElementById('p-st').value = p.status;
  if (p.game_title) document.getElementById('p-gm').value = p.game_title;
  if (p.is_admin) {
    document.getElementById('admbtn').style.display = 'block';
    document.getElementById('sysbtn').style.display = 'block';
  }
  // Mostrar avatar si existe
  applyAvatar(p.avatar_url || '');
}

async function saveProf() {
  const { ok, data } = await apiFetch('/profile/me', {
    method: 'PATCH',
    body: JSON.stringify({
      nickname: document.getElementById('p-nick').value || undefined,
      lang:     document.getElementById('p-lang').value || undefined,
    }),
  });
  ok ? (toast('Perfil actualizado', 'success'), loadProf()) : toast(data.error || 'Error', 'error');
}

// Cuando el usuario elige un archivo de imagen
async function onAvatarFileChosen(input) {
  const file = input.files[0];
  if (!file) return;

  const MAX_MB = 3;
  if (file.size > MAX_MB * 1024 * 1024) {
    return toast('La imagen no puede superar ' + MAX_MB + ' MB', 'error');
  }

  // Previsualizar inmediatamente con FileReader
  const reader = new FileReader();
  reader.onload = e => applyAvatar(e.target.result);
  reader.readAsDataURL(file);

  // Subir al servidor
  toast('Subiendo foto...', 'info');
  const form = new FormData();
  form.append('file', file);

  const token = localStorage.getItem('nexo_token');
  try {
    const res = await fetch('/profile/me/avatar', {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      body: form,
    });
    const json = await res.json();
    if (json.ok) {
      toast('Foto actualizada ✓', 'success');
      // Aplicar la URL definitiva del servidor (con cache-buster)
      applyAvatar(json.avatar_url);
    } else {
      toast(json.error || 'No se pudo subir la imagen', 'error');
    }
  } catch (e) {
    toast('Error de red al subir la imagen', 'error');
  }
  // Limpiar input para poder elegir la misma imagen otra vez
  input.value = '';
}
async function changePass() {
  const c = document.getElementById('p-cur').value;
  const n = document.getElementById('p-new').value;
  if (!c || !n) return toast('Rellena ambos campos', 'error');
  const { ok, data } = await apiFetch('/profile/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword: c, newPassword: n }),
  });
  ok ? (toast('Contraseña cambiada', 'success'), setTimeout(clearSess, 1500)) : toast(data.error || 'Error', 'error');
}
async function savePresence() {
  const { ok, data } = await apiFetch('/profile/me/presence', {
    method: 'PUT',
    body: JSON.stringify({
      status:     document.getElementById('p-st').value,
      game_title: document.getElementById('p-gm').value || undefined,
    }),
  });
  ok ? toast('Estado actualizado', 'success') : toast(data.error || 'Error', 'error');
}

// ─── FRIENDS ──────────────────────────────────────────────────────────────────
async function loadFriends() {
  const { ok, data } = await apiFetch('/friends');
  if (!ok) return;
  const list = data.data || [];
  const acc  = list.filter(f => f.friendship_status === 'accepted');
  const pen  = list.filter(f => f.friendship_status === 'pending');
  const ps = document.getElementById('psec');
  const pg = document.getElementById('pgrid');
  const fg = document.getElementById('fgrid');

  // Helper: círculo avatar con foto o iniciales
  function avHtml(f, size = 40) {
    const cols = ['var(--red)', 'var(--blu)', '#8b5cf6', '#22c55e', '#f59e0b'];
    const c = cols[(f.nickname || 'A').charCodeAt(0) % cols.length];
    const s = \`width:\${size}px;height:\${size}px;border-radius:50%;flex-shrink:0;overflow:hidden;\`;
    if (f.avatar_url) {
      return \`<div style="\${s}background:\${c};"><img src="\${f.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"></div>\`;
    }
    return \`<div class="avmd" style="background:\${c};width:\${size}px;height:\${size}px;">\${initials(f.nickname)}</div>\`;
  }

  if (pen.length) {
    ps.style.display = 'block';
    pg.innerHTML = pen.map(f =>
      \`<div class="fcard">\${avHtml(f)}<div style="flex:1;min-width:0;"><div class="fn">\${f.nickname}</div><div class="fst">\${f.nexo_id}</div><div style="display:flex;gap:4px;margin-top:4px;"><button class="bism" onclick="respF('\${f.nexo_id}',true)">Aceptar</button><button class="bism" onclick="respF('\${f.nexo_id}',false)">✕</button></div></div></div>\`
    ).join('');
  }

  fg.innerHTML = acc.length ? acc.map(f => {
    const sl = f.online_status === 'in_game'
      ? \`Jugando: \${f.game_title || '...'}\`
      : f.online_status === 'online' ? 'En línea' : 'Desconectado';
    const sc = f.online_status === 'in_game' ? 'ig' : '';
    return \`<div class="fcard">\${avHtml(f)}<div style="flex:1;min-width:0;"><div class="fn">\${f.nickname}</div><div class="fst \${sc}">\${sl}</div><div style="font-size:10px;color:var(--tm);margin-top:1px;">\${f.nexo_id}</div></div><div style="display:flex;gap:4px;"><button class="bism" onclick="chatNewDm('\${f.nexo_id}')" title="Enviar mensaje">💬</button><button class="bism" onclick="rmFriend('\${f.nexo_id}')">✕</button></div></div>\`;
  }).join('')
  : \`<div class="emp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg><p>Sin amigos aún</p></div>\`;
}
async function addFriend() {
  const id = document.getElementById('fadd').value.trim();
  if (!id) return;
  const { ok, data } = await apiFetch('/friends/request', { method: 'POST', body: JSON.stringify({ nexo_id: id }) });
  ok ? (toast('Solicitud enviada', 'success'), document.getElementById('fadd').value = '', loadFriends()) : toast(data.error || 'Error', 'error');
}
async function respF(id, accept) {
  const { ok } = await apiFetch(\`/friends/\${id}/respond\`, { method: 'PUT', body: JSON.stringify({ accept }) });
  if (ok) { toast(accept ? 'Amigo aceptado' : 'Rechazado', 'success'); loadFriends(); }
}
async function rmFriend(id) {
  const { ok } = await apiFetch(\`/friends/\${id}\`, { method: 'DELETE' });
  if (ok) { toast('Amigo eliminado', 'success'); loadFriends(); }
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
async function loadAdmin() {
  const { ok, data } = await apiFetch('/admin/users');
  const tb = document.getElementById('atbody');
  if (!ok) {
    tb.innerHTML = \`<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--tm);">Acceso de administrador requerido</td></tr>\`;
    return;
  }
  allUsers = data.data || [];
  renderU(allUsers);
}
function renderU(u) {
  const tb = document.getElementById('atbody');
  if (!u.length) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--tm);">Sin usuarios</td></tr>';
    return;
  }
  tb.innerHTML = u.map(x =>
    \`<tr>
      <td style="font-weight:800;">\${x.nickname || x.username}</td>
      <td style="font-size:11px;color:var(--tm);">\${x.nexo_id}</td>
      <td style="font-size:11px;">\${x.email}</td>
      <td><span class="pill \${x.is_banned ? 'bn' : 'ac'}">\${x.is_banned ? 'Baneado' : 'Activo'}</span>\${x.is_admin ? ' <span class="pill adm">Admin</span>' : ''}</td>
      <td style="font-size:11px;color:var(--tm);">\${new Date(x.created_at).toLocaleDateString('es-ES')}</td>
      <td style="display:flex;gap:4px;">
        \${x.is_banned
          ? \`<button class="bism" onclick="unban('\${x.nexo_id}')">Desbanear</button>\`
          : \`<button class="bism" onclick="openBan('\${x.nexo_id}')">Banear</button>\`}
      </td>
    </tr>\`
  ).join('');
}
function filterU() {
  const q = document.getElementById('asrch').value.toLowerCase();
  renderU(allUsers.filter(u => [u.username, u.email, u.nexo_id, u.nickname].some(v => (v || '').toLowerCase().includes(q))));
}
function openBan(id) { banTarget = id; document.getElementById('breason').value = ''; document.getElementById('bmod').classList.add('open'); }
function closeMod()  { document.getElementById('bmod').classList.remove('open'); banTarget = null; }
async function confirmBan() {
  const { ok } = await apiFetch(\`/admin/users/\${banTarget}/ban\`, { method: 'POST', body: JSON.stringify({ reason: document.getElementById('breason').value }) });
  if (ok) { toast('Usuario baneado', 'success'); closeMod(); loadAdmin(); }
  else toast('Error', 'error');
}
async function unban(id) {
  const { ok } = await apiFetch(\`/admin/users/\${id}/unban\`, { method: 'POST' });
  if (ok) { toast('Usuario desbaneado', 'success'); loadAdmin(); }
}

// ─── SISTEMA ──────────────────────────────────────────────────────────────────
async function loadSysStatus() {
  const { ok, data } = await apiFetch('/admin/system/status');
  if (!ok) return;
  const d = data.data;
  document.getElementById('sys-ver').textContent    = d.version;
  document.getElementById('sys-node').textContent   = d.node;
  document.getElementById('sys-uptime').textContent = fmtUptime(d.uptime_sec);
  document.getElementById('sys-mem').textContent    = d.memory_mb + ' MB';
  const envEl = document.getElementById('sys-env');
  envEl.innerHTML = \`<span class="sys-badge \${d.env === 'production' ? 'ok' : 'dev'}">\${d.env}</span>\`;
  if (d.git) {
    document.getElementById('sys-hash').textContent   = d.git.hash   || '—';
    document.getElementById('sys-branch').textContent = d.git.branch || '—';
    document.getElementById('sys-cmsg').textContent   = d.git.commit_msg  || '—';
    document.getElementById('sys-cdate').textContent  = d.git.commit_date || '—';
  }
}
async function loadLogs() {
  const { ok, data } = await apiFetch('/admin/system/logs?lines=80');
  const lb = document.getElementById('log-box');
  lb.textContent = ok ? (data.data.logs || 'Sin logs.') : 'Error al cargar logs.';
  lb.scrollTop = lb.scrollHeight;
}
async function doUpdate() {
  const btn = document.getElementById('update-btn');
  const msg = document.getElementById('update-msg');
  btn.disabled = true; btn.textContent = 'Actualizando...';
  msg.style.display = 'none';
  const { ok } = await apiFetch('/admin/system/update', { method: 'POST' });
  if (ok) {
    btn.classList.add('success'); btn.textContent = '✓ Actualización iniciada';
    msg.style.display = 'block'; msg.style.color = '#15803d';
    msg.textContent = 'El servidor se reiniciará en unos segundos. La página se recargará automáticamente.';
    setTimeout(() => location.reload(), 8000);
  } else {
    btn.disabled = false; btn.textContent = 'Actualizar servidor';
    msg.style.display = 'block'; msg.style.color = 'var(--rd)';
    msg.textContent = 'Error al iniciar la actualización.';
  }
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
function initChat() {
  connectChatWs();
  loadChatRooms();
  // Poblar mapa de nombres de amigos para mostrar nombres reales en el sidebar
  apiFetch('/friends').then(({ ok, data }) => {
    if (!ok) return;
    chatFriendNames = {};
    (data.data || []).forEach(f => { chatFriendNames[String(f.nexo_id)] = f.nickname || f.nexo_id; });
    renderChatRooms();
  });
}

async function loadChatRooms() {
  const { ok, data } = await apiFetch('/api/v1/chat/rooms');
  if (!ok) return;
  chatRooms = data.rooms || [];
  renderChatRooms();
}

function renderChatRooms() {
  const el = document.getElementById('chat-rooms-list');
  if (!el) return;
  if (!chatRooms.length) {
    el.innerHTML = \`<div style="padding:1.2rem 1rem;font-size:12px;color:var(--tm);text-align:center;line-height:1.6;">Sin conversaciones.<br>Pulsa &quot;+ Nueva conversación&quot;.</div>\`;
    return;
  }
  el.innerHTML = chatRooms.map(r => {
    const name = chatFriendNames[r.other_user_id] || r.other_user_id;
    const preview = r.last_message ? escHtml(r.last_message.content.slice(0, 38)) : 'Sin mensajes';
    const active  = chatCurrentRoom === r.room_id ? ' active' : '';
    const badge   = r.unread_count > 0 ? \`<span class="chat-badge">\${r.unread_count}</span>\` : '';
    return \`<div class="chat-room-item\${active}" onclick="openRoom('\${r.room_id}','\${r.other_user_id}')">
      <div class="chat-room-name">\${escHtml(name)}\${badge}</div>
      <div class="chat-room-preview">\${preview}</div>
    </div>\`;
  }).join('');
}

async function openRoom(room_id, other_id) {
  chatCurrentRoom = room_id;
  const name = chatFriendNames[other_id] || other_id;
  const main = document.getElementById('chat-main');
  if (!main) return;
  main.innerHTML = \`
    <div class="chat-hdr">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--red)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      \${escHtml(name)}
    </div>
    <div class="chat-msgs" id="chat-msgs"></div>
    <div class="chat-bar">
      <input class="chat-inp" id="chat-inp" placeholder="Escribe un mensaje..." maxlength="500"
             onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chatSend();}">
      <button class="chat-send" onclick="chatSend()">Enviar</button>
    </div>\`;
  renderChatRooms();
  await loadRoomMessages(room_id);
}

async function loadRoomMessages(room_id) {
  const { ok, data } = await apiFetch(\`/api/v1/chat/rooms/\${room_id}/messages\`);
  if (!ok) return;
  const msgs = document.getElementById('chat-msgs');
  if (!msgs) return;
  msgs.innerHTML = '';
  (data.messages || []).forEach(m => appendChatMsg(m, false));
  msgs.scrollTop = msgs.scrollHeight;
}

function appendChatMsg(msg, scroll = true) {
  const msgs = document.getElementById('chat-msgs');
  if (!msgs) return;
  const isMe = CU && String(msg.sender_id) === String(CU.nexo_id);
  const time  = new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const div   = document.createElement('div');
  div.className = 'chat-msg ' + (isMe ? 'mine' : 'theirs');
  div.innerHTML = \`<div class="chat-bubble">\${escHtml(msg.content)}</div>
    <div class="chat-meta">\${isMe ? '' : escHtml(msg.sender_name) + ' · '}\${time}</div>\`;
  msgs.appendChild(div);
  if (scroll) msgs.scrollTop = msgs.scrollHeight;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function chatSend() {
  if (!chatCurrentRoom) return;
  const inp = document.getElementById('chat-inp');
  if (!inp) return;
  const content = inp.value.trim();
  if (!content) return;
  inp.value = '';
  inp.focus();
  const { ok, data } = await apiFetch(\`/api/v1/chat/rooms/\${chatCurrentRoom}/messages\`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  if (ok) {
    appendChatMsg(data.message);
  } else {
    inp.value = content; // devolver texto si falló
    toast(data.error || 'Error al enviar', 'error');
  }
}

async function chatNewDm(user_id) {
  if (!user_id) {
    // Sin ID: abrir el selector de amigos
    showFriendPicker();
    return;
  }
  // Corregir: siempre mandar body JSON aunque esté vacío (Fastify lo exige)
  const { ok, data } = await apiFetch(\`/api/v1/chat/dm/\${encodeURIComponent(user_id)}\`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!ok) { toast(data.error || 'No se pudo abrir la conversación', 'error'); return; }
  closeFriendPicker();
  showP('chat');
  await loadChatRooms();
  openRoom(data.room_id, user_id);
}

async function showFriendPicker() {
  const mod  = document.getElementById('fp-mod');
  const list = document.getElementById('fp-list');
  list.innerHTML = \`<div style="text-align:center;padding:1.5rem;color:var(--tm);">Cargando amigos...</div>\`;
  mod.classList.add('open');

  const { ok, data } = await apiFetch('/friends');
  if (!ok) {
    list.innerHTML = \`<div style="text-align:center;padding:1rem;color:var(--rd);">Error al cargar amigos</div>\`;
    return;
  }

  const acc = (data.data || []).filter(f => f.friendship_status === 'accepted');
  if (!acc.length) {
    list.innerHTML = \`<div style="text-align:center;padding:1.5rem;color:var(--tm);line-height:1.7;">No tienes amigos añadidos.<br><span style="font-size:12px;">Ve a la sección <b>Amigos</b> para añadir uno.</span></div>\`;
    return;
  }

  const cols = ['var(--red)', 'var(--blu)', '#8b5cf6', '#22c55e', '#f59e0b'];
  list.innerHTML = acc.map(f => {
    const c  = cols[(f.nickname||'A').charCodeAt(0) % cols.length];
    const sl = f.online_status === 'in_game'
      ? \`🎮 \${f.game_title || 'Jugando'}\`
      : f.online_status === 'online' ? '🟢 En línea' : '⚫ Desconectado';
    const avImg = f.avatar_url
      ? \`<div style="width:38px;height:38px;border-radius:50%;overflow:hidden;flex-shrink:0;background:\${c};"><img src="\${f.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"></div>\`
      : \`<div class="avmd" style="background:\${c}">\${initials(f.nickname)}</div>\`;
    return \`<div class="fcard" style="cursor:pointer;transition:background .12s;" onclick="chatNewDm('\${f.nexo_id}')"
         onmouseenter="this.style.background='var(--gb)'" onmouseleave="this.style.background=''">
      \${avImg}
      <div style="flex:1;min-width:0;">
        <div class="fn">\${escHtml(f.nickname)}</div>
        <div class="fst" style="font-size:11px;">\${escHtml(sl)}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--tm)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
    </div>\`;
  }).join('');
}

function closeFriendPicker() {
  document.getElementById('fp-mod')?.classList.remove('open');
}

function connectChatWs() {
  if (chatWs && (chatWs.readyState === WebSocket.OPEN || chatWs.readyState === WebSocket.CONNECTING)) return;
  if (!AT) return;
  try {
    const wsBase = API.replace(/^https/, 'wss').replace(/^http/, 'ws');
    chatWs = new WebSocket(\`\${wsBase}/api/v1/chat/ws?token=\${encodeURIComponent(AT)}\`);
    chatWs.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === 'chat_message') {
          if (ev.room_id === chatCurrentRoom) {
            appendChatMsg(ev.message);
          }
          // Actualizar la vista previa de la sala en el sidebar
          loadChatRooms();
        } else if (ev.type === 'chat_message_deleted') {
          if (ev.room_id === chatCurrentRoom) {
            loadRoomMessages(ev.room_id);
          }
        }
      } catch (_) {}
    };
    chatWs.onclose  = () => { chatWs = null; if (AT) setTimeout(connectChatWs, 5000); };
    chatWs.onerror  = () => {};
  } catch (_) {}
}

// ─── PLANES TOGGLE ────────────────────────────────────────────────────────────
let pBillYearly = false;
function togglePBill() {
  pBillYearly = !pBillYearly;
  document.getElementById('ptog').classList.toggle('on', pBillYearly);
  document.getElementById('pgrid').classList.toggle('yearly', pBillYearly);
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
if (AT && CU) openApp();
</script>
</body>
</html>`;
