// Original compositions. Each direction has its own geometry, not just a new color.
export const coverDesigns=[
 ['Orbit','Abstract','sea','Lora','center'],['Press','Typography','archive','Source Serif','center'],['Lines','Geometric','mineral','DM Sans','left'],['Monolith','Geometric','crimson','DM Sans','left'],
 ['Botanica','Botanical','field','Lora','center'],['Ginkgo','Botanical','ochre','Literata','center'],['Fern','Botanical','ink','Source Serif','left'],['Orchard','Botanical','light','Lora','center'],
 ['Arch','Architecture','mineral','Literata','center'],['Arcade','Architecture','archive','Source Serif','center'],['Stair','Architecture','cobalt','DM Sans','left'],['Window','Architecture','sea','Lora','center'],
 ['Contour','Landscape','field','Source Serif','left'],['Dune','Landscape','ochre','Literata','center'],['Tide','Landscape','sea','Lora','center'],['Rain','Landscape','ink','IBM Plex','left'],
 ['Eclipse','Abstract','crimson','Lora','center'],['Solstice','Abstract','light','DM Sans','center'],['Constellation','Abstract','archive','Literata','center'],['Meridian','Geometric','cobalt','IBM Plex','center'],
 ['Fold','Geometric','mineral','DM Sans','left'],['Ribbon','Abstract','light','Lora','center'],['Mosaic','Geometric','ochre','DM Sans','left'],['Tessera','Geometric','crimson','IBM Plex','left'],
 ['Bauhaus','Geometric','ink','DM Sans','left'],['Ripple','Abstract','sea','Literata','center'],['Labyrinth','Geometric','archive','IBM Plex','center'],['Facet','Geometric','cobalt','DM Sans','left'],
 ['Halftone','Typography','mineral','IBM Plex','left'],['Loom','Abstract','field','Source Serif','center'],['Negative','Typography','crimson','DM Sans','left'],['Marginalia','Typography','ink','Literata','center']
].map(([id,category,palette,font,align])=>({id,name:id,category,palette,font,align}));
export const coverFonts={Lora:{family:'Lora',file:'lora.ttf'},Literata:{family:'Literata',file:'literata.ttf'},'Source Serif':{family:'SourceSerif',file:'source-serif.ttf'},'DM Sans':{family:'DM Sans',file:'dm-sans.ttf'},'IBM Plex':{family:'IBMPlex',file:'ibm-plex.ttf'}};
const clamp=(v,a,b,f)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):f));
const hex=(v,f)=>/^#[\da-f]{6}$/i.test(v||'')?v:f;
export function coverDirection(id){return coverDesigns.find(d=>d.id===id)||coverDesigns[0];}
export function coverOptions(p){const preset=coverDirection(p.coverDesign),o=p.coverOptions||{};return {font:coverFonts[o.font]?o.font:preset.font,align:['left','center','right'].includes(o.align)?o.align:preset.align,titlePosition:['upper','middle','lower'].includes(o.titlePosition)?o.titlePosition:'upper',titleScale:clamp(o.titleScale,.65,1.4,1),artScale:clamp(o.artScale,.5,1.6,1),artRotation:clamp(o.artRotation,-180,180,0),density:clamp(o.density,4,24,12),stroke:clamp(o.stroke,1,12,3),border:['none','single','double'].includes(o.border)?o.border:'none',texture:clamp(o.texture,0,.3,0),imageOverlay:clamp(o.imageOverlay,0,.9,.62),bg:hex(o.bg,null),ink:hex(o.ink,null),art:hex(o.art,null)};}
export function coverFont(p,code){if(['ar','ur'].includes(code))return {family:'BookArabic',file:'book-arabic.ttf'};if(code==='hi')return {family:'BookDevanagari',file:'book-devanagari.ttf'};if(code==='bn')return {family:'BookBengali',file:'book-bengali.ttf'};return coverFonts[coverOptions(p).font];}
export function coverArtwork(id,W,H,palette,o){const n=Math.round(o.density),repeat=fn=>Array.from({length:n},(_,i)=>fn(i,n)).join(''),circle=(x,y,r,fill='currentColor')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`,path=(d,fill='none')=>`<path d="${d}" fill="${fill}"/>`,rect=(x,y,w,h,fill='none')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const art={
 Orbit:circle(720,330,200)+repeat((i,n)=>path(`M-180 ${500+i*324/n}Q450 ${100+i*456/n} 1180 ${600+i*348/n}`)),
 Press:path('M70 140H930M70 830H930')+circle(500,720,17)+path('M470 720h60M500 690v60'),
 Lines:repeat((i,n)=>rect(50+i*16,80+i*15,900-i*32,840-i*30)),
 Monolith:rect(150,150,480,700,'currentColor')+circle(650,340,230,palette.bg)+path('M150 880H850'),
 Botanica:path('M500 950V100M500 520C90 610 100 100 500 330M500 710C900 800 930 200 500 460M500 830C160 880 150 570 500 690'),
 Ginkgo:repeat((i,n)=>path(`M500 900Q${-100+i*1200/(n-1)} 450 ${60+i*880/(n-1)} 160`))+path('M60 160Q500 -80 940 160'),
 Fern:path('M500 950Q400 480 550 60')+repeat((i,n)=>path(`M${500-i*2} ${200+i*600/(n-1)}q-220 -150 -320 -30q100 180 320 30m0 0q200 -170 310 -80q-60 160 -310 80`)),
 Orchard:path('M490 950V80M490 500 180 200M490 670 820 340M490 360 760 140')+circle(180,260,95)+circle(820,400,110)+circle(760,190,75),
 Arch:repeat((i,n)=>path(`M${100+i*300/n} 930V480A${400-i*300/n} ${400-i*300/n} 0 0 1 ${900-i*300/n} 480V930`)),
 Arcade:path('M70 880H930M70 940H930')+Array.from({length:4},(_,i)=>path(`M${100+i*210} 880V420a95 260 0 0 1 190 0V880`)).join(''),
 Stair:path('M80 920H920V100H800V220H680V340H560V460H440V580H320V700H200V820H80Z','currentColor')+path('M120 80 920 880'),
 Window:rect(130,70,740,860)+path('M500 70V930M130 500H870M130 280H870M130 720H870')+circle(690,300,130),
 Contour:repeat((i,n)=>path(`M-100 ${80+i*780/(n-1)}Q200 ${500-i*240/n} 450 ${140+i*456/n}T1100 ${420+i*420/n}`)),
 Dune:path('M-100 700Q180 10 600 520T1100 420V1100H-100Z','currentColor')+repeat((i,n)=>path(`M-100 ${780+i*200/n}Q400 ${320+i*300/n} 1100 ${670+i*180/n}`)),
 Tide:repeat((i,n)=>path(`M-100 ${120+i*720/n}Q150 ${-80+i*720/n} 400 ${120+i*720/n}T900 ${120+i*720/n}T1400 ${120+i*720/n}`)),
 Rain:repeat((i,n)=>path(`M${-200+i*1320/n} -100l-350 1300`))+circle(720,380,160),
 Eclipse:circle(420,480,350)+circle(600,370,330,palette.bg)+path('M60 930H940'),
 Solstice:circle(500,500,180)+repeat((i,n)=>{const a=i/n*Math.PI*2;return path(`M${500+Math.cos(a)*260} ${500+Math.sin(a)*260}L${500+Math.cos(a)*450} ${500+Math.sin(a)*450}`)}),
 Constellation:path('M80 750 300 300 510 610 730 150 920 690 510 610')+[[80,750],[300,300],[510,610],[730,150],[920,690]].map(([x,y])=>circle(x,y,25)).join(''),
 Meridian:`<ellipse cx="500" cy="500" rx="420" ry="430" fill="none"/>`+repeat((i,n)=>`<ellipse cx="500" cy="500" rx="${30+i*370/n}" ry="430" fill="none"/>`)+path('M80 500H920M125 300H875M125 700H875'),
 Fold:path('M100 100 910 380 330 920Z','currentColor')+path('M100 100 600 540 330 920',palette.bg)+path('M600 540 910 380'),
 Ribbon:path('M100 200C100 1000 900 0 900 800M170 160C170 1100 830 -100 830 840M240 120C240 1200 760 -200 760 880'),
 Mosaic:Array.from({length:9},(_,i)=>`<rect x="${90+i%3*280}" y="${80+Math.floor(i/3)*290}" width="220" height="230" rx="${i%2?100:0}" fill="${i%3===0?'currentColor':'none'}"/>`).join(''),
 Tessera:repeat((i,n)=>path(`M${i*1000/n} 950 ${(i+.5)*1000/n} 70 ${(i+1)*1000/n} 950Z`,i%2?'none':'currentColor')),
 Bauhaus:circle(330,360,260)+rect(500,400,350,450,'currentColor')+path('M100 900 900 100M100 960H900'),
 Ripple:repeat((i,n)=>`<ellipse cx="500" cy="500" rx="${40+i*440/n}" ry="${40+i*390/n}" fill="none"/>`),
 Labyrinth:repeat((i,n)=>path(`M${70+i*300/n} ${930-i*300/n}V${70+i*300/n}H${930-i*300/n}V${930-i*300/n}H${180+i*300/n}V${180+i*300/n}H${820-i*300/n}`)),
 Facet:path('M500 60 940 420 730 930H270L60 420Z M500 60 270 930M500 60 730 930M60 420H940M60 420 730 930M940 420 270 930'),
 Halftone:Array.from({length:n*n},(_,i)=>{const x=i%n,y=Math.floor(i/n),r=(Math.sin(x*.4+y*.3)+1.3)*12;return circle(50+x*900/n,50+y*900/n,r)}).join(''),
 Loom:repeat((i,n)=>path(`M${50+i*900/n} 30V970M30 ${50+i*900/n}H970`))+path('M80 920 920 80'),
 Negative:rect(80,70,840,860,'currentColor')+circle(500,500,340,palette.bg)+rect(450,0,100,1000,palette.bg),
 Marginalia:path('M130 130C850 -150 950 600 280 700S100 1100 850 860M130 250Q500 80 820 280M250 800Q500 700 800 760')+path('M100 940H900M100 40H900')
};
return `<g color="${palette.art}" stroke="${palette.art}" stroke-width="${o.stroke}" fill="none" transform="translate(${W/2} ${H*.56}) rotate(${o.artRotation}) scale(${W*.00082*o.artScale} ${H*.00034*o.artScale}) translate(-500 -500)">${art[id]||art.Orbit}</g>`;
}
