import fs from 'node:fs';
import zlib from 'node:zlib';
const size=256;
const pixels=Buffer.alloc((size*4+1)*size);
function inPoly(x,y,vertices){let inside=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){const [xi,yi]=vertices[i],[xj,yj]=vertices[j];if(((yi>y)!==(yj>y))&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
const star=[[172,51],[182,81],[212,91],[182,101],[172,131],[162,101],[132,91],[162,81]];
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const offset=y*(size*4+1)+1+x*4;let rgba=[0,0,0,0];
  for(let a=0;a<4;a++)for(let b=0;b<4;b++){
    const px=x+(a+.5)/4,py=y+(b+.5)/4;
    const dx=Math.max(0,52-px,px-204),dy=Math.max(0,52-py,py-204);
    let color=dx*dx+dy*dy<=52*52?[120,96,172,255]:[0,0,0,0];
    if((px>=76&&px<=101&&py>=68&&py<=188)||(px>=76&&px<=179&&py>=163&&py<=188))color=[255,254,250,255];
    if(inPoly(px,py,star))color=[226,212,245,255];
    rgba=rgba.map((c,i)=>c+color[i]/16);
  }
  rgba.forEach((c,i)=>pixels[offset+i]=Math.round(c));
}
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,data){const t=Buffer.from(type);let crc=0xffffffff;for(const b of Buffer.concat([t,data]))crc=table[(crc^b)&255]^(crc>>>8);const out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length);t.copy(out,4);data.copy(out,8);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
const ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(png.length,14);ico.writeUInt32LE(22,18);
fs.mkdirSync('build',{recursive:true});fs.writeFileSync('build/icon.ico',Buffer.concat([ico,png]));fs.writeFileSync('public/icon.png',png);
