// Shared game shell elements.
const modal = document.querySelector('#game-modal');
const stage = document.querySelector('#game-stage');
const title = document.querySelector('#game-title');
const score = document.querySelector('#game-score');
const help = document.querySelector('#game-help');

// Replaced whenever a game registers timers or global event listeners.
let cleanupGame = () => {};

// Landing page interactions.
document.querySelectorAll('.game-card').forEach((card) => {
  const launch = card.querySelector('.launch-button');
  card.tabIndex = 0;
  card.setAttribute('role', 'button');

  card.addEventListener('click', (event) => {
    if (!event.target.closest('.launch-button')) openGame(launch.dataset.game);
  });

  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openGame(launch.dataset.game);
    }
  });
});
document.querySelector('#modal-close').addEventListener('click', closeGame);
modal.addEventListener('click', (event) => {
  if (event.target === modal) closeGame();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modal.hidden) closeGame();
});
// Game lifecycle and shared modal helpers.
function openGame(game) {
  cleanupGame();
  modal.hidden=false;
  document.body.style.overflow='hidden';
  stage.innerHTML='';
  score.innerHTML='Score <strong>0</strong>';
  if(game==='chess')startChess();
  if(game==='polytrack')startPolytrack();
  if(game==='geoguessr')startGeoGuessrMap()
}
function closeGame() {
  cleanupGame();
  modal.hidden=true;
  document.body.style.overflow=''
}
function setScore(value,label='Score') {
  score.innerHTML=`${label} <strong>${value}</strong>`
}
// Chess: legal move generation, clocks, bot mode, and local two-player mode.
function startChess() {
  title.textContent='Chess';
  help.textContent='Full rules enabled: legal moves, check, castling, en passant, promotion, and draws.';
  const board=document.createElement('div');
  board.className='chess-board';
  const info=document.createElement('div');
  info.className='chess-info';
  info.innerHTML='<p id="chess-status">White to move.</p><div class="chess-clocks"><span>White <b id="white-clock">03:00</b></span><span>Black <b id="black-clock">03:00</b></span></div><label style="display:block;margin:10px 0;font-size:11px;color:#65728a">Time control <select id="time-mode"><option value="bullet">Bullet · 1:00</option><option value="blitz" selected>Blitz · 3:00</option><option value="regular">Regular · 10:00</option></select></label><div class="chess-modes"><button data-mode="bot">Play adaptive bot</button><button data-mode="local">Two players</button></div><label style="display:block;margin:12px 0;font-size:11px;color:#65728a">Promotion <select id="promotion"><option value="Q">Queen</option><option value="R">Rook</option><option value="B">Bishop</option><option value="N">Knight</option></select></label><button class="reset-button">Restart</button>';
  const wrap=document.createElement('div');
  wrap.className='chess-stage';
  wrap.append(board,info);
  stage.append(wrap);
  const initial=['♜','♞','♝','♛','♚','♝','♞','♜','♟','♟','♟','♟','♟','♟','♟','♟','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','♙','♙','♙','♙','♙','♙','♙','♙','♖','♘','♗','♕','♔','♗','♘','♖'];
  let pieces=[...initial],selected=-1,mode='bot',timeMode='blitz',timeLimit=180,turn='white',gameOver=false,enPassant=null,halfmove=0,history= {
  },rights= {
    K:true,Q:true,k:true,q:true
  };
  let whiteTime=timeLimit,blackTime=timeLimit,timerId,gameStarted=false;
  let playerElo=Number(localStorage.getItem('arcadeChessElo')||800),botElo=playerElo;
  const white='♙♖♘♗♕♔',black='♟♜♝♛♚♞',isWhite=p=>white.includes(p),isPawn=p=>p==='♙'||p==='♟',isKing=p=>p==='♔'||p==='♚',idx=(r,c)=>r*8+c,rc=i=>[Math.floor(i/8),i%8],inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
  function formatTime(seconds) {
    return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')
  }
  function renderClocks() {
    info.querySelector('#white-clock').textContent=formatTime(whiteTime);
    info.querySelector('#black-clock').textContent=formatTime(blackTime);
    info.querySelector('#white-clock').parentElement.classList.toggle('active-clock',turn==='white'&&!gameOver);
    info.querySelector('#black-clock').parentElement.classList.toggle('active-clock',turn==='black'&&!gameOver)
  }
  function tick() {
    if(gameOver||!gameStarted)return;
    if(turn==='white')whiteTime--;
    else blackTime--;
    renderClocks();
    if(whiteTime<=0)finish(0,'White ran out of time. Black wins.');
    if(blackTime<=0)finish(1,'Black ran out of time. White wins.')
  }
  function color(p) {
    return isWhite(p)?'white':'black'
  }
  function enemy(p,c) {
    return p&&color(p)!==c
  }
  function attacked(square,byColor,b=pieces) {
    const[r,c]=rc(square),pawn=byColor==='white'?'♙':'♟',pr=r+(byColor==='white'?1:-1);
    for(const pc of [c-1,c+1])if(inside(pr,pc)&&b[idx(pr,pc)]===pawn)return true;
    const knight=byColor==='white'?'♘':'♞';
    for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])if(inside(r+dr,c+dc)&&b[idx(r+dr,c+dc)]===knight)return true;
    const king=byColor==='white'?'♔':'♚';
    for(const[dr,dc]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])if(inside(r+dr,c+dc)&&b[idx(r+dr,c+dc)]===king)return true;
    for(const[dr,dc,types]of[[-1,0,'♜♛♜♛'],[1,0,'♜♛♜♛'],[0,-1,'♜♛♜♛'],[0,1,'♜♛♜♛'],[-1,-1,'♝♛♝♛'],[-1,1,'♝♛♝♛'],[1,-1,'♝♛♝♛'],[1,1,'♝♛♝♛']]) {
      let rr=r+dr,cc=c+dc;
      while(inside(rr,cc)) {
        const p=b[idx(rr,cc)];
        if(p) {
          const attackers=byColor==='white'?types.replaceAll('♜','♖').replaceAll('♝','♗').replaceAll('♛','♕'):types.replaceAll('♜','♜').replaceAll('♝','♝');
          if(attackers.includes(p))return true;
          break
        }
        rr+=dr;
        cc+=dc
      }
    }
    return false
  }
  function inCheck(c,b=pieces) {
    const king=c==='white'?'♔':'♚',sq=b.indexOf(king);
    return sq<0||attacked(sq,c==='white'?'black':'white',b)
  }
  function pseudo(i,b=pieces) {
    const p=b[i],c=color(p),[r,col]=rc(i),out=[];
    if(!p)return out;
    if(isPawn(p)) {
      const dir=c==='white'?-1:1,start=c==='white'?6:1,last=c==='white'?0:7,nr=r+dir;
      if(inside(nr,col)&&!b[idx(nr,col)]) {
        out.push( {
          from:i,to:idx(nr,col),promotion:nr===last
        });
        if(r===start&&!b[idx(r+2*dir,col)])out.push( {
          from:i,to:idx(r+2*dir,col),double:true
        })
      }
      for(const dc of[-1,1]) {
        const nc=col+dc;
        if(!inside(nr,nc))continue;
        const to=idx(nr,nc);
        if(enemy(b[to],c)||to===enPassant)out.push( {
          from:i,to,promotion:nr===last,ep:to===enPassant
        })
      }
      return out
    }
    if(p==='♘'||p==='♞') {
      for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const rr=r+dr,cc=col+dc;
        if(inside(rr,cc)&&!b[idx(rr,cc)]||inside(rr,cc)&&enemy(b[idx(rr,cc)],c))out.push( {
          from:i,to:idx(rr,cc)
        })
      }
      return out
    }
    if(isKing(p)) {
      for(const[dr,dc]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const rr=r+dr,cc=col+dc;
        if(inside(rr,cc)&&(!b[idx(rr,cc)]||enemy(b[idx(rr,cc)],c)))out.push( {
          from:i,to:idx(rr,cc)
        })
      }
      if(!inCheck(c,b)) {
        if(c==='white'&&rights.K&&!b[61]&&!b[62]&&!attacked(61,'black',b)&&!attacked(62,'black',b))out.push( {
          from:i,to:62,castle:'K'
        });
        if(c==='white'&&rights.Q&&!b[59]&&!b[58]&&!b[57]&&!attacked(59,'black',b)&&!attacked(58,'black',b))out.push( {
          from:i,to:58,castle:'Q'
        });
        if(c==='black'&&rights.k&&!b[5]&&!b[6]&&!attacked(5,'white',b)&&!attacked(6,'white',b))out.push( {
          from:i,to:6,castle:'k'
        });
        if(c==='black'&&rights.q&&!b[3]&&!b[2]&&!b[1]&&!attacked(3,'white',b)&&!attacked(2,'white',b))out.push( {
          from:i,to:2,castle:'q'
        })
      }
      return out
    }
    const diagonal=p==='♗'||p==='♝'||p==='♕'||p==='♛',straight=p==='♖'||p==='♜'||p==='♕'||p==='♛';
    for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
      if((Math.abs(dr)+Math.abs(dc)===2&&!diagonal)||(Math.abs(dr)+Math.abs(dc)===1&&!straight))continue;
      let rr=r+dr,cc=col+dc;
      while(inside(rr,cc)) {
        const to=idx(rr,cc);
        if(!b[to])out.push( {
          from:i,to
        });
        else {
          if(enemy(b[to],c))out.push( {
            from:i,to
          });
          break
        }
        rr+=dr;
        cc+=dc
      }
    }
    return out
  }
  function apply(m,b) {
    const n=[...b],p=n[m.from],c=color(p);
    n[m.from]='';
    if(m.ep)n[m.to+(c==='white'?8:-8)]='';
    n[m.to]=m.promotion?(c==='white'?'♙':'♟')==='♙'?( {
      Q:'♕',R:'♖',B:'♗',N:'♘'
    }
    [m.promotion]||'♕'):( {
      Q:'♛',R:'♜',B:'♝',N:'♞'
    }
    [m.promotion]||'♛'):p;
    if(m.castle==='K') {
      n[63]='';
      n[61]='♖'
    }
    if(m.castle==='Q') {
      n[56]='';
      n[59]='♖'
    }
    if(m.castle==='k') {
      n[7]='';
      n[5]='♜'
    }
    if(m.castle==='q') {
      n[0]='';
      n[3]='♜'
    }
    return n
  }
  function legal(i,c) {
    return pseudo(i).filter(m=> {
      const n=apply(m,pieces);return !inCheck(c,n)
    })
  }
  function allLegal(c) {
    const out=[];
    pieces.forEach((p,i)=> {
      if(p&&color(p)===c)out.push(...legal(i,c))
    });
    return out
  }
  function insufficient() {
    const minors=pieces.filter(p=>'♗♝♘♞'.includes(p)),heavyOrPawns=pieces.some(p=>'♙♟♖♜♕♛'.includes(p));
    if(heavyOrPawns)return false;
    if(minors.length<=1)return true;
    if(minors.length===2&&minors.every(p=>p==='♗'||p==='♝')) {
      const squares=pieces.map((p,i)=>p==='♗'||p==='♝'?i:-1).filter(i=>i>=0);
      return (Math.floor(squares[0]/8)+squares[0]%8)%2===(Math.floor(squares[1]/8)+squares[1]%8)%2
    }
    return false
  }
  function key() {
    return pieces.join('')+turn+JSON.stringify(rights)+enPassant
  }
  function draw() {
    board.innerHTML='';
    pieces.forEach((p,i)=> {
      const sq=document.createElement('button');sq.className='chess-square '+(((Math.floor(i/8)+i)%2)?'dark':'light')+(i===selected?' selected':'');if(selected>=0&&legal(selected,turn).some(m=>m.to===i))sq.classList.add('movable');sq.textContent=p;sq.addEventListener('click',()=>clickSquare(i));board.append(sq)
    })
  }
  function status() {
    if(mode==='bot') {
      info.querySelector('p').textContent='Adaptive bot · '+botElo+' ELO · '+(turn==='white'?'Your move.':'Bot thinking...');
      setScore(playerElo,'ELO')
    }else info.querySelector('p').textContent=(turn==='white'?'White':'Black')+' to move.'
  }
  function finish(result,message) {
    gameOver=true;
    if(mode==='bot') {
      const expected=1/(1+Math.pow(10,(botElo-playerElo)/400));
      playerElo=Math.max(400,Math.round(playerElo+32*(result-expected)));
      localStorage.setItem('arcadeChessElo',playerElo);
      botElo=playerElo;
      setScore(playerElo,'ELO')
    }
    info.querySelector('p').textContent=message+(mode==='bot'?' Rating: '+playerElo+' ELO.':'');
    draw()
  }
  function afterMove() {
    turn=turn==='white'?'black':'white';
    renderClocks();
    const moves=allLegal(turn);
    if(!moves.length) {
      finish(mode==='bot'?(turn==='black'?1:0):0,inCheck(turn)?(turn==='white'?'Checkmate! Black wins.':'Checkmate! White wins.'):(turn==='white'?'Stalemate. Draw.':'Stalemate. Draw.'));
      return
    }
    if(halfmove>=100) {
      finish(.5,'Draw by the 50-move rule.');
      return
    }
    if(insufficient()) {
      finish(.5,'Draw by insufficient material.');
      return
    }
    const k=key();
    history[k]=(history[k]||0)+1;
    if(history[k]>=3) {
      finish(.5,'Draw by threefold repetition.');
      return
    }
    status();
    draw();
    if(mode==='bot'&&turn==='black')setTimeout(botMove,450)
  }
  function commit(m) {
    const moving=pieces[m.from],captured=m.ep?pieces[m.to+(isWhite(moving)?8:-8)]:pieces[m.to];
    pieces=apply(m,pieces);
    if(moving==='♔') {
      rights.K=false;
      rights.Q=false
    }
    if(moving==='♚') {
      rights.k=false;
      rights.q=false
    }
    if(m.from===63||m.to===63)rights.K=false;
    if(m.from===56||m.to===56)rights.Q=false;
    if(m.from===7||m.to===7)rights.k=false;
    if(m.from===0||m.to===0)rights.q=false;
    enPassant=m.double?m.from+(isWhite(moving)?-8:8):null;
    halfmove=(isPawn(moving)||captured)?0:halfmove+1;
    selected=-1;
    gameStarted=true;
    afterMove()
  }
  function clickSquare(i) {
    if(gameOver)return;
    if(selected<0) {
      if(pieces[i]&&color(pieces[i])===turn&&((mode==='local')||(mode==='bot'&&turn==='white'))&&legal(i,turn).length) {
        selected=i;
        draw()
      }
      return
    }
    const move=legal(selected,turn).find(m=>m.to===i);
    if(move) {
      if(move.promotion)move.promotion=document.querySelector('#promotion').value;
      commit(move)
    }else if(i===selected) {
      selected=-1;
      draw()
    }else if(pieces[i]&&color(pieces[i])===turn) {
      selected=i;
      draw()
    }
  }
  function botMove() {
    if(gameOver||mode!=='bot'||turn!=='black')return;
    const moves=allLegal('black'),captures=moves.filter(m=>m.ep||pieces[m.to]),skill=Math.max(.2,Math.min(.95,.45+(playerElo-800)/1600)),pool=captures.length&&Math.random()<skill?captures:moves,choice=pool[Math.floor(Math.random()*pool.length)];
    if(choice.promotion)choice.promotion='Q';
    commit(choice)
  }
  function reset() {
    pieces=[...initial];
    selected=-1;
    turn='white';
    gameOver=false;
    gameStarted=false;
    enPassant=null;
    halfmove=0;
    whiteTime=timeLimit;
    blackTime=timeLimit;
    rights= {
      K:true,Q:true,k:true,q:true
    };
    history= {
    };
    history[key()]=1;
    renderClocks();
    status();
    setScore(mode==='bot'?playerElo:0,mode==='bot'?'ELO':'Score');
    draw()
  }
  info.querySelector('.reset-button').addEventListener('click',reset);
  info.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=> {
    mode=button.dataset.mode;reset();help.textContent=mode==='bot'?'Adaptive bot mode with legal chess moves and Elo-style difficulty.':'Two-player mode with full chess rules.'
  }));
  info.querySelector('#time-mode').addEventListener('change',e=> {
    timeMode=e.target.value;timeLimit=timeMode==='bullet'?60:timeMode==='regular'?600:180;reset()
  });
  reset();
  timerId=setInterval(tick,1000);
  cleanupGame=()=> {
    clearInterval(timerId)
  }
}
// Polytrack: canvas racing game with levels and saved best times.
function startPolytrack() {
  title.textContent='Polytrack';
  help.textContent='Steer your F1 car through the perspective track and reach the finish line as fast as possible.';
  stage.innerHTML='<div class="level-picker" id="level-picker"></div><div id="poly-time" style="color:#ffe66d;font-weight:900;font-size:13px;text-align:right;margin:0 0 3px">00.00s</div><div id="poly-best" style="color:#54f3e0;font-weight:900;font-size:11px;text-align:right;margin:0 0 8px">Best: --</div><div class="runner-stage"><canvas class="runner-canvas" width="800" height="390"></canvas></div><div class="runner-controls"><button id="left">← Steer</button><button id="restart-run">↻ Restart race</button><button id="right">Steer →</button></div>';
  const picker=stage.querySelector('#level-picker'),canvas=stage.querySelector('canvas'),ctx=canvas.getContext('2d');
  const levels=Array.from( {
    length:20
  },(_,i)=>( {
    length:1500+i*180,speed:2.8+i*.09,curve:i*.06
  }));
  let currentLevel=1,unlockedLevel=1,progress=0,lane=0,active=true,raf,startTime=0,elapsed=0,bestTimes=JSON.parse(localStorage.getItem('polytrackBestTimes')||'{}'),lastTimes=JSON.parse(localStorage.getItem('polytrackLastTimes')||'{}');
  const colors=['#ff4fa3','#54f3e0','#ffe66d','#b8ff66'];
  for(let i=1;i<=20;i++) {
    const b=document.createElement('button');
    b.className='level-button';
    b.textContent=i;
    b.dataset.level=i;
    b.disabled=i>1;
    b.addEventListener('click',()=> {
      currentLevel=i;reset()
    });
    picker.append(b)
  }
  function level() {
    return levels[currentLevel-1]
  }
  function centerAt(z) {
    const l=level();
    return 400+Math.sin(z*.004+l.curve)*115+Math.sin(z*.009+l.curve*2)*38
  }
  function renderBest() {
    const k=String(currentLevel),best=bestTimes[k],last=lastTimes[k];
    stage.querySelector('#poly-best').textContent=(best?'Best: '+Number(best).toFixed(2)+'s':'Best: --')+(last?' · Last: '+Number(last).toFixed(2)+'s':'')
  }
  function updatePicker() {
    picker.querySelectorAll('button').forEach(b=> {
      const n=Number(b.dataset.level);b.disabled=n>unlockedLevel;b.classList.toggle('active',n===currentLevel)
    })
  }
  function reset() {
    cancelAnimationFrame(raf);
    progress=0;
    lane=0;
    elapsed=0;
    startTime=performance.now();
    active=true;
    updatePicker();
    renderBest();
    draw()
  }
  function steer(amount) {
    if(active)lane=Math.max(-1,Math.min(1,lane+amount))
  }
  function finish() {
    active=false;
    cancelAnimationFrame(raf);
    const finalTime=elapsed.toFixed(2),k=String(currentLevel),previous=bestTimes[k];
    lastTimes[k]=Number(finalTime);
    localStorage.setItem('polytrackLastTimes',JSON.stringify(lastTimes));
    if(!previous||Number(finalTime)<Number(previous)) {
      bestTimes[k]=Number(finalTime);
      localStorage.setItem('polytrackBestTimes',JSON.stringify(bestTimes))
    }
    renderBest();
    if(currentLevel<20) {
      unlockedLevel=Math.max(unlockedLevel,currentLevel+1);
      updatePicker();
      help.textContent='Level '+currentLevel+' finished in '+finalTime+'s! Level '+(currentLevel+1)+' is unlocked.'
    }else help.textContent='All 20 tracks complete! Final time: '+finalTime+'s. You are the Polytrack champion.';
    setScore(finalTime+'s','Finish')
  }
  function drawCar(x,y,scale,color) {
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(scale,scale);
    ctx.fillStyle='#090d20';
    ctx.fillRect(-31,8,12,10);
    ctx.fillRect(19,8,12,10);
    ctx.fillStyle=color;
    ctx.fillRect(-25,-8,50,17);
    ctx.fillRect(-39,-3,15,7);
    ctx.fillRect(24,-3,15,7);
    ctx.fillStyle='#54f3e0';
    ctx.fillRect(-10,-6,20,8);
    ctx.fillStyle='#ffe66d';
    ctx.fillRect(-44,-2,6,5);
    ctx.fillRect(38,-2,6,5);
    ctx.restore()
  }
  function draw() {
    if(!active)return;
    const l=level();
    elapsed=(performance.now()-startTime)/1000;
    ctx.clearRect(0,0,800,390);
    const sky=ctx.createLinearGradient(0,0,0,180);
    sky.addColorStop(0,'#171447');
    sky.addColorStop(1,'#5b2d91');
    ctx.fillStyle=sky;
    ctx.fillRect(0,0,800,390);
    ctx.fillStyle='#ffe66d';
    ctx.beginPath();
    ctx.arc(650,72,28,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle='#10162f';
    ctx.fillRect(0,138,800,252);
    for(let s=0;s<42;s++) {
      const d=s/42,z=progress+(1-d)*900,y=140+d*250,nextD=(s+1)/42,nextZ=progress+(1-nextD)*900,nextY=140+nextD*250,c=centerAt(z),nc=centerAt(nextZ),w=45+d*690,nw=45+nextD*690;
      ctx.fillStyle=s%2?'#222b55':'#293263';
      ctx.beginPath();
      ctx.moveTo(c-w/2,y);
      ctx.lineTo(c+w/2,y);
      ctx.lineTo(nc+nw/2,nextY);
      ctx.lineTo(nc-nw/2,nextY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle='#54f3e0';
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(c-w/2,y);
      ctx.lineTo(nc-nw/2,nextY);
      ctx.moveTo(c+w/2,y);
      ctx.lineTo(nc+nw/2,nextY);
      ctx.stroke();
      if(Math.floor(z/75)%2===0) {
        ctx.strokeStyle='#ffe66d';
        ctx.lineWidth=4;
        for(const mark of[-.33,.33]) {
          ctx.beginPath();
          ctx.moveTo(c+mark*w/2,y);
          ctx.lineTo(nc+mark*nw/2,nextY);
          ctx.stroke()
        }
      }
    }
    for(let n=0;n<8;n++) {
      const z=progress+120+n*230,d=1-(z-progress)/900;
      if(d>0&&d<1) {
        const y=140+d*250,c=centerAt(z),w=45+d*690;
        ctx.fillStyle=n%2?'#ff4fa3':'#54f3e0';
        ctx.fillRect(c-w/2-28,y-28,18,28);
        ctx.fillRect(c+w/2+10,y-28,18,28)
      }
    }
    for(let n=0;n<10;n++) {
      const z=360+n*145,d=1-(z-progress)/900;
      if(d>0&&d<1) {
        const y=140+d*250,c=centerAt(z),w=45+d*690,rivalLane=(n%3-1)*.28;
        drawCar(c+rivalLane*w,y-10,.28,colors[n%colors.length])
      }
    }
    const finishZ=l.length,fd=1-(finishZ-progress)/900;
    if(fd>0&&fd<1) {
      const y=140+fd*250,c=centerAt(finishZ),w=45+fd*690;
      ctx.fillStyle='#ffe66d';
      ctx.fillRect(c-w/2,y-5,w,8);
      ctx.fillStyle='#11162e';
      for(let x=c-w/2;x<c+w/2;x+=24)ctx.fillRect(x,y-5,12,8)
    }
    drawCar(centerAt(progress)+lane*(45+690)*.28,350,1,'#ff4fa3');
    stage.querySelector('#poly-time').textContent=elapsed.toFixed(2)+'s';
    setScore(elapsed.toFixed(2)+'s','Time');
    if(progress>=l.length) {
      finish();
      return
    }
    progress+=l.speed;
    raf=requestAnimationFrame(draw)
  }
  stage.querySelector('#left').addEventListener('click',()=>steer(-.18));
  stage.querySelector('#right').addEventListener('click',()=>steer(.18));
  stage.querySelector('#restart-run').addEventListener('click',reset);
  const key=e=> {
    if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a') {
      e.preventDefault();
      steer(-.12)
    }
    if(e.key==='ArrowRight'||e.key.toLowerCase()==='d') {
      e.preventDefault();
      steer(.12)
    }
  };
  document.addEventListener('keydown',key);
  reset();
  cleanupGame=()=> {
    active=false;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown',key)
  }
}
// GeoGuessr: photo clues, map interaction, zooming, and scoring.
async function startGeoGuessrMap() {
  title.textContent='GeoGuessr';
  help.textContent='Zoom, pan, and place your guess on the country map. Closer guesses earn more points.';
  const places=[ {
    name:'Paris, France',lat:48.8584,lon:2.2945,image:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85'
  }, {
    name:'Tokyo, Japan',lat:35.6762,lon:139.6503,image:'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=85'
  }, {
    name:'Sydney, Australia',lat:-33.8568,lon:151.2153,image:'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d0?auto=format&fit=crop&w=1200&q=85'
  }, {
    name:'Rio de Janeiro, Brazil',lat:-22.9519,lon:-43.2105,image:'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1200&q=85'
  }, {
    name:'Santorini, Greece',lat:36.3932,lon:25.4615,image:'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=85'
  }];
  let round=0,total=0,guess=null,submitted=false,zoom=1,panX=0,panY=0,dragging=false,dragStart=null,geoData=null;
  stage.innerHTML='<div class="geo-stage geo-map-game"><div class="geo-photo-wrap"><img class="geo-photo" alt="A real place somewhere in the world"><div class="geo-round">ROUND <b>1</b> / 5</div></div><div class="geo-map-panel"><div class="geo-map-tools"><button class="map-tool" data-zoom="out" aria-label="Zoom out">−</button><button class="map-tool" data-zoom="in" aria-label="Zoom in">+</button><button class="map-tool map-reset" data-zoom="reset">Reset view</button><span>Drag map · scroll to zoom</span></div><div class="geo-country-map"><canvas class="geo-map-canvas" aria-label="World country map"></canvas></div><button class="geo-submit" disabled>Lock in guess</button><button class="geo-next" hidden>Next location →</button><p class="geo-result">Click the map to place your guess.</p></div></div>';
  const photo=stage.querySelector('.geo-photo'),map=stage.querySelector('.geo-country-map'),canvas=stage.querySelector('.geo-map-canvas'),ctx=canvas.getContext('2d'),roundText=stage.querySelector('.geo-round b'),submit=stage.querySelector('.geo-submit'),next=stage.querySelector('.geo-next'),result=stage.querySelector('.geo-result');
  const target=places[0];
  function resize() {
    const r=map.getBoundingClientRect(),d=window.devicePixelRatio||1;
    canvas.width=r.width*d;
    canvas.height=r.height*d;
    canvas.style.width=r.width+'px';
    canvas.style.height=r.height+'px';
    ctx.setTransform(d,0,0,d,0,0);
    draw()
  }
  function project(lat,lon) {
    const r=map.getBoundingClientRect(),x=(lon+180)/360*r.width,y=(90-lat)/180*r.height;
    return {
      x:(x-r.width/2)*zoom+r.width/2+panX,y:(y-r.height/2)*zoom+r.height/2+panY
    }
  }
  function unproject(x,y) {
    const r=map.getBoundingClientRect(),baseX=(x-r.width/2-panX)/zoom+r.width/2,baseY=(y-r.height/2-panY)/zoom+r.height/2;
    return {
      lon:baseX/r.width*360-180,lat:90-baseY/r.height*180
    }
  }
  function drawPolygon(coords) {
    ctx.beginPath();
    coords.forEach((point,i)=> {
      const p=project(point[1],point[0]);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y)
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke()
  }
  function draw() {
    const r=map.getBoundingClientRect();
    if(!r.width)return;
    ctx.clearRect(0,0,r.width,r.height);
    ctx.fillStyle='#2c6d83';
    ctx.fillRect(0,0,r.width,r.height);
    ctx.strokeStyle='#ffffff22';
    ctx.lineWidth=1;
    for(let lon=-180;lon<=180;lon+=30) {
      const a=project(85,lon),b=project(-85,lon);
      ctx.beginPath();
      ctx.moveTo(a.x,a.y);
      ctx.lineTo(b.x,b.y);
      ctx.stroke()
    }
    for(let lat=-60;lat<=60;lat+=30) {
      const a=project(lat,-180),b=project(lat,180);
      ctx.beginPath();
      ctx.moveTo(a.x,a.y);
      ctx.lineTo(b.x,b.y);
      ctx.stroke()
    }
    if(geoData) {
      geoData.features.forEach(feature=> {
        ctx.fillStyle='#63a66e';ctx.strokeStyle='#d7f2d099';ctx.lineWidth=1;const g=feature.geometry;if(g.type==='Polygon')g.coordinates.forEach(drawPolygon);if(g.type==='MultiPolygon')g.coordinates.forEach(poly=>poly.forEach(drawPolygon))
      })
    }
    if(guess) {
      drawPin(guess.lat,guess.lon,'#ff4fa3','#ff4fa399')
    }
    if(submitted) {
      const p=places[round];
      drawPin(p.lat,p.lon,'#b8ff66','#b8ff6699')
    }
  }
  function drawPin(lat,lon,color,halo) {
    const p=project(lat,lon);
    ctx.beginPath();
    ctx.fillStyle=halo;
    ctx.arc(p.x,p.y,13,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle=color;
    ctx.strokeStyle='#fff';
    ctx.lineWidth=2;
    ctx.arc(p.x,p.y,7,0,Math.PI*2);
    ctx.fill();
    ctx.stroke()
  }
  function distance(a,b) {
    const r=Math.PI/180,la1=a.lat*r,la2=b.lat*r,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r,h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
    return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))
  }
  function scoreFor(km) {
    return Math.max(0,Math.round(5000*Math.exp(-km/1800)))
  }
  function load() {
    const p=places[round];
    photo.src=p.image;
    roundText.textContent=round+1;
    guess=null;
    submitted=false;
    zoom=1;
    panX=0;
    panY=0;
    submit.disabled=true;
    submit.hidden=false;
    next.hidden=true;
    result.textContent='Click the map to place your guess.';
    result.className='geo-result';
    draw()
  }
  function choose(e) {
    if(submitted)return;
    const r=canvas.getBoundingClientRect();
    guess=unproject(e.clientX-r.left,e.clientY-r.top);
    submit.disabled=false;
    draw();
    result.textContent='Guess placed. Zoom or drag to refine it, then lock it in.'
  }
  function reveal() {
    if(!guess||submitted)return;
    submitted=true;
    const actual=places[round],km=distance(guess,actual),points=scoreFor(km);
    total+=points;
    submit.hidden=true;
    next.hidden=false;
    next.textContent=round>=4?'Play again ↻':'Next location →';
    setScore(total,'Points');
    draw();
    result.innerHTML='<strong>'+points.toLocaleString()+' points</strong> · '+Math.round(km).toLocaleString()+' km away<br><span>The location was '+actual.name+'.</span>';
    result.className='geo-result revealed'
  }
  function zoomAt(amount,cx,cy) {
    const before=unproject(cx,cy);
    zoom=Math.max(.7,Math.min(8,zoom*amount));
    const after=project(before.lat,before.lon);
    panX+=cx-after.x;
    panY+=cy-after.y;
    draw()
  }
  map.addEventListener('click',e=> {
    if(!dragging)choose(e)
  });
  map.addEventListener('wheel',e=> {
    e.preventDefault();const r=map.getBoundingClientRect();zoomAt(e.deltaY<0?1.25:.8,e.clientX-r.left,e.clientY-r.top)
  }, {
    passive:false
  });
  map.addEventListener('pointerdown',e=> {
    dragging=false;dragStart= {
      x:e.clientX,y:e.clientY,panX,panY
    };map.setPointerCapture(e.pointerId)
  });
  map.addEventListener('pointermove',e=> {
    if(!dragStart)return;if(Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>4)dragging=true;panX=dragStart.panX+e.clientX-dragStart.x;panY=dragStart.panY+e.clientY-dragStart.y;draw()
  });
  map.addEventListener('pointerup',()=> {
    dragStart=null
  });
  stage.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=> {
    const r=map.getBoundingClientRect(),kind=button.dataset.zoom;if(kind==='reset') {
      zoom=1;panX=0;panY=0;draw()
    }else zoomAt(kind==='in'?1.5:.67,r.width/2,r.height/2)
  }));
  submit.addEventListener('click',reveal);
  next.addEventListener('click',()=> {
    if(round>=4) {
      round=0;total=0;setScore(0,'Points')
    }else round++;load()
  });
  window.addEventListener('resize',resize);
  load();
  resize();
  try {
    const response=await fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json');
    if(response.ok) {
      geoData=await response.json();
      draw()
    }
  }catch(error) {
    result.textContent='World map data could not load. You can still place a global guess.'
  }
  cleanupGame=()=> {
    window.removeEventListener('resize',resize);
    if(map.hasPointerCapture&&map.hasPointerCapture(1))map.releasePointerCapture(1)
  }
}
